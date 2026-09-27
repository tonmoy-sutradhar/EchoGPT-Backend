// src/modules/ai-providers/entities/provider-model.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiProvider } from './ai-provider.entity';

@Entity('provider_models')
export class ProviderModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => AiProvider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: AiProvider;

  @Column({ name: 'model_code', type: 'varchar', length: 100 })
  modelCode!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName!: string;

  @Column({ name: 'context_window', type: 'integer', nullable: true })
  contextWindow?: number | null;

  @Column({ name: 'supports_streaming', type: 'boolean', default: true })
  supportsStreaming!: boolean;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
