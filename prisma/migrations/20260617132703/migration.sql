-- AlterEnum
ALTER TYPE "IncidentStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "failure_reason" TEXT;
