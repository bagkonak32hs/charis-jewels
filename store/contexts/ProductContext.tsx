
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';

// Types moved from AppContext
type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price?: number | null;
  extra_cost?: number | null;
  category: string | null;
  stock: number | null;
  is_new: boolean | null;
  is_sale: boolean | null;
  admin_link?: string | null;
  product_images?: { url: string; sort_order: number | null }[];
  product_videos?: { url: string; sort_order: number | null }[];
};

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<{ error?: string }>;
  updateProduct: (product: Product) => Promise<{ error?: string }>;
  deleteProduct: (productId: string) => Promise<{ error?: string }>;
  fetchProductsByIds: (ids: string[]) => Promise<Product[]>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>; // Needed for stock updates from OrderContext
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const PRODUCT_SELECT =
    'id, name, description, price, cost_price, extra_cost, category, stock, is_new, is_sale, admin_link, product_images(url, sort_order), product_videos(url, sort_order)';

const mapProductRow = (row: ProductRow): Product => {
    const images = (row.product_images ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((img) => img.url);

    const videos = (row.product_videos ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((vid) => vid.url);

    return {
      id: row.id,
      name: row.name,
      price: row.price,
      costPrice: row.cost_price ?? 0,
      extraCost: row.extra_cost ?? 0,
      category: (row.category as Product['category']) ?? 'KOLYE',
      images,
      videos,
      description: row.description ?? '',
      isNew: row.is_new ?? false,
      isSale: row.is_sale ?? false,
      stock: row.stock ?? 0,
      adminLink: row.admin_link ?? undefined
    };
};

const extractStoragePath = (url: string) => {
    const marker = '/storage/v1/object/public/product-media/';
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.slice(index + marker.length);
};

const removeMediaUrls = async (urls: string[]) => {
    const paths = urls
      .map((url) => extractStoragePath(url))
      .filter((path): path is string => Boolean(path));
    if (paths.length === 0) return;
    await supabase.storage.from('product-media').remove(paths);
};

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    let retryTimer: number | undefined;

    const loadProducts = async (attempt = 0) => {
        const fetchProductsViaRest = async () => {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !anonKey) {
                console.error('[ProductContext] Supabase env missing for REST fetch');
                return null;
            }

            const select = PRODUCT_SELECT.replace(/ /g, '');
            const url = `${supabaseUrl}/rest/v1/products?select=${encodeURIComponent(select)}&order=created_at.desc`;
            const response = await fetch(url, {
                headers: {
                    apikey: anonKey,
                    Authorization: `Bearer ${anonKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`REST fetch failed: ${response.status} ${response.statusText}`);
            }

            return (await response.json()) as ProductRow[];
        };

        try {
            const restData = await fetchProductsViaRest();
            if (isMounted && restData) {
                setProducts(restData.map(mapProductRow));
                return;
            }
        } catch (restError) {
            console.error('Supabase REST fetch failed:', restError instanceof Error ? restError.message : String(restError));
        }
        
        try {
            const { data, error } = await supabase
                .from('products')
                .select(PRODUCT_SELECT)
                .order('created_at', { ascending: false });

            if (!isMounted) return;

            if (error || !data) {
                const message = error?.message ?? 'no data';
                if (message.toLowerCase().includes('abort') && attempt < 3) {
                    retryTimer = window.setTimeout(() => loadProducts(attempt + 1), 500);
                } else {
                    console.error('Supabase products fetch failed:', message);
                }
                return;
            }

            setProducts(data.map((row) => mapProductRow(row as ProductRow)));
        } catch (err) {
            if (!isMounted) return;
            const message = err instanceof Error ? err.message : String(err);
            if (message.toLowerCase().includes('abort') && attempt < 3) {
                retryTimer = window.setTimeout(() => loadProducts(attempt + 1), 500);
            } else {
                console.error('Supabase products fetch failed:', message);
            }
        }
    };

    loadProducts();

    const handleOnline = () => loadProducts();
    window.addEventListener('online', handleOnline);

    return () => {
        isMounted = false;
        if (retryTimer) window.clearTimeout(retryTimer);
        window.removeEventListener('online', handleOnline);
    };
  }, []);

  const addProduct = async (product: Product) => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        description: product.description,
        price: product.price,
        cost_price: product.costPrice ?? 0,
        extra_cost: product.extraCost ?? 0,
        category: product.category,
        stock: product.stock ?? 0,
        is_new: product.isNew ?? false,
        is_sale: product.isSale ?? false,
        admin_link: product.adminLink?.trim() || null
      })
      .select('id, name, description, price, cost_price, extra_cost, category, stock, is_new, is_sale, admin_link')
      .single();

    if (error || !data) {
      return { error: error?.message ?? 'Urun kaydedilemedi.' };
    }

    const imagesPayload = (product.images ?? []).map((url, index) => ({
      product_id: data.id,
      url,
      sort_order: index
    }));

    if (imagesPayload.length > 0) {
      const { error: imageError } = await supabase.from('product_images').insert(imagesPayload);
      if (imageError) return { error: imageError.message };
    }

    const videosPayload = (product.videos ?? []).map((url, index) => ({
      product_id: data.id,
      url,
      sort_order: index
    }));

    if (videosPayload.length > 0) {
      const { error: videoError } = await supabase.from('product_videos').insert(videosPayload);
      if (videoError) return { error: videoError.message };
    }

    const mappedProduct = mapProductRow({
      ...data,
      product_images: imagesPayload.map(img => ({ url: img.url, sort_order: img.sort_order })),
      product_videos: videosPayload.map(vid => ({ url: vid.url, sort_order: vid.sort_order }))
    } as ProductRow);

    setProducts(prev => [mappedProduct, ...prev]);
    return {};
  };

  const updateProduct = async (updatedProduct: Product) => {
    const { error } = await supabase
      .from('products')
      .update({
        name: updatedProduct.name,
        description: updatedProduct.description,
        price: updatedProduct.price,
        cost_price: updatedProduct.costPrice ?? 0,
        extra_cost: updatedProduct.extraCost ?? 0,
        category: updatedProduct.category,
        stock: updatedProduct.stock ?? 0,
        is_new: updatedProduct.isNew ?? false,
        is_sale: updatedProduct.isSale ?? false,
        admin_link: updatedProduct.adminLink?.trim() || null
      })
      .eq('id', updatedProduct.id);

    if (error) return { error: error.message };

    await supabase.from('product_images').delete().eq('product_id', updatedProduct.id);
    await supabase.from('product_videos').delete().eq('product_id', updatedProduct.id);

    const imagesPayload = (updatedProduct.images ?? []).map((url, index) => ({
      product_id: updatedProduct.id,
      url,
      sort_order: index
    }));

    if (imagesPayload.length > 0) {
      const { error: imageError } = await supabase.from('product_images').insert(imagesPayload);
      if (imageError) return { error: imageError.message };
    }

    const videosPayload = (updatedProduct.videos ?? []).map((url, index) => ({
      product_id: updatedProduct.id,
      url,
      sort_order: index
    }));

    if (videosPayload.length > 0) {
      const { error: videoError } = await supabase.from('product_videos').insert(videosPayload);
      if (videoError) return { error: videoError.message };
    }

    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    return {};
  };

  const deleteProduct = async (productId: string) => {
    const existing = products.find((product) => product.id === productId);
    await removeMediaUrls([...(existing?.images ?? []), ...(existing?.videos ?? [])]);
    
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) return { error: error.message };
    
    setProducts(prev => prev.filter(p => p.id !== productId));
    // Note: We'll need a way to also update cart and favorites. This will be handled
    // by calling their respective context methods from the component layer, or via a shared event bus.
    return {};
  };

  const fetchProductsByIds = async (ids: string[]) => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', ids);
    if (error || !data) {
      console.error('Favorites product fetch failed:', error?.message ?? 'no data');
      return [];
    }
    return data.map((row) => mapProductRow(row as ProductRow));
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, fetchProductsByIds, setProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
