import { z } from 'zod';

// Matches writable fields from TicketBoard entity.
export const createTicketBoardSchema = z
  .object({
    board_name: z.string().trim().min(1).max(255),
    board_color: z.string().trim().min(1).max(50),
    board_description: z.string().trim().max(500),
    created_by: z.number().int().positive(),
  })
  .strict();

export type CreateTicketBoardDto = z.infer<typeof createTicketBoardSchema>;
