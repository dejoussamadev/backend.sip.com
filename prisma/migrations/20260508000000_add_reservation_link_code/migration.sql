-- Add short opaque code to reservation_links for URL shortening
ALTER TABLE "reservation_links" ADD COLUMN "code" VARCHAR(16);

-- Backfill any existing rows (defensive — likely empty or all expired)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE "reservation_links"
SET "code" = encode(gen_random_bytes(9), 'base64')
WHERE "code" IS NULL;

ALTER TABLE "reservation_links" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "reservation_links_code_key" ON "reservation_links"("code");
