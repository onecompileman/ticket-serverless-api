import { TicketActivity } from '../../entities';
import { DatabaseClient } from '../../libs/db/database-client';
import { BaseDatabaseService } from '../base-database.service';

export class TicketActivityService extends BaseDatabaseService<TicketActivity> {
    protected entityClass: new () => TicketActivity = TicketActivity;

    constructor(databaseClient: DatabaseClient) {
        super(databaseClient);
    }

    async createActivity(ticketId: number, userId: number, log: string): Promise<TicketActivity> {
        const ticketActivityRepository = await this.getRepositoryAsync();

        return ticketActivityRepository.save(
            ticketActivityRepository.create({
                ticket: { id: ticketId },
                user: { id: userId },
                log,
            }),
        );
    }
}