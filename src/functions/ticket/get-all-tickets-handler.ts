import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/get-all/{boardId}';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const boardId = event.pathParameters?.boardId;

            if (!boardId) {
                return httpError({ message: 'Board ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const hasBoardAccess = await ticketBoardService.hasBoardAccess(Number(boardId), user.id);
            if (!hasBoardAccess) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            const tickets = await ticketService.getTicketsByBoardId(Number(boardId));

            return httpResponse(tickets, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use(authMiddleware());