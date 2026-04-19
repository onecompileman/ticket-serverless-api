import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TicketBoard } from './ticket-board.entity';
import { User } from './user.entity';

@Entity('ticket_board_email_invites')
export class TicketBoardEmailInvite {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @ManyToOne(() => TicketBoard)
    @JoinColumn({ name: 'board_id' })
    board!: TicketBoard;

    @Column({ name: 'invite_email', type: 'varchar' })
    invite_email!: string;

    @Column({ name: 'invite_code', type: 'varchar' })
    invite_code!: string;
}