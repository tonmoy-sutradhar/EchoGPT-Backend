// src/modules/chat/entities/chat-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AiProvider } from '../../ai-providers/entities/ai-provider.entity';
import { MessageRole } from '../../../common/enums/message-role.enum';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id' })
  conversationId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: MessageRole })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId?: string | null;

  @ManyToOne(() => AiProvider, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider?: AiProvider;

  @Column({ name: 'model_code', type: 'varchar', length: 100, nullable: true })
  modelCode?: string | null;

  @Column({ name: 'prompt_tokens', type: 'integer', nullable: true })
  promptTokens?: number | null;

  @Column({ name: 'completion_tokens', type: 'integer', nullable: true })
  completionTokens?: number | null;

  @Column({ name: 'total_tokens', type: 'integer', nullable: true })
  totalTokens?: number | null;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs?: number | null;

  @Column({ name: 'is_streamed', type: 'boolean', default: false })
  isStreamed!: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
