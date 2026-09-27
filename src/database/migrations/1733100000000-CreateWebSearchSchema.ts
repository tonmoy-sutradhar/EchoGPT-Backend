// src/database/migrations/1733100000000-CreateWebSearchSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebSearchSchema1733100000000 implements MigrationInterface {
  name = 'CreateWebSearchSchema1733100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    await queryRunner.query(`
      CREATE TABLE "web_searches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "query" text NOT NULL,
        "normalized_query" text NOT NULL,
        "provider_id" uuid,
        "summary" text,
        "result_count" integer NOT NULL DEFAULT 0,
        "results" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "latency_ms" integer,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_web_searches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_web_searches_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_web_searches_provider" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_web_searches_user_created" ON "web_searches"("user_id", "created_at" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_web_searches_normalized" ON "web_searches"("normalized_query");
    `);

    await queryRunner.query(`
      CREATE TABLE "search_results_cache" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cache_key" varchar(64) NOT NULL,
        "query" text NOT NULL,
        "results" jsonb NOT NULL,
        "hit_count" integer NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_results_cache_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_search_results_cache_key" UNIQUE ("cache_key")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_search_cache_expires" ON "search_results_cache"("expires_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "search_suggestions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "suggestion" text NOT NULL,
        "normalized_text" text NOT NULL,
        "popularity_score" integer NOT NULL DEFAULT 1,
        "last_searched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_suggestions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_search_suggestions_text" UNIQUE ("normalized_text")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_search_suggestions_popularity"
      ON "search_suggestions"("popularity_score" DESC, "last_searched_at" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_search_suggestions_trgm"
      ON "search_suggestions" USING gin ("normalized_text" gin_trgm_ops);
    `);

    for (const table of ['search_results_cache', 'search_suggestions']) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_updated_at" BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "search_suggestions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "search_results_cache"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "web_searches"`);
  }
}
