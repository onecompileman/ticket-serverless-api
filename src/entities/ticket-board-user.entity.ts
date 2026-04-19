import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TicketBoard } from './ticket-board.entity';
import { User } from './user.entity';

@Entity('ticket_board_users')
export class TicketBoardUser {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @ManyToOne(() => TicketBoard)
    @JoinColumn({ name: 'board_id' })
    board!: TicketBoard;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;
}