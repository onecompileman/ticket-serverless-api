import { z } from 'zod';

export const addTicketAttachmentSchema = z
    .object({
        file_url: z.string().trim().min(1),
    })
    .strict();

export type AddTicketAttachmentDto = z.infer<typeof addTicketAttachmentSchema>;
