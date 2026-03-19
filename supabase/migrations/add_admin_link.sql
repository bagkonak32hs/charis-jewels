-- Run this in Supabase SQL editor to add admin_link for external product links.
ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_link text;
