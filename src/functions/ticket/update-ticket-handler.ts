import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Ticket } from '../../entities';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { updateTicketSchema } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketBoardColumnService } from '../../services/ticket-board-column';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/update/{ticketId}';
const lambdaMethod = 'put';

const UPDATE_FIELD_LABELS: Record<string, string> = {
    assigned_user_id: 'assignee',
    title: 'title',
    description: 'description',
    acceptance_criteria: 'acceptance criteria',
    priority: 'priority',
    sort_order: 'sort order',
    column_id: 'column',
};

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

            const hasBoardAccess = await ticketBoardService.hasBoardAccess(ticket.board.id, user.id);
            if (!hasBoardAccess) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            if (event.body.column_id) {
                const ticketBoardColumn = await ticketBoardColumnService.getTicketBoardColumnById(event.body.column_id);

                if (!ticketBoardColumn || ticketBoardColumn.board.id !== ticket.board.id) {
                    return httpError({ message: 'Ticket board column not found' }, { statusCode: StatusCode.NOT_FOUND });
                }
            }

            const updatedTicket = await ticketService.updateTicket(Number(ticketId), {
                assigned_user: event.body.assigned_user_id ? { id: event.body.assigned_user_id } : undefined,
                title: event.body.title,
                description: event.body.description,
                acceptance_criteria: event.body.acceptance_criteria,
                priority: event.body.priority,
                sort_order: event.body.sort_order,
                column: event.body.column_id ? { id: event.body.column_id } : undefined,
            });

            const changedFields = Object.keys(event.body)
                .filter((key) => key in UPDATE_FIELD_LABELS)
                .map((key) => UPDATE_FIELD_LABELS[key]);

            const log = changedFields.length
                ? `Updated ticket (${changedFields.join(', ')})`
                : 'Updated ticket';

            await ticketActivityService.createActivity(Number(ticketId), user.id, log);

            return httpResponse<Ticket>(updatedTicket as Ticket, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use([authMiddleware(), zodValidator(updateTicketSchema)]);