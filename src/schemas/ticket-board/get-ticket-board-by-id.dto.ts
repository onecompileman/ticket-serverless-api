import { Ticket, TicketBoard, TicketBoardColumn, TicketSubtask, User } from '../../entities';

export type TicketWithSubtasksDto = Ticket & {
    subtasks: TicketSubtask[];
};

export type GetTicketBoardByIdDto = TicketBoard & {
    tickets: TicketWithSubtasksDto[];
    boardColumns: TicketBoardColumn[];
    users: User[];
};