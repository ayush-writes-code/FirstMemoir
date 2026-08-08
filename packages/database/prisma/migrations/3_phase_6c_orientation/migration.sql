-- CreateEnum
CREATE TYPE "PrintOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'SQUARE');

-- AlterTable
ALTER TABLE "cart_line_items" ADD COLUMN "orientation" "PrintOrientation";

-- Backfill data
-- Strategy:
-- 1. Try to determine size from ProductOptionValue (if it has metadata->>'width' and 'height')
-- 2. Fallback to UserUpload (canonical image width > height)
UPDATE "cart_line_items" c
SET "orientation" = COALESCE(
  (
    SELECT
      CASE
        WHEN (pov.metadata->>'width')::numeric = (pov.metadata->>'height')::numeric THEN 'SQUARE'::"PrintOrientation"
        WHEN (pov.metadata->>'width')::numeric > (pov.metadata->>'height')::numeric THEN 'LANDSCAPE'::"PrintOrientation"
        ELSE 'PORTRAIT'::"PrintOrientation"
      END
    FROM "cart_line_item_option_values" cliov
    JOIN "product_option_values" pov ON cliov.product_option_value_id = pov.id
    JOIN "product_options" po ON pov.option_id = po.id
    WHERE cliov.cart_line_item_id = c.id
    AND po.name = 'Size'
    AND pov.metadata->>'width' IS NOT NULL
    AND pov.metadata->>'height' IS NOT NULL
    LIMIT 1
  ),
  (
    SELECT
      CASE
        WHEN u.width = u.height THEN 'SQUARE'::"PrintOrientation"
        WHEN u.width > u.height THEN 'LANDSCAPE'::"PrintOrientation"
        ELSE 'PORTRAIT'::"PrintOrientation"
      END
    FROM "user_uploads" u
    WHERE u.id = c.upload_id
  ),
  'PORTRAIT'::"PrintOrientation" -- final fallback just in case
);

-- AlterTable (Make NOT NULL)
ALTER TABLE "cart_line_items" ALTER COLUMN "orientation" SET NOT NULL;
