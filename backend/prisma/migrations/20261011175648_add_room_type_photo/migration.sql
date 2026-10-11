-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;
