import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TicketBoard } from './ticket-board.entity';
import { User } from './user.entity';

@Entity('ticket_board_columns')
export class TicketBoardColumn {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @ManyToOne(() => TicketBoard)
    @JoinColumn({ name: 'board_id' })
    board!: TicketBoard;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    created_by!: User;

    @Column({ type: 'varchar' })
    column_name!: string;

    @Column({ type: 'int' })
    sort_order!: number;

    @Column({ type: 'varchar', length: 50 })
    color!: string;
}
