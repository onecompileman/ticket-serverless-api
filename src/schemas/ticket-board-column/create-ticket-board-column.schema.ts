import { z } from 'zod';

export const createTicketBoardColumnSchema = z
    .object({
        board_id: z.number().int().positive(),
        column_name: z.string().trim().min(1),
        sort_order: z.number().int().min(0),
        color: z.string().trim().min(1).max(50),
    })
    .strict();

export type CreateTicketBoardColumnDto = z.infer<typeof createTicketBoardColumnSchema>;