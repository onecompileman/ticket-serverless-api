import { DatabaseClient } from '../../libs/db/database-client';
import { TicketService } from './ticket.service';

export const ticketService = new TicketService(new DatabaseClient());