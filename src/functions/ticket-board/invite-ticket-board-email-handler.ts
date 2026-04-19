import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { TicketBoardEmailInvite } from '../../entities';
import { EmailTemplate } from '../../libs/enums/email-template.enum';
import { StatusCode } from '../../libs/enums/status-code.enum';
import { baseHandler } from '../../libs/http/handler';
import { httpError, httpResponse, httpServerError } from '../../libs/http/response';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { DatabaseClient } from '../../libs/db/database-client';
import { EmailTemplateService } from '../../services/email/email-template.service';
import { mailerService } from '../../services/mailer';
import { ticketBoardService } from '../../services/ticket-board';
import { TicketBoardEmailService } from '../../services/ticket-board-email/ticket-board-email.service';
import { userService } from '../../services/user';

const lambdaPath = '/ticket-board/invite';
const lambdaMethod = 'post';

const ticketBoardEmailService = new TicketBoardEmailService(new DatabaseClient());
const emailTemplateService = new EmailTemplateService(mailerService);

export const lambdaHandler = baseHandler(
    async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
        try {
            const user = context?.user;
            const body = (event.body || {}) as { board_id?: number; invite_email?: string };
            const boardId = Number(body.board_id);
            const inviteEmail = `${body.invite_email ?? ''}`.trim().toLowerCase();

            if (!boardId || !inviteEmail) {
                return httpError(
                    { message: 'board_id and invite_email are required' },
                    { statusCode: StatusCode.BAD_REQUEST },
                );
            }

            const board = await ticketBoardService.getTicketBoardById(boardId);
            if (!board) {
                return httpError({ message: 'Ticket board not found' }, { statusCode: StatusCode.NOT_FOUND });
            }

            const hasBoardAccess = await ticketBoardService.hasBoardAccess(boardId, user.id);
            if (!hasBoardAccess) {
                return httpError({ message: 'Unauthorized' }, { statusCode: StatusCode.UNAUTHORIZED });
            }

            const boardUsers = await userService.getUsersByBoardId(boardId);
            const existingBoardUser = [board.created_by, ...boardUsers].find(
                (boardUser) => `${boardUser.email || ''}`.trim().toLowerCase() === inviteEmail,
            );

            if (existingBoardUser) {
                return httpError(
                    { message: 'User is already in this board' },
                    { statusCode: StatusCode.BAD_REQUEST },
                );
            }

            const existingInvite = await ticketBoardEmailService.getEmailInviteByBoardIdAndEmail(boardId, inviteEmail);
            if (existingInvite) {
                return httpError(
                    { message: 'This email already has a pending invite for this board' },
                    { statusCode: StatusCode.BAD_REQUEST },
                );
            }

            const inviteCode = uuid();
            const invite = await ticketBoardEmailService.addEmailInvite({
                board: { id: boardId },
                invite_email: inviteEmail,
                invite_code: inviteCode,
            } as TicketBoardEmailInvite);

            const frontendBaseUrl = `${process.env.FRONTEND_URL || ''}`.trim().replace(/\/$/, '');
            const boardUrl = frontendBaseUrl
                ? `${frontendBaseUrl}?inviteCode=${inviteCode}`
                : `https://${event.requestContext.domainName}/${event.requestContext.stage}/ticket-board/invite/accept/${inviteCode}`;

            await emailTemplateService.sendEmailByTemplate(
                inviteEmail,
                `Invitation to join ${board.board_name}`,
                EmailTemplate.BOARD_INVITATION,
                {
                    boardId: String(board.id),
                    boardName: board.board_name,
                    inviterName: user?.full_name || user?.email || 'Ticket User',
                    inviteeEmail: inviteEmail,
                    boardUrl,
                },
            );

            return httpResponse(
                {
                    id: invite.id,
                    board_id: boardId,
                    invite_email: invite.invite_email,
                    invite_code: invite.invite_code,
                },
                { statusCode: StatusCode.CREATED },
            );
        } catch (err) {
            return httpServerError(err instanceof Error ? err.message : 'some error happened');
        }
    },
);

lambdaHandler.use(authMiddleware());
