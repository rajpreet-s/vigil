/*
  Warnings:

  - You are about to drop the column `priority` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "services" DROP COLUMN "priority",
DROP COLUMN "rules";

-- AlterTable
ALTER TABLE "topology" ADD COLUMN     "display_name" VARCHAR(255);
