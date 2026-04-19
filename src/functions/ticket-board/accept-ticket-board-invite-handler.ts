import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TicketBoardUser } from '../../entities';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { DatabaseClient } from '../../libs/db/database-client';
import { TicketBoardEmailService } from '../../services/ticket-board-email/ticket-board-email.service';

const lambdaPath = '/ticket-board/invite/accept/{code}';

const databaseClient = new DatabaseClient();
const ticketBoardEmailService = new TicketBoardEmailService(databaseClient);

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const code = event.pathParameters?.code;

            if (!code) {
                return httpError({ message: 'Invite code is required' }, { statusCode: StatusCode.BAD_REQUEST });
            }

            const invite = await ticketBoardEmailService.getEmailInviteByCode(code);
            if (!invite) {
                return httpError({ message: 'Invite not found or expired' }, { statusCode: StatusCode.NOT_FOUND });
            }

            const inviteEmail = `${invite.invite_email || ''}`.trim().toLowerCase();
            const userEmail = `${user?.email || ''}`.trim().toLowerCase();
            if (inviteEmail !== userEmail) {
                return httpError(
                    { message: 'This invite is not for the authenticated user' },
                    { statusCode: StatusCode.UNAUTHORIZED },
                );
            }

            const dataSource = await databaseClient.initialize();
            const boardUserRepo = dataSource.getRepository(TicketBoardUser);

            const existingMember = await boardUserRepo.findOne({
                where: {
                    board: { id: invite.board.id },
                    user: { id: user.id },
                },
            });

            if (!existingMember) {
                await boardUserRepo.save(
                    boardUserRepo.create({
                        board: { id: invite.board.id },
                        user: { id: user.id },
                    }),
                );
            }

            await ticketBoardEmailService.deleteEmailInviteById(invite.id);

            return httpResponse(
                {
                    message: 'Invite accepted successfully',
                    board_id: invite.board.id,
                    user_id: user.id,
                },
                { statusCode: StatusCode.OK },
            );
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use(authMiddleware());
