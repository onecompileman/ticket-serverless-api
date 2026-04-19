import { z } from 'zod';

const parseFormArray = (value: unknown): unknown => {
    if (typeof value !== 'string') {
        return value;
    }

    const normalized = value.trim();
    if (!normalized) {
        return [];
    }

    try {
        return JSON.parse(normalized);
    } catch {
        return value;
    }
};

const attachmentSchema = z.union([
    z.string().trim().min(1),
    z
        .object({
            file_url: z.string().trim().min(1),
        })
        .strict(),
]);

const subtaskSchema = z.union([
    z.string().trim().min(1),
    z
        .object({
            task: z.string().trim().min(1),
            is_completed: z.boolean().optional(),
        })
        .strict(),
]);

export const createTicketSchema = z
    .object({
        board_id: z.coerce.number().int().positive(),
        assigned_user_id: z.coerce.number().int().positive(),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        acceptance_criteria: z.string(),
        priority: z.coerce.number().int().min(0),
        sort_order: z.coerce.number().int().min(0),
        column_id: z.coerce.number().int().positive(),
        attachments: z.preprocess(parseFormArray, z.array(attachmentSchema)).optional(),
        subtasks: z.preprocess(parseFormArray, z.array(subtaskSchema)).optional(),
    })
    .strict();

export type CreateTicketDto = z.infer<typeof createTicketSchema>;