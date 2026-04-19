import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { User } from '../../entities';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { ticketBoardService } from '../../services/ticket-board';
import { userService } from '../../services/user';

const lambdaPath = '/ticket-board/get-users/{boardId}';

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

            const hasBoardAccess = await ticketBoardService.hasBoardAccess(Number(boardId), user.id);
            if (!hasBoardAccess) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            const boardUsers = await userService.getUsersByBoardId(Number(boardId));
            const users = [ticketBoard.created_by, ...boardUsers].filter(
                (boardUser, index, allUsers) => allUsers.findIndex((currentUser) => currentUser.id === boardUser.id) === index,
            );

            return httpResponse<User[]>(users, { statusCode: StatusCode.OK });
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use(authMiddleware());