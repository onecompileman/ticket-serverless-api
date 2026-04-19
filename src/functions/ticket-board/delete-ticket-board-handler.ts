import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ticketBoardService } from '../../services/ticket-board';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse } from '../../libs/http/response';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';

const lambdaPath = '/ticket-board/delete/{ticketId}';
const lambdaMethod = 'delete';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = (context as any)?.user;
            const ticketId = event.pathParameters?.ticketId;
            
            if (!ticketId) {
                return httpError({ message: 'Ticket ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const ticketBoard = await ticketBoardService.getTicketBoardById(Number(ticketId));

            if (!ticketBoard) {
                return httpError({ message: 'Ticket board not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            console.log('ticketBoard', JSON.stringify(ticketBoard));    
            if (ticketBoard.created_by.id !== user.id) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            await ticketBoardService.deleteTicketBoardById(Number(ticketId));

            return httpResponse({ message: 'Ticket board deleted successfully' }, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpError(err instanceof Error ? err.message : 'some error happened', {
                statusCode: StatusCode.INTERNAL_SERVER_ERROR,
            });
        }
    },
);

lambdaHandler.use(authMiddleware());
