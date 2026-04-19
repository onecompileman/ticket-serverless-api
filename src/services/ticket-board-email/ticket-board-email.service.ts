import { TicketBoardEmailInvite } from '../../entities';
import { DatabaseClient } from '../../libs/db/database-client';
import { BaseDatabaseService } from '../base-database.service';

export class TicketBoardEmailService extends BaseDatabaseService<TicketBoardEmailInvite> {
    protected entityClass: new () => TicketBoardEmailInvite = TicketBoardEmailInvite;

    constructor(databaseClient: DatabaseClient) {
        super(databaseClient);
    }

    async addEmailInvite(emailInvite: TicketBoardEmailInvite): Promise<TicketBoardEmailInvite> {
        const emailInviteRepository = await this.getRepositoryAsync();
        return emailInviteRepository.save(emailInvite);
    }

    async getEmailInviteByCode(code: string): Promise<TicketBoardEmailInvite | null> {
        const emailInviteRepository = await this.getRepositoryAsync();
        return emailInviteRepository.findOne({ where: { invite_code: code }, relations: ['board'] });
    }

    async getEmailInviteByBoardIdAndEmail(boardId: number, email: string): Promise<TicketBoardEmailInvite | null> {
        const emailInviteRepository = await this.getRepositoryAsync();
        return emailInviteRepository.findOne({
            where: {
                board: { id: boardId },
                invite_email: email,
            },
        });
    }

    async deleteEmailInviteById(id: number): Promise<void> {
        const emailInviteRepository = await this.getRepositoryAsync();
        await emailInviteRepository.delete(id);
    }
}
