-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN     "estimatedValueCents" INTEGER,
ADD COLUMN     "statedValueCents" INTEGER;
