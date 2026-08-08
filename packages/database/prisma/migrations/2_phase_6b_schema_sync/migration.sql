-- CreateEnum
CREATE TYPE "PrintQualityStatus" AS ENUM ('EXCELLENT', 'GOOD', 'ACCEPTABLE', 'LOW_QUALITY', 'NOT_RECOMMENDED');

-- CreateEnum
CREATE TYPE "CartLineItemStatus" AS ENUM ('PENDING', 'VALIDATED', 'STALE', 'CHECKED_OUT', 'CONVERTED');

-- AlterEnum
BEGIN;
CREATE TYPE "UploadStatus_new" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'LINKED_TO_CART', 'FULFILLED', 'ARCHIVED');
ALTER TABLE "user_uploads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "user_uploads" ALTER COLUMN "status" TYPE "UploadStatus_new" USING ("status"::text::"UploadStatus_new");
ALTER TYPE "UploadStatus" RENAME TO "UploadStatus_old";
ALTER TYPE "UploadStatus_new" RENAME TO "UploadStatus";
DROP TYPE "UploadStatus_old";
ALTER TABLE "user_uploads" ALTER COLUMN "status" SET DEFAULT 'UPLOADING';
COMMIT;

-- DropForeignKey
ALTER TABLE "user_uploads" DROP CONSTRAINT "user_uploads_user_id_fkey";

-- AlterTable
ALTER TABLE "user_uploads" DROP COLUMN "dpi",
ADD COLUMN     "preview_r2_key" TEXT,
ADD COLUMN     "session_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_line_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "CartLineItemStatus" NOT NULL DEFAULT 'PENDING',
    "upload_id" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "crop_x" DOUBLE PRECISION NOT NULL,
    "crop_y" DOUBLE PRECISION NOT NULL,
    "crop_width" DOUBLE PRECISION NOT NULL,
    "crop_height" DOUBLE PRECISION NOT NULL,
    "crop_aspect_ratio" TEXT NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zoom" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "effective_dpi" INTEGER NOT NULL,
    "print_quality_status" "PrintQualityStatus" NOT NULL,
    "dpi_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "pricing_version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_line_item_option_values" (
    "cart_line_item_id" TEXT NOT NULL,
    "product_option_value_id" TEXT NOT NULL,

    CONSTRAINT "cart_line_item_option_values_pkey" PRIMARY KEY ("cart_line_item_id","product_option_value_id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pricing_version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_session_id_key" ON "carts"("session_id");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "cart_line_items_cart_id_idx" ON "cart_line_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_line_items_upload_id_idx" ON "cart_line_items"("upload_id");

-- CreateIndex
CREATE INDEX "user_uploads_session_id_idx" ON "user_uploads"("session_id");

-- AddForeignKey
ALTER TABLE "user_uploads" ADD CONSTRAINT "user_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_items" ADD CONSTRAINT "cart_line_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_items" ADD CONSTRAINT "cart_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_items" ADD CONSTRAINT "cart_line_items_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "user_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_item_option_values" ADD CONSTRAINT "cart_line_item_option_values_cart_line_item_id_fkey" FOREIGN KEY ("cart_line_item_id") REFERENCES "cart_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_item_option_values" ADD CONSTRAINT "cart_line_item_option_values_product_option_value_id_fkey" FOREIGN KEY ("product_option_value_id") REFERENCES "product_option_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

