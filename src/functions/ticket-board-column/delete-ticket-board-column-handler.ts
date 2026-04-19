import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketBoardColumnService } from '../../services/ticket-board-column';

const lambdaPath = '/ticket-board-column/delete/{columnId}';
const lambdaMethod = 'delete';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const columnId = event.pathParameters?.columnId;

            if (!columnId) {
                return httpError({ message: 'Column ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const ticketBoardColumn = await ticketBoardColumnService.getTicketBoardColumnById(Number(columnId));

            if (!ticketBoardColumn) {
                return httpError({ message: 'Ticket board column not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            if (ticketBoardColumn.created_by.id !== user.id) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            await ticketBoardColumnService.deleteTicketBoardColumnById(Number(columnId));

            return httpResponse({ message: 'Ticket board column deleted successfully' }, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpError(err instanceof Error ? err.message : 'some error happened', {
                statusCode: StatusCode.INTERNAL_SERVER_ERROR,
            });
        }
    },
);

lambdaHandler.use(authMiddleware());