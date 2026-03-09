
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ProductProvider } from './contexts/ProductContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { OrderProvider } from './contexts/OrderContext';

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <FavoritesProvider>
            <OrderProvider>
              {children}
            </OrderProvider>
          </FavoritesProvider>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
};

// Re-export all hooks for easy importing
export { useAuth } from './contexts/AuthContext';
export { useProducts } from './contexts/ProductContext';
export { useCart } from './contexts/CartContext';
export { useFavorites } from './contexts/FavoritesContext';
export { useOrders } from './contexts/OrderContext';
