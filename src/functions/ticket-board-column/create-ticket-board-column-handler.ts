import { APIGatewayProxyResult } from 'aws-lambda';
import { TicketBoardColumn } from '../../entities';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { createTicketBoardColumnSchema } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketBoardColumnService } from '../../services/ticket-board-column';

const lambdaPath = '/ticket-board-column/add';
const lambdaMethod = 'post';

export const lambdaHandler = baseHandler(async (event: any, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const user = context?.user;
        const { board_id, column_name, sort_order, color } = event.body;

        const ticketBoard = await ticketBoardService.getTicketBoardById(board_id);

        if (!ticketBoard) {
            return httpError({ message: 'Ticket board not found' }, { statusCode: StatusCode.NOT_FOUND });
        }

        const hasBoardAccess = await ticketBoardService.hasBoardAccess(board_id, user.id);
        if (!hasBoardAccess) {
            return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
        }

        const ticketBoardColumn = await ticketBoardColumnService.addTicketBoardColumn({
            board: { id: board_id },
            column_name,
            sort_order,
            color,
            created_by: { id: user.id },
        } as TicketBoardColumn);

        return httpResponse<TicketBoardColumn>(ticketBoardColumn, { statusCode: StatusCode.CREATED });
    } catch (err) {
        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(createTicketBoardColumnSchema)]);