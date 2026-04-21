import { APIGatewayProxyResult } from 'aws-lambda';

const lambdaInternal = true;

type ImportPayload = {
    created_by_id: number;
    creator_email?: string;
    creator_name?: string;
    board: {
        board_name: string;
        board_color: string;
        board_description: string;
    };
    columns?: Array<{ key?: string; column_name: string; sort_order?: number; color: string }>;
    tickets?: Array<{
        title: string;
        description: string;
        acceptance_criteria?: string;
        priority?: number;
        sort_order?: number;
        column_id?: number;
        column_key?: string;
        column_index?: number;
        assigned_user_id?: number;
    }>;
    invite_emails?: string[];
};

export const lambdaHandler = async (event: unknown): Promise<ImportPayload> => {
    const payload = (event || {}) as Partial<ImportPayload>;

    if (!payload.created_by_id || Number(payload.created_by_id) <= 0) {
        throw new Error('created_by_id is required');
    }

    if (!payload.board?.board_name || !payload.board?.board_color || payload.board?.board_description == null) {
        throw new Error('board.board_name, board.board_color, and board.board_description are required');
    }

    const normalizedColumns = (payload.columns || []).map((column, index) => ({
        key: `${column.key || `column_${index}`}`,
        column_name: `${column.column_name || ''}`.trim(),
        sort_order: Number.isInteger(column.sort_order) ? Number(column.sort_order) : index,
        color: `${column.color || ''}`.trim(),
    }));

    normalizedColumns.forEach((column) => {
        if (!column.column_name) {
            throw new Error('Each column must include column_name');
        }
        if (!column.color) {
            throw new Error('Each column must include color');
        }
    });

    const normalizedTickets = (payload.tickets || []).map((ticket, index) => ({
        title: `${ticket.title || ''}`.trim(),
        description: `${ticket.description || ''}`.trim(),
        acceptance_criteria: `${ticket.acceptance_criteria || ''}`,
        priority: Number.isInteger(ticket.priority) ? Number(ticket.priority) : 0,
        sort_order: Number.isInteger(ticket.sort_order) ? Number(ticket.sort_order) : index,
        column_id: ticket.column_id,
        column_key: ticket.column_key,
        column_index: ticket.column_index,
        assigned_user_id: ticket.assigned_user_id,
    }));

    normalizedTickets.forEach((ticket) => {
        if (!ticket.title) {
            throw new Error('Each ticket must include title');
        }
        if (!ticket.description) {
            throw new Error('Each ticket must include description');
        }
    });

    const normalizedEmails = (payload.invite_emails || [])
        .map((email) => `${email || ''}`.trim().toLowerCase())
        .filter(Boolean);

    return {
        created_by_id: Number(payload.created_by_id),
        creator_email: payload.creator_email,
        creator_name: payload.creator_name,
        board: {
            board_name: `${payload.board.board_name}`.trim(),
            board_color: `${payload.board.board_color}`.trim(),
            board_description: `${payload.board.board_description}`.trim(),
        },
        columns: normalizedColumns,
        tickets: normalizedTickets,
        invite_emails: normalizedEmails,
    };
};
