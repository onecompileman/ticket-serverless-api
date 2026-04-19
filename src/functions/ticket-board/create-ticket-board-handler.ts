import { APIGatewayProxyResult } from 'aws-lambda';
import { ticketBoardService } from '../../services/ticket-board';
import { baseHandler } from '../../libs/http/handler';
import { zodValidator } from '../../libs/http/schema-validator';
import { createTicketBoardSchema } from '../../schemas';
import { httpResponse, httpServerError } from '../../libs/http/response';
import { TicketBoard } from '../../entities';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';

const lambdaPath = '/ticket-board/add';
const lambdaMethod = 'post';

export const lambdaHandler = baseHandler(async (event: any): Promise<APIGatewayProxyResult> => {
    try {
        const ticketBoard = await ticketBoardService.addTicketBoard({
            ...event.body,
            created_at: new Date(),
            sys_id: uuid(),
        } as any);

        return httpResponse<TicketBoard>(ticketBoard, { statusCode: 201 });
    } catch (err) {
       return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(createTicketBoardSchema)]);
