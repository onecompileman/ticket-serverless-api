import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { addTicketSubtaskSchema } from '../../schemas';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/subtask/add/{ticketId}';
const lambdaMethod = 'post';

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

        const { task, is_completed } = event.body as any;

        const subtasks = await ticketService.addSubtasks(Number(ticketId), user.id, [{ task, is_completed }]);

        await ticketActivityService.createActivity(Number(ticketId), user.id, 'Added subtask');

        return httpResponse(subtasks[0], { statusCode: StatusCode.CREATED });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(addTicketSubtaskSchema)]);
