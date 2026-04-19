import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';


@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar' })
  sso_id!: string;

  @Column({ type: 'varchar' })
  full_name!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'boolean' })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
