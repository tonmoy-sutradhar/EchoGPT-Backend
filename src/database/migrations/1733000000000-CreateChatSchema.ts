// src/database/migrations/1733000000000-CreateChatSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatSchema1733000000000 implements MigrationInterface {
  name = 'CreateChatSchema1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "message_role" AS ENUM ('system', 'user', 'assistant', 'tool');
    `);

    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL DEFAULT 'New conversation',
        "provider_id" uuid,
        "model_id" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversations_provider" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_conversations_model" FOREIGN KEY ("model_id") REFERENCES "provider_models"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_conversations_id_user" UNIQUE ("id", "user_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_conversations_user_updated"
      ON "conversations"("user_id", "updated_at" DESC)
      WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "message_role" NOT NULL,
        "content" text NOT NULL,
        "provider_id" uuid,
        "model_code" varchar(100),
        "prompt_tokens" integer,
        "completion_tokens" integer,
        "total_tokens" integer,
        "latency_ms" integer,
        "is_streamed" boolean NOT NULL DEFAULT false,
        "error_message" text,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_messages_provider" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_chat_messages_conversation_owner"
          FOREIGN KEY ("conversation_id", "user_id")
          REFERENCES "conversations" ("id", "user_id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_chat_messages_conversation_id" ON "chat_messages"("conversation_id", "created_at");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_chat_messages_user_id" ON "chat_messages"("user_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_conversations_updated_at" BEFORE UPDATE ON "conversations"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_role"`);
  }
}
