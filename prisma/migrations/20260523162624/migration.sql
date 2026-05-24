/*
  Warnings:

  - You are about to drop the column `labels` on the `anomalies` table. All the data in the column will be lost.
  - You are about to drop the column `metric` on the `anomalies` table. All the data in the column will be lost.
  - You are about to drop the column `service_id` on the `anomalies` table. All the data in the column will be lost.
  - You are about to drop the column `threshold` on the `anomalies` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `anomalies` table. All the data in the column will be lost.
  - You are about to drop the `incident_anomalies` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[metric_name,service_name,detected_at]` on the table `anomalies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `metric_name` to the `anomalies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raw_payload` to the `anomalies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_name` to the `anomalies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Severity" ADD VALUE 'INFO';

-- DropForeignKey
ALTER TABLE "anomalies" DROP CONSTRAINT "anomalies_service_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_anomalies" DROP CONSTRAINT "incident_anomalies_anomaly_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_anomalies" DROP CONSTRAINT "incident_anomalies_incident_id_fkey";

-- DropIndex
DROP INDEX "anomalies_service_id_processed_idx";

-- AlterTable
ALTER TABLE "anomalies" DROP COLUMN "labels",
DROP COLUMN "metric",
DROP COLUMN "service_id",
DROP COLUMN "threshold",
DROP COLUMN "value",
ADD COLUMN     "incident_id" UUID,
ADD COLUMN     "metric_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "raw_payload" JSONB NOT NULL,
ADD COLUMN     "service_name" VARCHAR(255) NOT NULL,
ALTER COLUMN "detected_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "display_name" VARCHAR(255);

-- DropTable
DROP TABLE "incident_anomalies";

-- CreateIndex
CREATE INDEX "anomalies_processed_idx" ON "anomalies"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "anomalies_metric_name_service_name_detected_at_key" ON "anomalies"("metric_name", "service_name", "detected_at");

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_service_name_fkey" FOREIGN KEY ("service_name") REFERENCES "services"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "correlated_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
