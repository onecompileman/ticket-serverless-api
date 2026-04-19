import { z } from 'zod';

export const addTicketSubtaskSchema = z
    .object({
        task: z.string().trim().min(1),
        is_completed: z.boolean().optional(),
    })
    .strict();

export type AddTicketSubtaskDto = z.infer<typeof addTicketSubtaskSchema>;
