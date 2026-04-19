import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TicketFacade } from '../../facades/ticket.facade';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { GetTicketByIdDto } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/get/{ticketId}';
const ticketFacade = new TicketFacade(ticketService);

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const ticketId = event.pathParameters?.ticketId;

            if (!ticketId) {
                return httpError({ message: 'Ticket ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const ticket = await ticketFacade.getTicketByIdWithSignedAttachments(Number(ticketId));

            if (!ticket) {
                return httpError({ message: 'Ticket not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            const hasBoardAccess = await ticketBoardService.hasBoardAccess(ticket.board.id, user.id);
            if (!hasBoardAccess) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            return httpResponse<GetTicketByIdDto>(ticket, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use(authMiddleware());
