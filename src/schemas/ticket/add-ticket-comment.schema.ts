import { z } from 'zod';

export const addTicketCommentSchema = z
    .object({
        comment: z.string().trim().min(1),
    })
    .strict();

export type AddTicketCommentDto = z.infer<typeof addTicketCommentSchema>;
