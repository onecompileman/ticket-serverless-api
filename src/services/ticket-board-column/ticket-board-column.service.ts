import { TicketBoardColumn } from '../../entities';
import { DatabaseClient } from '../../libs/db/database-client';
import { BaseDatabaseService } from '../base-database.service';

export class TicketBoardColumnService extends BaseDatabaseService<TicketBoardColumn> {
    protected entityClass: new () => TicketBoardColumn = TicketBoardColumn;

    constructor(databaseClient: DatabaseClient) {
        super(databaseClient);
    }

    async addTicketBoardColumn(ticketBoardColumn: TicketBoardColumn): Promise<TicketBoardColumn> {
        const ticketBoardColumnRepository = await this.getRepositoryAsync();
        return ticketBoardColumnRepository.save(ticketBoardColumn);
    }

    async getTicketBoardColumnsByBoardId(boardId: number): Promise<TicketBoardColumn[]> {
        const ticketBoardColumnRepository = await this.getRepositoryAsync();
        return ticketBoardColumnRepository.find({
            where: { board: { id: boardId } },
            relations: ['board', 'created_by'],
            order: { sort_order: 'ASC' },
        });
    }

    async getTicketBoardColumnById(id: number): Promise<TicketBoardColumn | null> {
        const ticketBoardColumnRepository = await this.getRepositoryAsync();
        return ticketBoardColumnRepository.findOne({
            where: { id },
            relations: ['board', 'created_by'],
        });
    }

    async updateTicketBoardColumn(
        id: number,
        payload: Partial<Pick<TicketBoardColumn, 'column_name' | 'sort_order' | 'color'>>,
    ): Promise<TicketBoardColumn | null> {
        const ticketBoardColumnRepository = await this.getRepositoryAsync();
        const ticketBoardColumn = await ticketBoardColumnRepository.findOne({
            where: { id },
            relations: ['board', 'created_by'],
        });

        if (!ticketBoardColumn) {
            return null;
        }

        ticketBoardColumnRepository.merge(ticketBoardColumn, payload);
        return ticketBoardColumnRepository.save(ticketBoardColumn);
    }

    async deleteTicketBoardColumnById(id: number): Promise<void> {
        const ticketBoardColumnRepository = await this.getRepositoryAsync();
        await ticketBoardColumnRepository.delete(id);
    }
}