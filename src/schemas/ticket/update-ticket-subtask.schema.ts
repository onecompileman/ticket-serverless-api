import { z } from 'zod';

export const updateTicketSubtaskSchema = z
    .object({
        task: z.string().trim().min(1).optional(),
        is_completed: z.boolean().optional(),
    })
    .strict()
    .refine((data) => data.task !== undefined || data.is_completed !== undefined, {
        message: 'At least one field (task or is_completed) must be provided',
    });

export type UpdateTicketSubtaskDto = z.infer<typeof updateTicketSubtaskSchema>;
