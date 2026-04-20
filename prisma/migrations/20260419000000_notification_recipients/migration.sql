-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_userId_notificationId_key" ON "notification_recipients"("userId", "notificationId");

-- CreateIndex
CREATE INDEX "notification_recipients_userId_isRead_idx" ON "notification_recipients"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create recipient rows for active admins on all existing notifications
-- Each admin inherits the isRead state from the old shared column
INSERT INTO "notification_recipients" ("userId", "notificationId", "isRead", "createdAt")
SELECT u.id, n.id, n."isRead", n."createdAt"
FROM "notifications" n
CROSS JOIN "users" u
WHERE u.role = 'ADMIN' AND u."isActive" = true
ON CONFLICT ("userId", "notificationId") DO NOTHING;

-- AlterTable: remove the now-redundant shared isRead column
ALTER TABLE "notifications" DROP COLUMN "isRead";
