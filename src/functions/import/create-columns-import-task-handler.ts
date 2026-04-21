import { TicketBoardColumn } from '../../entities';
import { ticketBoardColumnService } from '../../services/ticket-board-column';

type CreateColumnsInput = {
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

const lambdaInternal = true;

export const lambdaHandler = async (
    event: CreateColumnsInput,
): Promise<CreateColumnsInput & { column_ids_by_key: Record<string, number>; column_ids_by_index: number[] }> => {
    const columns = event.columns || [];
    const columnIdsByKey: Record<string, number> = {};
    const columnIdsByIndex: number[] = [];

    for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index];
        const savedColumn = await ticketBoardColumnService.addTicketBoardColumn({
            board: { id: event.board_id },
            column_name: column.column_name,
            sort_order: Number.isInteger(column.sort_order) ? Number(column.sort_order) : index,
            color: column.color,
            created_by: { id: event.created_by_id },
        } as TicketBoardColumn);

        const key = `${column.key || `column_${index}`}`;
        columnIdsByKey[key] = savedColumn.id;
        columnIdsByIndex[index] = savedColumn.id;
    }

    return {
        ...event,
        column_ids_by_key: columnIdsByKey,
        column_ids_by_index: columnIdsByIndex,
    };
};
