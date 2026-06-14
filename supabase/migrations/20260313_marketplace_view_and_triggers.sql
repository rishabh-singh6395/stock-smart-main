-- Add denormalized shop_pincode to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shop_pincode text;

-- Function to set product.shop_pincode from profiles on insert/update
CREATE OR REPLACE FUNCTION public.set_product_shop_pincode()
RETURNS trigger AS $$
DECLARE
  pincode text;
BEGIN
  SELECT pincode INTO pincode FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  NEW.shop_pincode := pincode;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_product_shop_pincode ON public.products;
CREATE TRIGGER trg_set_product_shop_pincode
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE PROCEDURE public.set_product_shop_pincode();

-- Function to sync products when a profile's pincode changes
CREATE OR REPLACE FUNCTION public.sync_products_on_profile_change()
RETURNS trigger AS $$
BEGIN
  UPDATE public.products SET shop_pincode = NEW.pincode WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_products_on_profile_change ON public.profiles;
CREATE TRIGGER trg_sync_products_on_profile_change
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_products_on_profile_change();

-- Create a view that joins products with seller profile info for easy querying
CREATE OR REPLACE VIEW public.marketplace_listings AS
SELECT
  p.*,
  pr.shop_name,
  pr.phone AS contact_phone,
  pr.owner_name,
  pr.address AS shop_address,
  pr.pincode AS shop_pincode
FROM public.products p
JOIN public.profiles pr ON pr.user_id = p.user_id;

-- Optional: grant select on the view to anon/public role if you want public access
-- GRANT SELECT ON public.marketplace_listings TO anon;
