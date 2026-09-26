// src/database/migrations/1732700000000-CreatePasswordResets.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResets1732700000000 implements MigrationInterface {
  name = 'CreatePasswordResets1732700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_resets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_resets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_resets_token" UNIQUE ("token_hash"),
        CONSTRAINT "FK_password_resets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_password_resets_user_id" ON "password_resets"("user_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_resets"`);
  }
}
