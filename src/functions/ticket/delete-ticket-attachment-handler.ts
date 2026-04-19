import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketService } from '../../services/ticket';

const lambdaPath = '/ticket/attachment/delete/{attachmentId}';
const lambdaMethod = 'delete';

export const lambdaHandler = baseHandler(async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const user = context?.user;
        const attachmentId = event.pathParameters?.attachmentId;

        if (!attachmentId) {
            return httpError({ message: 'Attachment ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
        }

        const attachment = await ticketService.getAttachmentById(Number(attachmentId));

        if (!attachment) {
            return httpError({ message: 'Attachment not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        if (attachment.created_by.id !== user.id) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        await ticketActivityService.createActivity(attachment.ticket.id, user.id, 'Deleted attachment');

        await ticketService.deleteAttachment(Number(attachmentId));

        return httpResponse({ message: 'Attachment deleted successfully' }, { statusCode: StatusCode.OK });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use(authMiddleware());
