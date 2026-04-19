import jwt, { Jwt } from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';

async function initCognitoJWKs() {
    const url = process.env.COGNITO_JWKS_URL!;
    const res = await fetch(url);
    const { keys } = (await res.json()) as any;
    const pems: any = {};
    keys.forEach((key: any) => {
        pems[key.kid] = jwkToPem(key);
    });

    return pems;
}

export async function validateJwt(token: string) {
    const pems = await initCognitoJWKs();

    const decodedJwt: any = jwt.decode(token, { complete: true });
    if (!decodedJwt) throw new Error('Invalid token');

    const pem = pems[decodedJwt?.header?.kid];
    if (!pem) throw new Error('Invalid token key');

    return jwt.verify(token, pem, { algorithms: ['RS256'] });
}
