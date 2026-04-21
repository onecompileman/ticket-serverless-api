import { v4 as uuid } from 'uuid';
import { TicketBoardEmailInvite } from '../../entities';
import { EmailTemplate } from '../../libs/enums/email-template.enum';
import { DatabaseClient } from '../../libs/db/database-client';
import { EmailTemplateService } from '../../services/email/email-template.service';
import { mailerService } from '../../services/mailer';
import { TicketBoardEmailService } from '../../services/ticket-board-email/ticket-board-email.service';
import { userService } from '../../services/user';

type SendInvitesInput = {
    created_by_id: number;
    creator_email?: string;
    creator_name?: string;
    board: {
        board_name: string;
        board_color: string;
        board_description: string;
    };
    board_id: number;
    board_url: string;
    invite_emails?: string[];
};

const lambdaInternal = true;

const ticketBoardEmailService = new TicketBoardEmailService(new DatabaseClient());
const emailTemplateService = new EmailTemplateService(mailerService);

export const lambdaHandler = async (
    event: SendInvitesInput,
): Promise<SendInvitesInput & { invites_sent: string[]; invites_skipped: string[] }> => {
    const inviteEmails = event.invite_emails || [];
    const boardUsers = await userService.getUsersByBoardId(event.board_id);
    const userEmails = new Set(boardUsers.map((user) => `${user.email || ''}`.trim().toLowerCase()));

    const invitesSent: string[] = [];
    const invitesSkipped: string[] = [];

    for (const rawEmail of inviteEmails) {
        const inviteEmail = `${rawEmail || ''}`.trim().toLowerCase();
        if (!inviteEmail) {
            continue;
        }

        if (userEmails.has(inviteEmail)) {
            invitesSkipped.push(inviteEmail);
            continue;
        }

        const existingInvite = await ticketBoardEmailService.getEmailInviteByBoardIdAndEmail(event.board_id, inviteEmail);
        if (existingInvite) {
            invitesSkipped.push(inviteEmail);
            continue;
        }

        const inviteCode = uuid();
        await ticketBoardEmailService.addEmailInvite({
            board: { id: event.board_id },
            invite_email: inviteEmail,
            invite_code: inviteCode,
        } as TicketBoardEmailInvite);

        const frontendBaseUrl = `${process.env.FRONTEND_URL || ''}`.trim().replace(/\/$/, '');
        const boardUrl = frontendBaseUrl ? `${frontendBaseUrl}?inviteCode=${inviteCode}` : event.board_url;

        await emailTemplateService.sendEmailByTemplate(
            inviteEmail,
            `Invitation to join ${event.board.board_name}`,
            EmailTemplate.BOARD_INVITATION,
            {
                boardId: String(event.board_id),
                boardName: event.board.board_name,
                inviterName: event.creator_name || event.creator_email || 'Ticket User',
                inviteeEmail: inviteEmail,
                boardUrl,
            },
        );

        invitesSent.push(inviteEmail);
    }

    return {
        ...event,
        invites_sent: invitesSent,
        invites_skipped: invitesSkipped,
    };
};
