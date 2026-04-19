import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

@Entity('ticket_attachments')
export class TicketAttachment {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @ManyToOne(() => Ticket)
    @JoinColumn({ name: 'ticket_id' })
    ticket!: Ticket;

    @Column({ type: 'varchar' })
    file_url!: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    created_by!: User;
}