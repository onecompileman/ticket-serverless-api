import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/subtask/delete/{subtaskId}';
const lambdaMethod = 'delete';

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

        if (subtask.created_by.id !== user.id) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        await ticketActivityService.createActivity(subtask.ticket.id, user.id, 'Deleted subtask');

        await ticketService.deleteSubtask(Number(subtaskId));

        return httpResponse({ message: 'Subtask deleted successfully' }, { statusCode: StatusCode.OK });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use(authMiddleware());
