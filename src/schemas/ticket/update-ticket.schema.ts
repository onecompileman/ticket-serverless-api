import { z } from 'zod';

export const updateTicketSchema = z
    .object({
        assigned_user_id: z.number().int().positive().optional(),
        title: z.string().trim().min(1).optional(),
        description: z.string().trim().min(1).optional(),
        acceptance_criteria: z.string().trim().min(1).optional(),
        priority: z.number().int().min(0).optional(),
        sort_order: z.number().int().min(0).optional(),
        column_id: z.number().int().positive().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required',
    });

export type UpdateTicketDto = z.infer<typeof updateTicketSchema>;