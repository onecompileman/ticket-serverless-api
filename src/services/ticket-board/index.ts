import { DatabaseClient } from "../../libs/db/database-client";
import { TicketBoardService } from "./ticket-board.service";

export const ticketBoardService = new TicketBoardService(new DatabaseClient());