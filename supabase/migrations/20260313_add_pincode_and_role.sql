-- Add pincode and role columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pincode text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text;

-- Optional: ensure role has allowed values (not enforced here)
-- You may want to add a CHECK constraint or a foreign table for roles later.
