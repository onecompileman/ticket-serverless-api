import { v4 as uuid } from 'uuid';
import { ticketBoardService } from '../../services/ticket-board';

type CreateBoardInput = {
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

const lambdaInternal = true;

export const lambdaHandler = async (event: CreateBoardInput): Promise<CreateBoardInput & { board_id: number; board_url: string }> => {
    const ticketBoard = await ticketBoardService.addTicketBoard({
        board_name: event.board.board_name,
        board_color: event.board.board_color,
        board_description: event.board.board_description,
        created_by: { id: event.created_by_id },
        created_at: new Date(),
        sys_id: uuid(),
    } as any);

    const frontendBaseUrl = `${process.env.FRONTEND_URL || ''}`.trim().replace(/\/$/, '');
    const boardUrl = frontendBaseUrl ? `${frontendBaseUrl}?boardId=${ticketBoard.id}` : `Board ${ticketBoard.id}`;

    return {
        ...event,
        board_id: ticketBoard.id,
        board_url: boardUrl,
    };
};
