import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TicketWithDetails } from '../../services/ticket/ticket.service';
import { TicketFacade } from '../../facades/ticket.facade';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketBoardColumnService } from '../../services/ticket-board-column';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/add';
const lambdaMethod = 'post';
const ticketFacade = new TicketFacade(ticketService);

export const lambdaHandler = baseHandler(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const user = context?.user;
        const { payload, attachmentFiles } = await ticketFacade.parseCreateTicketInput(event);
        const { board_id, column_id } = payload;

        const ticketBoard = await ticketBoardService.getTicketBoardById(board_id);

        if (!ticketBoard) {
            return httpError({ message: 'Ticket board not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const hasBoardAccess = await ticketBoardService.hasBoardAccess(board_id, user.id);
        if (!hasBoardAccess) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        const ticketBoardColumn = await ticketBoardColumnService.getTicketBoardColumnById(column_id);

        if (!ticketBoardColumn || ticketBoardColumn.board.id !== board_id) {
            return httpError({ message: 'Ticket board column not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const ticket = await ticketFacade.createTicket(payload, user.id, attachmentFiles);

        await ticketActivityService.createActivity(ticket.id, user.id, 'Created ticket');

        return httpResponse<TicketWithDetails>(ticket, { statusCode: StatusCode.CREATED });
    } catch (err) {
        if (err instanceof Error && err.message.includes('exceeds the 3MB limit')) {
            return httpError({ message: err.message }, { statusCode: StatusCode.PAYLOAD_TOO_LARGE });
        }

        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use(authMiddleware());