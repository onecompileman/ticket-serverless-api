import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const templatePath = path.join(root, 'template.yaml');
const functionsDir = path.join(root, 'src', 'functions');

const START = '# BEGIN AUTO FUNCTIONS';
const END = '# END AUTO FUNCTIONS';

const API_THROTTLE_PARAMETERS = [
  '  ApiThrottleRateLimit:',
  '    Type: Number',
  '    Default: 50',
  '  ApiThrottleBurstLimit:',
  '    Type: Number',
  '    Default: 100',
  '  WafRateLimitPer5Min:',
  '    Type: Number',
  '    Default: 1000',
].join('\n');

const API_METHOD_SETTINGS = [
  '    MethodSettings:',
  '      - HttpMethod: "*"',
  '        ResourcePath: "/*"',
  '        ThrottlingRateLimit: !Ref ApiThrottleRateLimit',
  '        ThrottlingBurstLimit: !Ref ApiThrottleBurstLimit',
].join('\n');

const WAF_RESOURCES_BLOCK = [
  '  ApiShieldWebAcl:',
  '    Type: AWS::WAFv2::WebACL',
  '    Properties:',
  '      Name: !Sub "${AWS::StackName}-api-shield"',
  '      Scope: REGIONAL',
  '      DefaultAction:',
  '        Allow: {}',
  '      VisibilityConfig:',
  '        CloudWatchMetricsEnabled: true',
  '        MetricName: !Sub "${AWS::StackName}-api-waf"',
  '        SampledRequestsEnabled: true',
  '      Rules:',
  '        - Name: AWS-AmazonIpReputationList',
  '          Priority: 0',
  '          Statement:',
  '            ManagedRuleGroupStatement:',
  '              VendorName: AWS',
  '              Name: AWSManagedRulesAmazonIpReputationList',
  '          OverrideAction:',
  '            None: {}',
  '          VisibilityConfig:',
  '            CloudWatchMetricsEnabled: true',
  '            MetricName: AWSAmazonIpReputationList',
  '            SampledRequestsEnabled: true',
  '        - Name: AWS-CommonRuleSet',
  '          Priority: 1',
  '          Statement:',
  '            ManagedRuleGroupStatement:',
  '              VendorName: AWS',
  '              Name: AWSManagedRulesCommonRuleSet',
  '          OverrideAction:',
  '            None: {}',
  '          VisibilityConfig:',
  '            CloudWatchMetricsEnabled: true',
  '            MetricName: AWSCommonRuleSet',
  '            SampledRequestsEnabled: true',
  '        - Name: AWS-KnownBadInputs',
  '          Priority: 2',
  '          Statement:',
  '            ManagedRuleGroupStatement:',
  '              VendorName: AWS',
  '              Name: AWSManagedRulesKnownBadInputsRuleSet',
  '          OverrideAction:',
  '            None: {}',
  '          VisibilityConfig:',
  '            CloudWatchMetricsEnabled: true',
  '            MetricName: AWSKnownBadInputs',
  '            SampledRequestsEnabled: true',
  '        - Name: RateLimitByIp',
  '          Priority: 3',
  '          Action:',
  '            Block: {}',
  '          Statement:',
  '            RateBasedStatement:',
  '              AggregateKeyType: IP',
  '              Limit: !Ref WafRateLimitPer5Min',
  '          VisibilityConfig:',
  '            CloudWatchMetricsEnabled: true',
  '            MetricName: RateLimitByIp',
  '            SampledRequestsEnabled: true',
  '',
  '  ApiShieldWebAclAssociation:',
  '    Type: AWS::WAFv2::WebACLAssociation',
  '    DependsOn:',
  '      - ServerlessRestApiProdStage',
  '    Properties:',
  '      ResourceArn: !Sub "arn:aws:apigateway:${AWS::Region}::/restapis/${ServerlessRestApi}/stages/Prod"',
  '      WebACLArn: !GetAtt ApiShieldWebAcl.Arn',
].join('\n');

// SSM parameter names — match what is in template.yaml
const SSM = {
  RDS_HOST: 'Dev_RDS_Host',
  RDS_PASSWORD: 'Dev_RDS_Password',
  GMAIL_USER: 'Dev_GMAIL_USER',
  GMAIL_PASS: 'Dev_GMAIL_PASS',
  FRONTEND_URL: 'Dev_FRONTEND_URL',
  COGNITO_JWKS_URL: 'Dev_COGNITO_JWKS_URL',
  S3_BUCKET_NAME: 'Dev_S3_BUCKET_NAME',
};

const COGNITO_USER_POOL_ID = 'ap-southeast-2_ANIUcWB9u';

