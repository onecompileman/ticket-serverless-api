import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('ticket_board')
export class TicketBoard {
    @PrimaryGeneratedColumn({ type: 'int' })
    id!: number;

    @Column({ type: 'varchar', unique: true })
    sys_id!: string;

    @Column({ type: 'varchar', length: 255 })
    board_name!: string;

    @Column({ type: 'varchar', length: 50 })
    board_color!: string;

    @Column({ type: 'varchar', length: 500 })
    board_description!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    created_by!: User;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;
}
