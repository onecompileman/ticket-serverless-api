import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TicketBoard } from './ticket-board.entity';
import { TicketBoardColumn } from './ticket-board-column.entity';
import { User } from './user.entity';

@Entity('tickets')
export class Ticket {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @ManyToOne(() => TicketBoard)
    @JoinColumn({ name: 'board_id' })
    board!: TicketBoard;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'assigned_user_id' })
    assigned_user!: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    created_by!: User;

    @Column({ type: 'varchar', unique: true })
    sys_id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'text' })
    acceptance_criteria!: string;

    @Column({ type: 'int' })
    priority!: number;

    @Column({ type: 'int' })
    sort_order!: number;

    @ManyToOne(() => TicketBoardColumn)
    @JoinColumn({ name: 'column_id' })
    column!: TicketBoardColumn;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;
}