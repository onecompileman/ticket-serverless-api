import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { updateTicketSubtaskSchema } from '../../schemas';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/subtask/update/{subtaskId}';
const lambdaMethod = 'put';

const SUBTASK_FIELD_LABELS: Record<string, string> = {
    task: 'task',
    is_completed: 'status',
};

export const lambdaHandler = baseHandler(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const user = context?.user;
        const subtaskId = event.pathParameters?.subtaskId;

        if (!subtaskId) {
            return httpError({ message: 'Subtask ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
        }

        const subtask = await ticketService.getSubtaskById(Number(subtaskId));

        if (!subtask) {
            return httpError({ message: 'Subtask not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const ticket = await ticketService.getTicketById(subtask.ticket.id);
        if (!ticket) {
            return httpError({ message: 'Ticket not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const hasBoardAccess = await ticketBoardService.hasBoardAccess(ticket.board.id, user.id);
        if (!hasBoardAccess) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        const body = (event.body || {}) as any;
        const { task, is_completed } = body;

        const updated = await ticketService.updateSubtask(Number(subtaskId), { task, is_completed });

        const changedFields = Object.keys(body)
            .filter((key) => key in SUBTASK_FIELD_LABELS)
            .map((key) => SUBTASK_FIELD_LABELS[key]);

        const log = changedFields.length
            ? `Updated subtask (${changedFields.join(', ')})`
            : 'Updated subtask';

        await ticketActivityService.createActivity(ticket.id, user.id, log);

        return httpResponse(updated!, { statusCode: StatusCode.OK });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(updateTicketSubtaskSchema)]);
