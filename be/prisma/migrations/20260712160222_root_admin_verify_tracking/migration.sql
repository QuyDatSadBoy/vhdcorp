-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isRoot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetCodeHash" TEXT,
ADD COLUMN     "verifyCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verifyCodeHash" TEXT;

-- CreateTable
CREATE TABLE "view_events" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "view_events_productId_idx" ON "view_events"("productId");

-- CreateIndex
CREATE INDEX "view_events_sessionId_idx" ON "view_events"("sessionId");

-- CreateIndex
CREATE INDEX "view_events_createdAt_idx" ON "view_events"("createdAt");

-- AddForeignKey
ALTER TABLE "view_events" ADD CONSTRAINT "view_events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
