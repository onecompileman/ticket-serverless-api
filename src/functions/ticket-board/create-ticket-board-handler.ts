import { APIGatewayProxyResult } from 'aws-lambda';
import { ticketBoardService } from '../../services/ticket-board';
import { baseHandler } from '../../libs/http/handler';
import { zodValidator } from '../../libs/http/schema-validator';
import { createTicketBoardSchema } from '../../schemas';
import { httpResponse, httpServerError } from '../../libs/http/response';
import { TicketBoard } from '../../entities';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../../libs/middlewares/auth.middleware';
import { EmailTemplate } from '../../libs/enums/email-template.enum';
import { EmailTemplateService } from '../../services/email/email-template.service';
import { mailerService } from '../../services/mailer';

const lambdaPath = '/ticket-board/add';
const lambdaMethod = 'post';
const emailTemplateService = new EmailTemplateService(mailerService);

export const lambdaHandler = baseHandler(async (event: any, context: any): Promise<APIGatewayProxyResult> => {
    const user = context?.user;
    try {
        const ticketBoard = await ticketBoardService.addTicketBoard({
            ...event.body,
            created_at: new Date(),
            sys_id: uuid(),
        } as any);

        const creatorEmail = `${user?.email || ''}`.trim().toLowerCase();
        if (creatorEmail) {
            const frontendBaseUrl = `${process.env.FRONTEND_URL || ''}`.trim().replace(/\/$/, '');
            const boardUrl = frontendBaseUrl
                ? `${frontendBaseUrl}?boardId=${ticketBoard.id}`
                : `Board ${ticketBoard.id} created`;

            try {
                await emailTemplateService.sendEmailByTemplate(
                    creatorEmail,
                    `Board created: ${ticketBoard.board_name}`,
                    EmailTemplate.BOARD_CREATED,
                    {
                        boardId: String(ticketBoard.id),
                        boardName: ticketBoard.board_name,
                        creatorName: user?.full_name || creatorEmail,
                        boardUrl,
                    },
                );
            } catch (emailErr) {
                console.error(
                    'Failed to send board-created email',
                    emailErr instanceof Error ? emailErr.message : emailErr,
                );
            }
        }

        return httpResponse<TicketBoard>(ticketBoard, { statusCode: 201 });
    } catch (err) {
        const creatorEmail = `${user?.email || ''}`.trim().toLowerCase();
        if (creatorEmail) {
            try {
                await emailTemplateService.sendEmailByTemplate(
                    creatorEmail,
                    'Board creation failed',
                    EmailTemplate.BOARD_CREATE_FAILED,
                    {
                        creatorName: user?.full_name || creatorEmail,
                        boardName: `${event?.body?.board_name || 'Untitled Board'}`,
                        errorMessage: err instanceof Error ? err.message : 'some error happened',
                    },
                );
            } catch (emailErr) {
                console.error(
                    'Failed to send board-create-failed email',
                    emailErr instanceof Error ? emailErr.message : emailErr,
                );
            }
        }

        return httpServerError(err instanceof Error ? err.message : 'some error happened');
    }
});

lambdaHandler.use([authMiddleware(), zodValidator(createTicketBoardSchema)]);
