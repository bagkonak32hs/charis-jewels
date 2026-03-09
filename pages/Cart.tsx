import React, { useState } from 'react';
import { useCart, useAuth, useOrders } from '../store';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Order } from '../types';

interface CartProps {
  onCheckout: () => void;
  onContinueShopping: () => void;
}

const Cart: React.FC<CartProps> = ({ onCheckout, onContinueShopping }) => {
  const { cart, removeFromCart, updateCartQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();
  const [checkoutError, setCheckoutError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const getItemImage = (item: { images: string[] }) => item.images[0] ?? '';

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 5000 ? 0 : 150;
  const total = subtotal + shipping;

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setCheckoutError('');
    setIsCheckingOut(true);

    if (!user) {
      setCheckoutError('Lutfen once giris yapin.');
      setIsCheckingOut(false);
      return;
    }

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: user.id,
      items: [...cart],
      total,
      status: 'Sipariş Alındı',
      shippingAddress: {
        recipientName: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        district: user.district || '',
        city: user.city || '',
        postalCode: user.postalCode || ''
      },
      createdAt: new Date().toISOString()
    };

    try {
      const timeout = new Promise<{ error: string }>((_, reject) => {
        window.setTimeout(() => reject(new Error('Siparis islemi zaman asimina ugradi.')), 60000);
      });
      const { error } = await Promise.race([addOrder(newOrder), timeout]);
      if (error) {
        setCheckoutError(error);
        return;
      }
      clearCart();
      onCheckout();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCheckoutError(message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-8 py-32 text-center animate-in fade-in">
        <div className="max-w-md mx-auto">
          <ShoppingBag size={64} className="mx-auto text-gray-200 mb-8" />
          <h2 className="text-4xl serif mb-6">Sepetiniz Boş</h2>
          <p className="text-gray-500 font-light mb-10 text-lg">Görünüse göre henüz sepetinize bir ürün eklemediniz. Koleksiyonlarımıza göz atarak başlayabilirsiniz.</p>
          <button
            onClick={onContinueShopping}
            className="bg-black text-white px-12 py-4 text-[10px] tracking-[0.2em] uppercase w-full hover:bg-gray-900 transition-colors">ALIŞVERİŞE BAŞLA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in">
      <h1 className="text-5xl serif mb-16 text-center">Alışveriş Sepeti</h1>
      
      <div className="flex flex-col lg:flex-row gap-16">
        {/* Cart Items */}
        <div className="flex-1 space-y-8">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-6 pb-8 border-b border-gray-100 items-center">
              <div className="w-24 h-32 shrink-0 bg-gray-50 rounded-sm overflow-hidden">
                <img src={getItemImage(item)} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">{item.category}</p>
                <div className="flex justify-between items-end">
                  <div className="flex items-center border border-gray-200 rounded-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-3 text-sm">{item.quantity} Adet</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-bold text-lg">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="w-full lg:w-96">
          <div className="bg-gray-50 p-10 rounded-sm sticky top-40">
            <h3 className="text-xl serif mb-8 pb-4 border-b border-gray-200">Sipariş Özeti</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ara Toplam</span>
                <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Kargo</span>
                <span>{shipping === 0 ? 'Ücretsiz' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(shipping)}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-between">
                <span className="font-bold">Toplam</span>
                <span className="font-bold text-xl">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(total)}</span>
              </div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full bg-black text-white py-5 text-[10px] tracking-[0.2em] uppercase font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-60"
            >
              {isCheckingOut ? 'ISLENIYOR...' : 'GUVENLI ODEME'} <ArrowRight size={14} />
            </button>
            {checkoutError && (
              <p className="mt-4 text-[10px] uppercase tracking-widest text-red-500">{checkoutError}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-4 justify-center grayscale opacity-40">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" alt="Mastercard" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="Paypal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
