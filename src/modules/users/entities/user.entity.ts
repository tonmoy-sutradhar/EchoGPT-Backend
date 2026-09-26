// src/modules/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../roles/entities/role.entity';
import { Session } from '../../auth/entities/session.entity';
import { UserStatus } from '../../../common/enums/user-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_id' })
  roleId!: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ type: 'citext' })
  email!: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status!: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'default_provider_id', type: 'uuid', nullable: true })
  defaultProviderId?: string | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripeCustomerId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => Session, (session) => session.user)
  sessions?: Session[];
}

// // src/modules/users/entities/user.entity.ts
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';
// import { Exclude } from 'class-transformer';
// import { Role } from '../../../common/enums/role.enum';

// @Entity('users')
// export class User {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ type: 'varchar', length: 100 })
//   name!: string;

//   @Column({ type: 'varchar', length: 255, unique: true })
//   email!: string;

//   @Exclude()
//   @Column({ type: 'varchar', length: 255 })
//   password!: string;

//   @Column({ type: 'enum', enum: Role, default: Role.USER })
//   role!: Role;

//   @Column({ name: 'is_active', type: 'boolean', default: true })
//   isActive!: boolean;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;
// }
