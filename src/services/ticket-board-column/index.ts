import { DatabaseClient } from '../../libs/db/database-client';
import { TicketBoardColumnService } from './ticket-board-column.service';

export const ticketBoardColumnService = new TicketBoardColumnService(new DatabaseClient());