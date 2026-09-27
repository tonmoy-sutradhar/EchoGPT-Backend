// src/database/migrations/1732900000000-CreateAiProviderSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiProviderSchema1732900000000 implements MigrationInterface {
  name = 'CreateAiProviderSchema1732900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ai_provider_name" AS ENUM ('openai', 'anthropic', 'gemini');
    `);
    await queryRunner.query(`
      CREATE TYPE "health_status" AS ENUM ('healthy', 'degraded', 'unhealthy', 'unknown');
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" "ai_provider_name" NOT NULL,
        "display_name" varchar(100) NOT NULL,
        "api_base_url" text NOT NULL,
        "api_key_encrypted" text NOT NULL,
        "api_key_last4" char(4),
        "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "is_default" boolean NOT NULL DEFAULT false,
        "health_status" "health_status" NOT NULL DEFAULT 'unknown',
        "last_health_check_at" TIMESTAMPTZ,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_ai_providers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_providers_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ai_providers_single_default"
      ON "ai_providers" ("is_default")
      WHERE "is_default" = TRUE AND "deleted_at" IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ai_providers_enabled" ON "ai_providers"("is_enabled")
      WHERE "deleted_at" IS NULL;
    `);

    // Close the users <-> ai_providers circular reference
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_users_default_provider"
      FOREIGN KEY ("default_provider_id")
      REFERENCES "ai_providers"("id")
      ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "provider_models" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL,
        "model_code" varchar(100) NOT NULL,
        "display_name" varchar(150) NOT NULL,
        "context_window" integer,
        "supports_streaming" boolean NOT NULL DEFAULT true,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_models_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_provider_models_provider" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_provider_models_code" UNIQUE ("provider_id", "model_code")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "provider_health_checks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL,
        "status" "health_status" NOT NULL,
        "latency_ms" integer,
        "error_message" text,
        "checked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_health_checks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_provider_health_checks_provider" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_health_checks_provider_checked"
      ON "provider_health_checks"("provider_id", "checked_at" DESC);
    `);

    for (const table of ['ai_providers', 'provider_models']) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_updated_at" BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_default_provider"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_health_checks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_models"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_providers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "health_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_provider_name"`);
  }
}
