import { DatabaseClient } from '../../libs/db/database-client';
import { TicketActivityService } from './ticket-activity.service';

export const ticketActivityService = new TicketActivityService(new DatabaseClient());