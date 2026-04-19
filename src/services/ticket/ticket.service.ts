import { Ticket, TicketActivity, TicketAttachment, TicketComment, TicketSubtask } from '../../entities';
import { DatabaseClient } from '../../libs/db/database-client';
import { BaseDatabaseService } from '../base-database.service';

type TicketWithSubtasks = Ticket & {
    subtasks: TicketSubtask[];
};

export type TicketSubtaskInput = {
    task: string;
    is_completed?: boolean;
};

export type TicketAttachmentInput = {
    file_url: string;
};

export type TicketAttachmentDto = TicketAttachment & {
    file_name: string;
};

export type TicketWithDetails = Ticket & {
    subtasks: TicketSubtask[];
    attachments: TicketAttachment[] | TicketAttachmentDto[];
    activities: TicketActivity[];
};

export class TicketService extends BaseDatabaseService<Ticket> {
    protected entityClass: new () => Ticket = Ticket;

    constructor(databaseClient: DatabaseClient) {
        super(databaseClient);
    }

    async addTicket(ticket: Ticket): Promise<Ticket> {
        const ticketRepository = await this.getRepositoryAsync();
        return ticketRepository.save(ticket);
    }

    async getTicketsByBoardId(boardId: number): Promise<Ticket[]> {
        const ticketRepository = await this.getRepositoryAsync();
        return ticketRepository.find({
            where: { board: { id: boardId } },
            relations: ['board', 'assigned_user', 'created_by', 'column'],
            order: { sort_order: 'ASC', id: 'ASC' },
        });
    }

    async getTicketsByBoardIdWithSubtasks(boardId: number): Promise<TicketWithSubtasks[]> {
        const [ticketRepository, dataSource] = await Promise.all([this.getRepositoryAsync(), this.databaseClient.initialize()]);
        const [tickets, subtasks] = await Promise.all([
            ticketRepository.find({
                where: { board: { id: boardId } },
                relations: ['board', 'assigned_user', 'created_by', 'column'],
                order: { sort_order: 'ASC', id: 'ASC' },
            }),
            dataSource.getRepository(TicketSubtask).find({
                where: { ticket: { board: { id: boardId } } },
                relations: ['ticket', 'created_by'],
                order: { id: 'ASC' },
            }),
        ]);

        return tickets.map((ticket) => ({
            ...ticket,
            subtasks: subtasks.filter((subtask) => subtask.ticket.id === ticket.id),
        }));
    }

    async getTicketById(id: number): Promise<Ticket | null> {
        const ticketRepository = await this.getRepositoryAsync();
        return ticketRepository.findOne({
            where: { id },
            relations: ['board', 'assigned_user', 'created_by', 'column'],
        });
    }

    async addSubtasks(ticketId: number, userId: number, subtasks: TicketSubtaskInput[]): Promise<TicketSubtask[]> {
        if (!subtasks.length) {
            return [];
        }

        const dataSource = await this.databaseClient.initialize();
        const subtaskRepository = dataSource.getRepository(TicketSubtask);
        const rows = subtasks.map((subtask) =>
            subtaskRepository.create({
                ticket: { id: ticketId },
                task: subtask.task,
                is_completed: subtask.is_completed ?? false,
                created_by: { id: userId },
            }),
        );

        return subtaskRepository.save(rows);
    }

    async addAttachments(ticketId: number, userId: number, attachments: TicketAttachmentInput[]): Promise<TicketAttachment[]> {
        if (!attachments.length) {
            return [];
        }

        const dataSource = await this.databaseClient.initialize();
        const attachmentRepository = dataSource.getRepository(TicketAttachment);
        const rows = attachments.map((attachment) =>
            attachmentRepository.create({
                ticket: { id: ticketId },
                file_url: attachment.file_url,
                created_by: { id: userId },
            }),
        );

        return attachmentRepository.save(rows);
    }

