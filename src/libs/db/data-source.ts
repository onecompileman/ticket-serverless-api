import { DataSource } from 'typeorm';
import * as fromEntities from '../../entities';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';


// Resolve from Lambda task root or local project root
const caPathFromTaskRoot = join(process.cwd(), 'global-bundle.pem');
const ca = existsSync(caPathFromTaskRoot) ? readFileSync(caPathFromTaskRoot, 'utf8') : undefined;

export const dataSource = new DataSource({
  type: (process.env.RDS_TYPE as any) || 'mysql',
  host: process.env.RDS_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || '3306', 10),
  username: process.env.RDS_USERNAME || 'root',
  password: process.env.RDS_PASSWORD || 'password',
  database: process.env.RDS_DB_NAME || 'ticket_db',
  entities: Object.values(fromEntities.entities),
  synchronize: true,
  ssl: (process.env.RDS_TYPE === 'postgres')
    ? (ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false })
    : undefined,
});