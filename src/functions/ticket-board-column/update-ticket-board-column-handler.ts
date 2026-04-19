import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TicketBoardColumn } from '../../entities';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { updateTicketBoardColumnSchema } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';
import { ticketBoardColumnService } from '../../services/ticket-board-column';

const lambdaPath = '/ticket-board-column/update/{columnId}';
const lambdaMethod = 'put';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const columnId = event.pathParameters?.columnId;

            if (!columnId) {
                return httpError({ message: 'Column ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const ticketBoardColumn = await ticketBoardColumnService.getTicketBoardColumnById(Number(columnId));

            if (!ticketBoardColumn) {
                return httpError({ message: 'Ticket board column not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            const hasBoardAccess = await ticketBoardService.hasBoardAccess(ticketBoardColumn.board.id, user.id);
            if (!hasBoardAccess) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            const body = (event.body || {}) as any;

            const updatedTicketBoardColumn = await ticketBoardColumnService.updateTicketBoardColumn(Number(columnId), {
                column_name: body.column_name,
                sort_order: body.sort_order,
                color: body.color,
            });

            return httpResponse<TicketBoardColumn>(updatedTicketBoardColumn as TicketBoardColumn, {
                statusCode: StatusCode.OK,
            });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use([authMiddleware(), zodValidator(updateTicketBoardColumnSchema)]);