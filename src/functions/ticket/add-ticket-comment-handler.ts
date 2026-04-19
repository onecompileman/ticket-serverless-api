import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { addTicketCommentSchema } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/comment/add/{ticketId}';
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

        const { comment } = event.body as any;

        const created = await ticketService.addComment(Number(ticketId), user.id, comment);

        return httpResponse(created, { statusCode: StatusCode.CREATED });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(addTicketCommentSchema)]);
