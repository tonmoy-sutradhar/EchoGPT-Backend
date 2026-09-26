// src/database/migrations/1732600000000-CreateAuthSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSchema1732600000000 implements MigrationInterface {
  name = 'CreateAuthSchema1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext";`);

    await queryRunner.query(`
      CREATE TYPE "user_status" AS ENUM (
        'pending_verification', 'active', 'suspended', 'deleted'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(50) NOT NULL,
        "description" text,
        "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "role_id" uuid NOT NULL,
        "email" citext NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "full_name" varchar(150) NOT NULL,
        "avatar_url" text,
        "status" "user_status" NOT NULL DEFAULT 'pending_verification',
        "email_verified_at" TIMESTAMPTZ,
        "default_provider_id" uuid,
        "last_login_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id"),
        CONSTRAINT "users_deleted_consistent" CHECK (("status" = 'deleted') = ("deleted_at" IS NOT NULL))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_email_active" ON "users" ("email") WHERE "deleted_at" IS NULL;
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_role_id" ON "users"("role_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_status" ON "users"("status") WHERE "deleted_at" IS NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_created_at" ON "users"("created_at");`,
    );

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "refresh_token_hash" varchar(255) NOT NULL,
        "access_token_jti" varchar(64),
        "user_agent" text,
        "ip_address" inet,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_refresh_hash" UNIQUE ("refresh_token_hash"),
        CONSTRAINT "UQ_sessions_jti" UNIQUE ("access_token_jti"),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "sessions_expiry_valid" CHECK ("expires_at" > "created_at"),
        CONSTRAINT "sessions_revoke_valid" CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at") WHERE "revoked_at" IS NULL;`,
    );

    await queryRunner.query(`
      CREATE TABLE "email_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "verified_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_email_verifications_token" UNIQUE ("token_hash"),
        CONSTRAINT "FK_email_verifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_email_verifications_user_id" ON "email_verifications"("user_id");`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const table of ['roles', 'users', 'sessions']) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_updated_at" BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }

    await queryRunner.query(`
      INSERT INTO "roles" (name, description, permissions) VALUES
      ('admin', 'Full system access', '["*"]'::jsonb),
      ('user', 'Standard user access', '["chat:use","search:use","profile:manage"]'::jsonb);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status"`);
  }
}
