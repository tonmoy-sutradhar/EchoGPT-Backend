// src/database/migrations/1732800000000-CreateSubscriptionSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionSchema1732800000000 implements MigrationInterface {
  name = 'CreateSubscriptionSchema1732800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "plan_tier" AS ENUM ('free', 'premium');`,
    );
    await queryRunner.query(
      `CREATE TYPE "billing_interval" AS ENUM ('monthly', 'yearly', 'lifetime');`,
    );
    await queryRunner.query(`
      CREATE TYPE "subscription_status" AS ENUM (
        'active', 'canceled', 'past_due', 'expired', 'trialing'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_stripe_customer_id" ON "users"("stripe_customer_id")
        WHERE "stripe_customer_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "name" varchar(100) NOT NULL,
        "tier" "plan_tier" NOT NULL,
        "billing_interval" "billing_interval" NOT NULL,
        "price_cents" integer NOT NULL DEFAULT 0,
        "currency" char(3) NOT NULL DEFAULT 'USD',
        "chat_request_limit" integer NOT NULL,
        "search_request_limit" integer NOT NULL,
        "max_tokens_per_request" integer NOT NULL DEFAULT 4096,
        "stripe_price_id" varchar(255),
        "features" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plans_code" UNIQUE ("code"),
        CONSTRAINT "chk_plans_price" CHECK ("price_cents" >= 0),
        CONSTRAINT "chk_plans_chat_limit" CHECK ("chat_request_limit" >= -1),
        CONSTRAINT "chk_plans_search_limit" CHECK ("search_request_limit" >= -1)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "previous_plan_id" uuid,
        "status" "subscription_status" NOT NULL DEFAULT 'active',
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "canceled_at" TIMESTAMPTZ,
        "auto_renew" boolean NOT NULL DEFAULT true,
        "stripe_subscription_id" varchar(255),
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_stripe_id" UNIQUE ("stripe_subscription_id"),
        CONSTRAINT "FK_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscriptions_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id"),
        CONSTRAINT "FK_subscriptions_previous_plan" FOREIGN KEY ("previous_plan_id") REFERENCES "plans"("id"),
        CONSTRAINT "chk_subscriptions_period" CHECK ("ends_at" > "starts_at")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_subscriptions_one_active_per_user"
      ON "subscriptions" ("user_id")
      WHERE "status" IN ('active', 'trialing');
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions"("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_subscriptions_plan_id" ON "subscriptions"("plan_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");`,
    );

    await queryRunner.query(`
      CREATE TABLE "usage_counters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "subscription_id" uuid NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "chat_requests_used" integer NOT NULL DEFAULT 0,
        "search_requests_used" integer NOT NULL DEFAULT 0,
        "tokens_used" bigint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usage_counters_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_usage_counters_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_usage_counters_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_usage_counters_user_period" UNIQUE ("user_id", "period_start", "period_end"),
        CONSTRAINT "chk_usage_counters_period" CHECK ("period_end" >= "period_start")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_usage_counters_subscription_id" ON "usage_counters"("subscription_id");`,
    );

    for (const table of ['plans', 'subscriptions', 'usage_counters']) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_updated_at" BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }

    await queryRunner.query(`
      INSERT INTO "plans" (
        code, name, tier, billing_interval, price_cents,
        chat_request_limit, search_request_limit, max_tokens_per_request, features
      ) VALUES
      ('free', 'Free Plan', 'free', 'monthly', 0, 50, 20, 2048,
        '{"streaming": false, "priority": false}'::jsonb),
      ('premium_monthly', 'Premium Monthly', 'premium', 'monthly', 1999, -1, -1, 8192,
        '{"streaming": true, "priority": true}'::jsonb),
      ('premium_yearly', 'Premium Yearly', 'premium', 'yearly', 19999, -1, -1, 8192,
        '{"streaming": true, "priority": true}'::jsonb);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "usage_counters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plans"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_interval"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "plan_tier"`);
  }
}
