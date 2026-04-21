import { z } from 'zod';

export const updateTicketBoardSchema = z
    .object({
        board_name: z.string().trim().min(1).max(255).optional(),
        board_color: z.string().trim().min(1).max(50).optional(),
        board_description: z.string().trim().max(500).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required',
    });

export type UpdateTicketBoardDto = z.infer<typeof updateTicketBoardSchema>;