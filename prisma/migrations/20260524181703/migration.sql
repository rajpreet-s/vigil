/*
  Warnings:

  - The values [ACKNOWLEDGED,RESOLVED,MUTED] on the enum `IncidentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `correlated_incidents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `incident_reports` table. If the table is not empty, all the data it contains will be lost.

*/

-- DropForeignKey
ALTER TABLE "anomalies" DROP CONSTRAINT IF EXISTS "anomalies_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "correlated_incidents" DROP CONSTRAINT IF EXISTS "correlated_incidents_service_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_reports" DROP CONSTRAINT IF EXISTS "incident_reports_correlated_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_reports" DROP CONSTRAINT IF EXISTS "incident_reports_service_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "correlated_incidents";

-- DropTable
DROP TABLE IF EXISTS "incident_reports";

-- DropTable
DROP TABLE IF EXISTS "incidents";

-- Drop old Enum Type and recreate it fresh since we are in dev/reset state
DROP TYPE IF EXISTS "IncidentStatus";
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'APPROVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "services_affected" TEXT[],
    "root_cause_metric" JSONB,
    "timeline" JSONB,
    "causal_chain" JSONB,
    "blast_radius" TEXT[],
    "ruled_out" JSONB,
    "root_cause_service" VARCHAR(255),
    "rca_summary" TEXT,
    "fix_steps" JSONB,
    "confidence" TEXT,
    "llm_fallback" BOOLEAN NOT NULL DEFAULT false,
    "llm_unavailable" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_thread_id_key" ON "incidents"("thread_id");

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
