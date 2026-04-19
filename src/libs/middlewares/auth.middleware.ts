import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { httpError, httpServerError } from '../http/response';
import { StatusCode } from '../enums/status-code.enum';
import { validateJwt } from '../auth/validate-token';
import { CreateDbUserFacade } from '../../facades/create-db-user.facade';
import { cognitoUserService } from '../../services/cognito-user';
import { userService } from '../../services/user';

export function authMiddleware(): middy.MiddlewareObj<Parameters<Handler<any>>[0], APIGatewayProxyResult> {
    const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request) => {
        console.log('auth middleware');
        if (request.event.httpMethod === 'OPTIONS') {
            return;
        }

        const token =
            request.event.headers?.Authorization?.split(' ')[1] || request.event.headers?.authorization?.split(' ')[1];
        if (!token) {
            return httpError(
                { message: 'Unauthorized' },
                { statusCode: StatusCode.UNAUTHORIZED, headers: { 'Access-Control-Allow-Origin': '*' } },
            );
        }

        let decodedToken;
        try {
            const createDbUserFacade = new CreateDbUserFacade(cognitoUserService, userService);

            decodedToken = await validateJwt(token);
            console.log('decoded token', JSON.stringify(decodedToken));

            const sub: any = decodedToken?.sub?.valueOf() || '';

            if (!sub) {
                return httpError(
                    { message: 'Unauthorized' },
                    { statusCode: StatusCode.UNAUTHORIZED, headers: { 'Access-Control-Allow-Origin': '*' } },
                );
            }

            const user = await createDbUserFacade.createDbUserFromCognitoSub(sub);

            (request.context as any)['user'] = user;
        } catch (err) {
            console.log('Error in auth middleware', err instanceof Error ? err.message : err);
            return httpError(
                { message: 'Unauthorized' },
                { statusCode: StatusCode.UNAUTHORIZED, headers: { 'Access-Control-Allow-Origin': '*' } },
            );
        }
    };

    return {
        before,
    };
}
