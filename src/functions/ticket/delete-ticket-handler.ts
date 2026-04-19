import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/delete/{ticketId}';
const lambdaMethod = 'delete';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const ticketId = event.pathParameters?.ticketId;

            if (!ticketId) {
                return httpError({ message: 'Ticket ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const ticket = await ticketService.getTicketById(Number(ticketId));

            if (!ticket) {
                return httpError({ message: 'Ticket not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            if (ticket.created_by.id !== user.id) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            await ticketService.deleteTicketById(Number(ticketId));

            return httpResponse({ message: 'Ticket deleted successfully' }, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpError(err instanceof Error ? err.message : 'some error happened', {
                statusCode: StatusCode.INTERNAL_SERVER_ERROR,
            });
        }
    },
);

lambdaHandler.use(authMiddleware());