    async getTicketByIdWithDetails(id: number): Promise<TicketWithDetails | null> {
        const [ticketRepository, dataSource] = await Promise.all([this.getRepositoryAsync(), this.databaseClient.initialize()]);
        const ticket = await ticketRepository.findOne({
            where: { id },
            relations: ['board', 'assigned_user', 'created_by', 'column'],
        });

        if (!ticket) {
            return null;
        }

        const [subtasks, attachments, activities] = await Promise.all([
            dataSource.getRepository(TicketSubtask).find({
                where: { ticket: { id } },
                relations: ['ticket', 'created_by'],
                order: { id: 'ASC' },
            }),
            dataSource.getRepository(TicketAttachment).find({
                where: { ticket: { id } },
                relations: ['ticket', 'created_by'],
                order: { id: 'ASC' },
            }),
            dataSource.getRepository(TicketActivity).find({
                where: { ticket: { id } },
                relations: ['ticket', 'user'],
                order: { created_at: 'DESC' },
            }),
        ]);

        return {
            ...ticket,
            subtasks,
            attachments,
            activities,
        };
    }

    async updateTicket(
        id: number,
        payload: Partial<Pick<Ticket, 'title' | 'description' | 'acceptance_criteria' | 'priority' | 'sort_order'>> & {
            assigned_user?: { id: number };
            column?: { id: number };
        },
    ): Promise<Ticket | null> {
        const ticketRepository = await this.getRepositoryAsync();
        const ticket = await ticketRepository.findOne({
            where: { id },
            relations: ['board', 'assigned_user', 'created_by', 'column'],
        });

        if (!ticket) {
            return null;
        }

        ticketRepository.merge(ticket, payload);
        return ticketRepository.save(ticket);
    }

    async deleteTicketById(id: number): Promise<void> {
        const ticketRepository = await this.getRepositoryAsync();
        await ticketRepository.delete(id);
    }

    // --- Attachment ---

    async getAttachmentById(id: number): Promise<TicketAttachment | null> {
        const dataSource = await this.databaseClient.initialize();
        return dataSource.getRepository(TicketAttachment).findOne({
            where: { id },
            relations: ['ticket', 'created_by'],
        });
    }

    async deleteAttachment(id: number): Promise<void> {
        const dataSource = await this.databaseClient.initialize();
        await dataSource.getRepository(TicketAttachment).delete(id);
    }

    // --- Subtask ---

    async getSubtaskById(id: number): Promise<TicketSubtask | null> {
        const dataSource = await this.databaseClient.initialize();
        return dataSource.getRepository(TicketSubtask).findOne({
            where: { id },
            relations: ['ticket', 'created_by'],
        });
    }

    async updateSubtask(id: number, payload: { task?: string; is_completed?: boolean }): Promise<TicketSubtask | null> {
        const dataSource = await this.databaseClient.initialize();
        const subtaskRepository = dataSource.getRepository(TicketSubtask);
        const subtask = await subtaskRepository.findOne({ where: { id }, relations: ['ticket', 'created_by'] });

        if (!subtask) {
            return null;
        }

        subtaskRepository.merge(subtask, payload);
        return subtaskRepository.save(subtask);
    }

    async deleteSubtask(id: number): Promise<void> {
        const dataSource = await this.databaseClient.initialize();
        await dataSource.getRepository(TicketSubtask).delete(id);
    }

    // --- Comment ---

    async addComment(ticketId: number, userId: number, comment: string): Promise<TicketComment> {
        const dataSource = await this.databaseClient.initialize();
        const commentRepository = dataSource.getRepository(TicketComment);
        const row = commentRepository.create({
            ticket: { id: ticketId },
            user: { id: userId },
            comment,
        });
        return commentRepository.save(row);
    }

    async getCommentById(id: number): Promise<TicketComment | null> {
        const dataSource = await this.databaseClient.initialize();
        return dataSource.getRepository(TicketComment).findOne({
            where: { id },
            relations: ['ticket', 'user'],
        });
    }

    async updateComment(id: number, comment: string): Promise<TicketComment | null> {
        const dataSource = await this.databaseClient.initialize();
        const commentRepository = dataSource.getRepository(TicketComment);
        const existing = await commentRepository.findOne({ where: { id }, relations: ['ticket', 'user'] });

        if (!existing) {
            return null;
        }

        existing.comment = comment;
        return commentRepository.save(existing);
    }

    async deleteComment(id: number): Promise<void> {
        const dataSource = await this.databaseClient.initialize();
        await dataSource.getRepository(TicketComment).delete(id);
    }
}