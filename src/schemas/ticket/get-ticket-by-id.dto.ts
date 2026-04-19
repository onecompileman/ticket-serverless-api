import { Ticket, TicketActivity, TicketAttachment, TicketSubtask } from '../../entities';

export type TicketAttachmentWithSignedUrlDto = Omit<TicketAttachment, 'file_url'> & {
    file_url: string;
};

export type GetTicketByIdDto = Ticket & {
    subtasks: TicketSubtask[];
    attachments: TicketAttachmentWithSignedUrlDto[];
    activities: TicketActivity[];
};
