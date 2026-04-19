import { z } from 'zod';

export const updateTicketBoardColumnSchema = z
    .object({
        column_name: z.string().trim().min(1).optional(),
        sort_order: z.number().int().min(0).optional(),
        color: z.string().trim().min(1).max(50).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required',
    });

export type UpdateTicketBoardColumnDto = z.infer<typeof updateTicketBoardColumnSchema>;