-- Supabase veritabanınızdaki SQL Editor'e gidip bu kodu çalıştırın.
-- Bu fonksiyon, bir sipariş oluşturulduğunda ürünlerin stok miktarını güvenli bir şekilde azaltır.
-- "Row Level Security" (RLS) ayarlarınızın bu fonksiyona erişime izin verdiğinden emin olun.

CREATE OR REPLACE FUNCTION reduce_stock(product_id_in TEXT, quantity_in INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock - quantity_in
  WHERE id = product_id_in;
END;
$$ LANGUAGE plpgsql;
