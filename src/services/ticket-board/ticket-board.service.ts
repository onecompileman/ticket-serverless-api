import { TicketBoard, TicketBoardUser } from '../../entities';
import { DatabaseClient } from '../../libs/db/database-client';
import { BaseDatabaseService } from '../base-database.service';

export class TicketBoardService extends BaseDatabaseService<TicketBoard> {
    protected entityClass: new () => TicketBoard = TicketBoard;

    constructor(databaseClient: DatabaseClient) {
        super(databaseClient);
    }

    async getAllTicketBoards(): Promise<TicketBoard[]> {
        const ticketBoardRepository = await this.getRepositoryAsync();
        return ticketBoardRepository.find();
    }

    async getAllTicketBoardsByUserId(userId: number): Promise<TicketBoard[]> {
        const ticketBoardRepository = await this.getRepositoryAsync();
        return ticketBoardRepository.find({ where: { created_by: { id: userId } }, relations: ['created_by'] });
    }

    async getAllSharedTicketBoardsByUserId(userId: number): Promise<TicketBoard[]> {
        const dataSource = await this.databaseClient.initialize();
        const ticketBoardUserRepository = dataSource.getRepository(TicketBoardUser);

        const ticketBoardUsers = await ticketBoardUserRepository.find({
            where: { user: { id: userId } },
            relations: ['board', 'board.created_by'],
            order: { id: 'ASC' },
        });

        return ticketBoardUsers
            .map((ticketBoardUser) => ticketBoardUser.board)
            .filter((board, index, boards) => boards.findIndex((currentBoard) => currentBoard.id === board.id) === index)
            .filter((board) => board.created_by.id !== userId);
    }

    async addTicketBoard(ticketBoard: TicketBoard): Promise<TicketBoard> {
        const ticketBoardRepository = await this.getRepositoryAsync();
        return ticketBoardRepository.save(ticketBoard);
    }

    async getTicketBoardById(id: number): Promise<TicketBoard | null> {
        const ticketBoardRepository = await this.getRepositoryAsync();
        return ticketBoardRepository.findOne({ where: { id }, relations: ['created_by'] });
    }

    async hasBoardAccess(boardId: number, userId: number): Promise<boolean> {
        const board = await this.getTicketBoardById(boardId);
        if (!board) {
            return false;
        }

        if (board.created_by.id === userId) {
            return true;
        }

        const dataSource = await this.databaseClient.initialize();
        const ticketBoardUserRepository = dataSource.getRepository(TicketBoardUser);
        const boardUser = await ticketBoardUserRepository.findOne({
            where: {
                board: { id: boardId },
                user: { id: userId },
            },
        });

        return Boolean(boardUser);
    }

    async updateTicketBoard(
        id: number,
        payload: Partial<Pick<TicketBoard, 'board_name' | 'board_color' | 'board_description'>>,
    ): Promise<TicketBoard | null> {
        const ticketBoardRepository = await this.getRepositoryAsync();
        const ticketBoard = await ticketBoardRepository.findOne({
            where: { id },
            relations: ['created_by'],
        });

        if (!ticketBoard) {
            return null;
        }

        ticketBoardRepository.merge(ticketBoard, payload);
        return ticketBoardRepository.save(ticketBoard);
    }

    async deleteTicketBoardById(id: number): Promise<void> {
        const ticketBoardRepository = await this.getRepositoryAsync();
        await ticketBoardRepository.delete(id);
    }
}
