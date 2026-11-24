-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deploy_window_minutes" INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS "github_webhook_secret" VARCHAR(255);
