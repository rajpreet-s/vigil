/*
  Warnings:

  - A unique constraint covering the columns `[invite_code]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS      "gemini_api_key" TEXT,
ADD COLUMN IF NOT EXISTS    "gemini_model" VARCHAR(100) DEFAULT 'gemini-3.8-flash',
ADD COLUMN IF NOT EXISTS     "invite_code" VARCHAR(64),
ADD COLUMN IF NOT EXISTS     "slack_webhook_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_invite_code_key" ON "organizations"("invite_code");
