import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TicketFacade } from '../../facades/ticket.facade';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/attachment/add/{ticketId}';
const lambdaMethod = 'post';
const ticketFacade = new TicketFacade(ticketService);

export const lambdaHandler = baseHandler(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
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

        const hasBoardAccess = await ticketBoardService.hasBoardAccess(ticket.board.id, user.id);
        if (!hasBoardAccess) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        const input = await ticketFacade.parseAddAttachmentInput(event);

        if (!input.file && !input.fileUrl) {
            return httpError({ message: 'No attachment provided' }, { statusCode: StatusCode.BAD_REQUEST });
        }

        const attachments = await ticketFacade.addAttachmentToTicket(Number(ticketId), user.id, input);

        await ticketActivityService.createActivity(Number(ticketId), user.id, 'Added attachment');

        return httpResponse(attachments, { statusCode: StatusCode.CREATED });
    } catch (err) {
        if (err instanceof Error && err.message.includes('exceeds the 3MB limit')) {
            return httpError({ message: err.message }, { statusCode: StatusCode.PAYLOAD_TOO_LARGE });
        }

        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use(authMiddleware());
