-- AlterTable
ALTER TABLE "cart_line_items" ALTER COLUMN "upload_id" DROP NOT NULL,
ALTER COLUMN "preview_url" DROP NOT NULL,
ALTER COLUMN "orientation" DROP NOT NULL,
ALTER COLUMN "crop_x" DROP NOT NULL,
ALTER COLUMN "crop_y" DROP NOT NULL,
ALTER COLUMN "crop_width" DROP NOT NULL,
ALTER COLUMN "crop_height" DROP NOT NULL,
ALTER COLUMN "crop_aspect_ratio" DROP NOT NULL,
ALTER COLUMN "rotation" DROP NOT NULL,
ALTER COLUMN "zoom" DROP NOT NULL,
ALTER COLUMN "effective_dpi" DROP NOT NULL,
ALTER COLUMN "print_quality_status" DROP NOT NULL,
ALTER COLUMN "dpi_acknowledged" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "upload_id" DROP NOT NULL;
