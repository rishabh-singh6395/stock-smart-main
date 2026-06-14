-- Allow all authenticated users to view shopkeeper profiles (for Shop Network)
-- This only exposes shop_name, owner_name, phone, address, pincode for shopkeepers
CREATE POLICY "Authenticated users can view shopkeeper profiles"
ON public.profiles FOR SELECT
USING (role = 'shopkeeper' OR role IS NULL);
