import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/comment/delete/{commentId}';
const lambdaMethod = 'delete';

export const lambdaHandler = baseHandler(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const user = context?.user;
        const commentId = event.pathParameters?.commentId;

        if (!commentId) {
            return httpError({ message: 'Comment ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
        }

        const comment = await ticketService.getCommentById(Number(commentId));

        if (!comment) {
            return httpError({ message: 'Comment not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        if (comment.user.id !== user.id) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        await ticketActivityService.createActivity(comment.ticket.id, user.id, 'Deleted comment');

        await ticketService.deleteComment(Number(commentId));

        return httpResponse({ message: 'Comment deleted successfully' }, { statusCode: StatusCode.OK });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use(authMiddleware());
