import { z } from 'zod';

export const updateTicketCommentSchema = z
    .object({
        comment: z.string().trim().min(1),
    })
    .strict();

export type UpdateTicketCommentDto = z.infer<typeof updateTicketCommentSchema>;
