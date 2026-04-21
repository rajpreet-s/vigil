/*
  Warnings:

  - Made the column `created_at` on table `services` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'WARNING');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'MUTED');

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "created_at" SET NOT NULL;

-- CreateTable
CREATE TABLE "anomalies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'WARNING',
    "metric" VARCHAR(255) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "labels" JSONB NOT NULL DEFAULT '{}',
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correlated_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "root_cause_metric" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correlated_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_anomalies" (
    "incident_id" UUID NOT NULL,
    "anomaly_id" UUID NOT NULL,

    CONSTRAINT "incident_anomalies_pkey" PRIMARY KEY ("incident_id","anomaly_id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correlated_incident_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "root_cause_summary" TEXT NOT NULL,
    "fix_steps" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "llm_fallback" BOOLEAN NOT NULL DEFAULT false,
    "llm_unavailable" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topology" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "upstream_service" VARCHAR(255) NOT NULL,
    "downstream_service" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deploy_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_name" VARCHAR(255) NOT NULL,
    "pr_title" TEXT,
    "branch" VARCHAR(255) NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "commit_sha" VARCHAR(40) NOT NULL,
    "files_changed" JSONB NOT NULL DEFAULT '[]',
    "deployed_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "deploy_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runbooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chroma_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "service_name" VARCHAR(255),
    "file_path" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "runbooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anomalies_service_id_processed_idx" ON "anomalies"("service_id", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "incident_reports_correlated_incident_id_key" ON "incident_reports"("correlated_incident_id");

-- CreateIndex
CREATE INDEX "topology_downstream_service_idx" ON "topology"("downstream_service");

-- CreateIndex
CREATE UNIQUE INDEX "topology_upstream_service_downstream_service_key" ON "topology"("upstream_service", "downstream_service");

-- CreateIndex
CREATE INDEX "deploy_events_service_name_deployed_at_idx" ON "deploy_events"("service_name", "deployed_at");

-- CreateIndex
CREATE UNIQUE INDEX "runbooks_chroma_id_key" ON "runbooks"("chroma_id");

-- CreateIndex
CREATE INDEX "runbooks_service_name_idx" ON "runbooks"("service_name");

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correlated_incidents" ADD CONSTRAINT "correlated_incidents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_anomalies" ADD CONSTRAINT "incident_anomalies_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "correlated_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_anomalies" ADD CONSTRAINT "incident_anomalies_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomalies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_correlated_incident_id_fkey" FOREIGN KEY ("correlated_incident_id") REFERENCES "correlated_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
