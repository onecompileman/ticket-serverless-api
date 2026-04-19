import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ticketBoardService } from '../../services/ticket-board';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse } from '../../libs/http/response';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';

const lambdaPath = '/ticket-board/get-all-shared';

export const lambdaHandler = baseHandler(
    async (_event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = (context as any)?.user;
            const sharedTicketBoards = await ticketBoardService.getAllSharedTicketBoardsByUserId(user.id);

            return httpResponse(sharedTicketBoards, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpError(err instanceof Error ? err.message : 'some error happened', {
                statusCode: StatusCode.INTERNAL_SERVER_ERROR,
            });
        }
    },
);

lambdaHandler.use(authMiddleware());
