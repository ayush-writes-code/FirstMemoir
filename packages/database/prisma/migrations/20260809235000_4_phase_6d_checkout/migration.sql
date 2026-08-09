-- CreateEnum
CREATE TYPE "UploadRetentionStatus" AS ENUM ('UNATTACHED', 'CART_ATTACHED', 'CHECKOUT_LOCKED', 'ORDERED_RETAINED', 'FULFILLED', 'ELIGIBLE_FOR_RETENTION_POLICY');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKOUT_STARTED', 'CONVERTED');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE 'AUTHORIZED';

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "upload_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cart_id" TEXT NOT NULL,
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "discount_amount" DECIMAL(65,30),
ADD COLUMN     "session_id" TEXT,
ADD COLUMN     "shipping_fee" DECIMAL(65,30),
ADD COLUMN     "subtotal_amount" DECIMAL(65,30),
ADD COLUMN     "tax_amount" DECIMAL(65,30),
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_uploads" ADD COLUMN     "retention_status" "UploadRetentionStatus" NOT NULL DEFAULT 'UNATTACHED';

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processing_status" TEXT NOT NULL DEFAULT 'PENDING',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "order_items_upload_id_idx" ON "order_items"("upload_id");

-- CreateIndex
CREATE INDEX "orders_session_id_idx" ON "orders"("session_id");

-- CreateIndex
CREATE INDEX "orders_cart_id_idx" ON "orders"("cart_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "user_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create partial unique index to enforce strict 1:1 concurrency rule for PENDING orders
CREATE UNIQUE INDEX "orders_one_pending_per_cart"
ON "orders" ("cart_id")
WHERE "status" = 'PENDING';

-- Enforce guest contact invariant at the database level
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_contact_check"
CHECK (
  "user_id" IS NOT NULL
  OR (
    "customer_email" IS NOT NULL
    AND "customer_phone" IS NOT NULL
  )
);
