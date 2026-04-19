import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { updateTicketCommentSchema } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/comment/update/{commentId}';
const lambdaMethod = 'put';

export const lambdaHandler = baseHandler(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const user = context?.user;
        const commentId = event.pathParameters?.commentId;

        if (!commentId) {
            return httpError({ message: 'Comment ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
        }

        const existing = await ticketService.getCommentById(Number(commentId));

        if (!existing) {
            return httpError({ message: 'Comment not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const ticket = await ticketService.getTicketById(existing.ticket.id);
        if (!ticket) {
            return httpError({ message: 'Ticket not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const hasBoardAccess = await ticketBoardService.hasBoardAccess(ticket.board.id, user.id);
        if (!hasBoardAccess) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        const { comment } = event.body as any;

        const updated = await ticketService.updateComment(Number(commentId), comment);

        return httpResponse(updated!, { statusCode: StatusCode.OK });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(updateTicketCommentSchema)]);
