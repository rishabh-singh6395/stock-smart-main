-- Backfill existing products.shop_pincode from profiles.pincode where missing
UPDATE public.products p
SET shop_pincode = pr.pincode
FROM public.profiles pr
WHERE p.user_id = pr.user_id
  AND (p.shop_pincode IS NULL OR p.shop_pincode = '');

-- Function to run backfill via RPC
CREATE OR REPLACE FUNCTION public.sync_products_backfill()
RETURNS void AS $$
BEGIN
  UPDATE public.products p
  SET shop_pincode = pr.pincode
  FROM public.profiles pr
  WHERE p.user_id = pr.user_id
    AND (p.shop_pincode IS NULL OR p.shop_pincode = '');
END;
$$ LANGUAGE plpgsql;

-- Recreate the marketplace view to only expose listings with a shop_pincode
CREATE OR REPLACE VIEW public.marketplace_listings AS
SELECT
  p.*,
  pr.shop_name,
  pr.phone AS contact_phone,
  pr.owner_name,
  pr.address AS shop_address,
  pr.pincode AS shop_pincode
FROM public.products p
JOIN public.profiles pr ON pr.user_id = p.user_id
WHERE p.shop_pincode IS NOT NULL AND p.shop_pincode <> '';
