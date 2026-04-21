import { v4 as uuid } from 'uuid';
import { Ticket } from '../../entities';
import { ticketActivityService } from '../../services/ticket-activity';
import { ticketService } from '../../services/ticket';

type TicketImportInput = {
    title: string;
    description: string;
    acceptance_criteria?: string;
    priority?: number;
    sort_order?: number;
    column_id?: number;
    column_key?: string;
    column_index?: number;
    assigned_user_id?: number;
};

type CreateTicketsInput = {
    created_by_id: number;
    creator_email?: string;
    creator_name?: string;
    board: {
        board_name: string;
        board_color: string;
        board_description: string;
    };
    board_id: number;
    board_url: string;
    columns?: Array<{ key?: string; column_name: string; sort_order?: number; color: string }>;
    tickets?: TicketImportInput[];
    invite_emails?: string[];
    column_ids_by_key?: Record<string, number>;
    column_ids_by_index?: number[];
};

const lambdaInternal = true;

function resolveColumnId(ticket: TicketImportInput, input: CreateTicketsInput): number {
    if (ticket.column_id) {
        return ticket.column_id;
    }

    if (ticket.column_key && input.column_ids_by_key?.[ticket.column_key]) {
        return input.column_ids_by_key[ticket.column_key];
    }

    if (Number.isInteger(ticket.column_index) && input.column_ids_by_index?.[Number(ticket.column_index)] != null) {
        return input.column_ids_by_index[Number(ticket.column_index)];
    }

    if (input.column_ids_by_index?.length) {
        return input.column_ids_by_index[0];
    }

    throw new Error(`Unable to resolve column for ticket ${ticket.title}`);
}

export const lambdaHandler = async (
    event: CreateTicketsInput,
): Promise<CreateTicketsInput & { created_ticket_ids: number[] }> => {
    const tickets = event.tickets || [];
    const createdTicketIds: number[] = [];

    for (let index = 0; index < tickets.length; index += 1) {
        const ticketInput = tickets[index];
        const columnId = resolveColumnId(ticketInput, event);
        const assignedUserId = ticketInput.assigned_user_id || event.created_by_id;

        const ticket = await ticketService.addTicket({
            board: { id: event.board_id },
            assigned_user: { id: assignedUserId },
            created_by: { id: event.created_by_id },
            sys_id: uuid(),
            title: ticketInput.title,
            description: ticketInput.description,
            acceptance_criteria: ticketInput.acceptance_criteria || '',
            priority: Number.isInteger(ticketInput.priority) ? Number(ticketInput.priority) : 0,
            sort_order: Number.isInteger(ticketInput.sort_order) ? Number(ticketInput.sort_order) : index,
            column: { id: columnId },
        } as Ticket);

        await ticketActivityService.createActivity(ticket.id, event.created_by_id, 'Imported ticket');
        createdTicketIds.push(ticket.id);
    }

    return {
        ...event,
        created_ticket_ids: createdTicketIds,
    };
};
