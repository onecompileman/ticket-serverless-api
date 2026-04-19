import { TicketBoard } from './ticket-board.entity';
import { TicketBoardColumn } from './ticket-board-column.entity';
import { TicketBoardUser } from './ticket-board-user.entity';
import { Ticket } from './ticket.entity';
import { TicketActivity } from './ticket-activity.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketSubtask } from './ticket-subtask.entity';
import { User } from './user.entity';
import { TicketBoardEmailInvite } from './ticket-board-email-invite.entity';

export const entities = {
    TicketBoard,
    TicketBoardColumn,
    TicketBoardUser,
    Ticket,
    TicketActivity,
    TicketAttachment,
    TicketComment,
    TicketSubtask,
    User,
    TicketBoardEmailInvite
};

export * from './ticket-activity.entity';
export * from './ticket-attachment.entity';
export * from './ticket-board.entity';
export * from './ticket-board-column.entity';
export * from './ticket-board-user.entity';
export * from './ticket-comment.entity';
export * from './ticket-subtask.entity';
export * from './ticket.entity';
export * from './user.entity';
export * from './ticket-board-email-invite.entity';