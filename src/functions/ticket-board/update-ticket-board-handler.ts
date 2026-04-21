import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TicketBoard } from '../../entities';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { zodValidator } from '../../libs/http/schema-validator';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { updateTicketBoardSchema } from '../../schemas';
import { ticketBoardService } from '../../services/ticket-board';

const lambdaPath = '/ticket-board/update/{boardId}';
const lambdaMethod = 'put';

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const boardId = event.pathParameters?.boardId;

            if (!boardId) {
                return httpError({ message: 'Board ID is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const ticketBoard = await ticketBoardService.getTicketBoardById(Number(boardId));

            if (!ticketBoard) {
                return httpError({ message: 'Ticket board not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            if (ticketBoard.created_by.id !== user.id) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            const body = (event.body || {}) as any;

            const updatedTicketBoard = await ticketBoardService.updateTicketBoard(Number(boardId), {
                board_name: body.board_name,
                board_color: body.board_color,
                board_description: body.board_description,
            });

            return httpResponse<TicketBoard>(updatedTicketBoard as TicketBoard, {
                statusCode: StatusCode.OK,
            });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use([authMiddleware(), zodValidator(updateTicketBoardSchema)]);