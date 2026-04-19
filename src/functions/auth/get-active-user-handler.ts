import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { baseHandler } from '../../libs/http/handler';
import { httpResponse, httpServerError } from '../../libs/http/response';
import { TicketBoard, User } from '../../entities';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { cognitoUserService } from '../../services/cognito-user';
import { userService } from '../../services/user';
import { CreateDbUserFacade } from '../../facades/create-db-user.facade';

const lambdaPath = '/auth/get-active-user';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = (context as any)?.user;

            return httpResponse<User>(user, { statusCode: 200 });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use(authMiddleware());
