
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';

interface FavoritesContextType {
  favorites: Product[];
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const mapFavoritesFromIds = (ids: string[], productList: Product[]): Product[] => {
    if (ids.length === 0 || productList.length === 0) return [];
    const map = new Map(productList.map((product) => [product.id, product]));
    return ids.map((id) => map.get(id)).filter((p): p is Product => Boolean(p));
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthReady } = useAuth();
    const { products, fetchProductsByIds } = useProducts();
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [favorites, setFavorites] = useState<Product[]>([]);

    // Load favorite IDs from DB when user logs in
    useEffect(() => {
        if (!isAuthReady) return;
        if (!user) {
            setFavorites([]);
            setFavoriteIds([]);
            return;
        }

        let isMounted = true;
        const loadFavorites = async () => {
            const { data, error } = await supabase
                .from('favorites')
                .select('product_id')
                .eq('user_id', user.id);

            if (error) {
                console.error('Favorites fetch failed:', error.message);
                return;
            }
            if (isMounted && data) {
                const ids = data.map(row => row.product_id).filter((id): id is string => Boolean(id));
                setFavoriteIds(ids);
            }
        };

        loadFavorites();

        return () => { isMounted = false; };
    }, [user]);

    // Map favorite IDs to actual product objects
    useEffect(() => {
        if (favoriteIds.length === 0) {
            setFavorites([]);
            return;
        }

        let isMounted = true;
        const updateFavorites = async () => {
            const mapped = mapFavoritesFromIds(favoriteIds, products);
            if (!isMounted) return;
            setFavorites(mapped);

            const missingIds = favoriteIds.filter(id => !products.some(p => p.id === id));
            if (missingIds.length > 0) {
                const extraProducts = await fetchProductsByIds(missingIds);
                if (isMounted && extraProducts.length > 0) {
                    setFavorites(currentFavorites => {
                        const merged = new Map(currentFavorites.map(p => [p.id, p]));
                        extraProducts.forEach(p => merged.set(p.id, p));
                        return favoriteIds.map(id => merged.get(id)).filter((p): p is Product => Boolean(p));
                    });
                }
            }
        };

        updateFavorites();

        return () => { isMounted = false; };
    }, [favoriteIds, products, fetchProductsByIds]);

    const toggleFavorite = (product: Product) => {
        if (!user) return; // Or redirect to login

        const exists = favoriteIds.includes(product.id);
        const nextIds = exists
            ? favoriteIds.filter((id) => id !== product.id)
            : [...favoriteIds, product.id];
        
        // Optimistic update
        setFavoriteIds(nextIds);

        const writeFavorite = async () => {
            if (exists) {
                await supabase.from('favorites').delete().match({ user_id: user.id, product_id: product.id });
            } else {
                await supabase.from('favorites').insert({ user_id: user.id, product_id: product.id });
            }
        };

        writeFavorite().catch((error) => {
            console.error('Favorites update failed:', error);
            // Revert optimistic update on failure
            setFavoriteIds(favoriteIds);
        });
    };
    
    const isFavorite = (productId: string) => favoriteIds.includes(productId);

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};
