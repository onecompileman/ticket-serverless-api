import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

export interface CognitoIdentity {
    dateCreated: string;
    userId: string;
    providerName: string;
    providerType: string;
    issuer: string | null;
    primary: string;
}

export interface CognitoUserProfile {
    email: string;
    email_verified: string;
    identities: CognitoIdentity[];
    name: string;
    sub: string;
}

export interface CognitoUser {
    username: string | undefined;
    enabled: boolean | undefined;
    status: string | undefined;
    attributes: Record<string, string>;
    profile: CognitoUserProfile;
}

function parseIdentities(raw?: string): CognitoIdentity[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CognitoIdentity[]) : [];
    } catch {
        return [];
    }
}

export class CognitoUserService {
    private client: CognitoIdentityProviderClient;
    private userPoolId: string;

    constructor(client: CognitoIdentityProviderClient, userPoolId: string) {
        this.client = client;
        this.userPoolId = userPoolId;
    }

    async getUserBySub(sub: string): Promise<CognitoUser | null> {
        const command = new AdminGetUserCommand({
            UserPoolId: this.userPoolId,
            Username: sub, // sub is the unique Cognito user ID
        });

        const response = await this.client.send(command);

        const attributes =
            response?.UserAttributes?.reduce((acc, attr) => {
                if (attr.Name && attr.Value) {
                    acc[attr.Name] = attr.Value;
                }
                return acc;
            }, {} as Record<string, string>) ?? {};

        return response
            ? {
                  username: response.Username,
                  enabled: response.Enabled,
                  status: response.UserStatus,
                  attributes,
                  profile: {
                      email: attributes.email ?? '',
                      email_verified: attributes.email_verified ?? 'false',
                      identities: parseIdentities(attributes.identities),
                      name: attributes.name ?? '',
                      sub: attributes.sub ?? sub,
                  },
              }
            : null;
    }
}