const METHOD_ALIASES = {
  create: 'post',
  list:   'get',
  update: 'put',
  remove: 'delete',
};

const HTTP_VERBS = new Set(['get', 'post', 'put', 'delete', 'patch']);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function toPascalCase(input) {
  return input
    .replace(/[^a-zA-Z0-9/._-]/g, '')
    .split(/[\/._-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/**
 * Derive { method, httpPath, eventName } from a relative path like:
 *   src/functions/get-boards.ts          → GET  /boards
 *   src/functions/create-ticket.ts       → POST /ticket
 *   src/functions/boards/get-board.ts    → GET  /boards/board
 *   src/functions/boards/get.ts          → GET  /boards
 */
function deriveEvent(fileAbsPath) {
  const rel = toPosix(path.relative(path.join(root, 'src', 'functions'), fileAbsPath))
    .replace(/\.ts$/, ''); // e.g. "get-boards" or "boards/get-board"

  const segments = rel.split('/');
  const filename = segments[segments.length - 1]; // "get-boards"
  const dirs = segments.slice(0, -1);             // ["boards"] or []

  const parts = filename.split('-');
  const rawVerb = parts[0].toLowerCase();
  const verb = METHOD_ALIASES[rawVerb] ?? (HTTP_VERBS.has(rawVerb) ? rawVerb : null);
  const method = verb ?? 'get';

  // Path segments: directories + resource from filename (minus method prefix if it was a verb)
  const resourceParts = (rawVerb !== parts[0] || verb !== null) && parts.length > 1
    ? parts.slice(1)  // strip method prefix
    : parts;

  const pathSegments = [...dirs, ...resourceParts].filter(Boolean);
  const httpPath = pathSegments.length ? `/${pathSegments.join('/')}` : `/${filename}`;

  const eventName = toPascalCase(rel); // e.g. "GetBoards", "BoardsGetBoard"

  return { method, httpPath, eventName };
}

async function buildFunctionBlock(fileAbsPath) {
  const rel = toPosix(path.relative(root, fileAbsPath));
  const withoutExt = rel.replace(/\.ts$/, '');
  const relToFunctions = toPosix(path.relative(path.join(root, 'src', 'functions'), fileAbsPath));
  const logicalId = `${toPascalCase(relToFunctions.replace(/\.ts$/, ''))}Function`;

  const { method: derivedMethod, eventName, httpPath: derivedHttpPath } = deriveEvent(fileAbsPath);

  // Prefer explicit lambdaPath from handler files. Keep legacy typo support for compatibility.
  const fileContent = await fs.readFile(fileAbsPath, 'utf8');
  const pathMatch = fileContent.match(/const\s+(?:lambdaPath|lamdbaPath)\s*=\s*['"`]([^'"`]+)['"`]/);
  const methodMatch = fileContent.match(/const\s+(?:lambdaMethod|lamdbaMethod)\s*=\s*['"`]([^'"`]+)['"`]/i);
  const httpPath = pathMatch ? pathMatch[1] : derivedHttpPath;
  const explicitMethod = methodMatch ? methodMatch[1].toLowerCase() : null;
  const method = explicitMethod && HTTP_VERBS.has(explicitMethod)
    ? explicitMethod
    : derivedMethod;

  return [
    `  ${logicalId}:`,
    `    Type: AWS::Serverless::Function`,
    `    Properties:`,
    `      CodeUri: ./`,
    `      Handler: ${withoutExt}.lambdaHandler`,
    `      Runtime: nodejs20.x`,
    `      Environment:`,
    `        Variables:`,
    `          RDS_TYPE: "postgres"`,
    `          RDS_HOST: !Sub "{{resolve:ssm:${SSM.RDS_HOST}}}"`,
    `          RDS_PORT: "5432"`,
    `          RDS_DB_NAME: "postgres"`,
    `          RDS_USERNAME: "postgres"`,
    `          RDS_PASSWORD: !Sub "{{resolve:ssm:${SSM.RDS_PASSWORD}}}"`,
    `          GMAIL_USER: !Sub "{{resolve:ssm:${SSM.GMAIL_USER}}}"`,
    `          GMAIL_PASS: !Sub "{{resolve:ssm:${SSM.GMAIL_PASS}}}"`,
    `          FRONTEND_URL: !Sub "{{resolve:ssm:${SSM.FRONTEND_URL}}}"`,
    `          COGNITO_JWKS_URL: !Sub "{{resolve:ssm:${SSM.COGNITO_JWKS_URL}}}"`,
    `          S3_BUCKET_NAME: !Sub "{{resolve:ssm:${SSM.S3_BUCKET_NAME}}}"`,
    `      Policies:`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.RDS_PASSWORD}"`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.RDS_HOST}"`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.GMAIL_USER}"`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.GMAIL_PASS}"`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.FRONTEND_URL}"`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.COGNITO_JWKS_URL}"`,
    `      - SSMParameterReadPolicy:`,
    `          ParameterName: "${SSM.S3_BUCKET_NAME}"`,
    `      - Statement:`,
    `          - Sid: CognitoAdminGetUserAccess`,
    `            Effect: Allow`,
    `            Action:`,
    `              - cognito-idp:AdminGetUser`,
    `            Resource: arn:aws:cognito-idp:ap-southeast-2:843232831760:userpool/${COGNITO_USER_POOL_ID}`, 
    `      - S3CrudPolicy:`,
    `          BucketName: !Sub "{{resolve:ssm:${SSM.S3_BUCKET_NAME}}}"`,
    `      Architectures:`,
    `      - x86_64`,
    `      Events:`,
    `        ${eventName}:`,
    `          Type: Api`,
    `          Properties:`,
    `            Path: ${httpPath}`,
    `            Method: ${method}`,
    `        ${eventName}Options:`,
    `          Type: Api`,
    `          Properties:`,
    `            Path: ${httpPath}`,
    `            Method: options`,
    `    Metadata:`,
    `      BuildMethod: esbuild`,
    `      BuildProperties:`,
    `        Minify: true`,
    `        Target: es2020`,
    `        Sourcemap: true`,
    `        Loader:`,
    `          - .html=file`,
    `        EntryPoints:`,
    `        - ${rel}`,
  ].join('\n');
}

async function walkTsFiles(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip migrations subfolder
      if (entry.name === 'migrations') continue;
      out.push(...(await walkTsFiles(full)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts') || entry.name.endsWith('.d.ts')) continue;
    if (entry.name === 'index.ts') continue;

    out.push(full);
  }

  return out;
}

function ensureMarkers(template, eol) {
  if (template.includes(START) && template.includes(END)) return template;

  if (!template.includes('Resources:')) {
    throw new Error('template.yaml missing "Resources:" section');
  }

  return template.replace(
    'Resources:',
    [`Resources:`, `  ${START}`, `  ${END}`].join(eol),
  );
}

function replaceManagedBlock(template, block, eol) {
  const startIdx = template.indexOf(START);
  const endIdx = template.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('Managed markers not found or invalid');
  }

  const head = template.slice(0, startIdx);
  const tail = template.slice(endIdx + END.length);

  return `${head}${START}${eol}${block}${eol}  ${END}${tail}`;
}

function ensureApiThrottleParameters(template, eol) {
  if (template.includes('ApiThrottleRateLimit:') && template.includes('WafRateLimitPer5Min:')) return template;

  const bucketDefaultAnchor = /(^\s{2}Default:\s+ticket-storage-.*$)/m;
  if (!bucketDefaultAnchor.test(template)) return template;

  return template.replace(bucketDefaultAnchor, `$1${eol}${API_THROTTLE_PARAMETERS.split('\n').join(eol)}`);
}

function ensureApiMethodSettings(template, eol) {
  if (template.includes('ThrottlingRateLimit: !Ref ApiThrottleRateLimit')) return template;

  const binaryMediaAnchor = /(^\s{4}BinaryMediaTypes:\s*$)/m;
  if (!binaryMediaAnchor.test(template)) return template;

  return template.replace(binaryMediaAnchor, `${API_METHOD_SETTINGS.split('\n').join(eol)}${eol}$1`);
}

function ensureWafResources(template, eol) {
  if (template.includes('ApiShieldWebAcl:') && template.includes('ApiShieldWebAclAssociation:')) return template;

  const endMarker = `  ${END}`;
  if (!template.includes(endMarker)) return template;

  return template.replace(endMarker, `${endMarker}${eol}${eol}${WAF_RESOURCES_BLOCK.split('\n').join(eol)}`);
}

async function run() {
  const files = await walkTsFiles(functionsDir);
  files.sort((a, b) => a.localeCompare(b));

  const blocks = await Promise.all(files.map(buildFunctionBlock));
  const generated = blocks.length
    ? blocks.join('\n\n')
    : '  # No handlers found in src/functions';

  let template = await fs.readFile(templatePath, 'utf8');
  const eol = template.includes('\r\n') ? '\r\n' : '\n';

  template = ensureMarkers(template, eol);
  template = replaceManagedBlock(template, generated, eol);
  template = ensureApiThrottleParameters(template, eol);
  template = ensureApiMethodSettings(template, eol);
  template = ensureWafResources(template, eol);

  await fs.writeFile(templatePath, template, 'utf8');
  console.log(`✓ template.yaml updated — ${files.length} function(s) synced.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});