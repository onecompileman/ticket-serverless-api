import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

@Entity('ticket_activities')
export class TicketActivity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @ManyToOne(() => Ticket)
    @JoinColumn({ name: 'ticket_id' })
    ticket!: Ticket;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar' })
    log!: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;
}