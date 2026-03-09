
import React from 'react';
import { ShoppingBag, User, Heart, Search, Menu, X, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { useCart, useAuth, useFavorites } from '../store';

interface HeaderProps {
  onNavigate: (page: string, params?: any) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { cart } = useCart();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchPanelRef = React.useRef<HTMLFormElement | null>(null);
  const searchButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const mobileSearchButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!isSearchOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchPanelRef.current?.contains(target)) return;
      if (searchButtonRef.current?.contains(target)) return;
      if (mobileSearchButtonRef.current?.contains(target)) return;
      setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSearchOpen]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuery = searchQuery.trim();
    if (!nextQuery) return;
    onNavigate('search', { query: nextQuery });
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="bg-black text-white text-[10px] py-2 text-center tracking-widest uppercase">
        Tüm Alışverişlerde Ücretsiz Kargo ve Lüks Paketleme
      </div>
      
      <div className="container mx-auto px-4 md:px-8 relative">
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <button
              type="button"
              ref={mobileSearchButtonRef}
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="text-gray-500 hover:text-black transition-colors"
              aria-label="Search products"
            >
              <Search size={20} />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              type="button"
              ref={searchButtonRef}
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="text-gray-500 hover:text-black transition-colors"
              aria-label="Search products"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-amber-600 hover:text-amber-700 transition-colors"
            >
              <Sparkles size={16} />
              <span className="hidden lg:inline">Charis Jewels Sihri 🔱</span>
            </button>
          </div>

          <div 
            onClick={() => onNavigate('home')} 
            className="text-3xl font-bold tracking-[0.2em] serif cursor-pointer hover:opacity-80 transition-opacity"
          >
            🔱 CHARİS JEWELS 🔱
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => onNavigate('profile')} 
              className="flex items-center gap-2 hover:text-gray-600 transition-colors"
            >
              <User size={22} />
              <span className="hidden md:inline text-xs uppercase tracking-tighter">Hesabım</span>
            </button>
            <button 
              onClick={() => onNavigate('favorites')} 
              className="relative hover:text-gray-600 transition-colors"
            >
              <Heart size={22} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => onNavigate('cart')} 
              className="relative hover:text-gray-600 transition-colors"
            >
              <ShoppingBag size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            ref={searchPanelRef}
            className="absolute left-0 right-0 top-full z-40 bg-white border-b border-gray-100 shadow-sm px-4 md:px-8 py-4"
          >
            <div className="flex items-center gap-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Urun ara"
                className="flex-1 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
              >
                Kapat
              </button>
            </div>
          </form>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex justify-center items-center pb-4 border-t border-gray-50">
          <ul className="flex gap-10">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <button 
                  onClick={() => onNavigate('category', { category: cat })}
                  className="text-[11px] font-medium tracking-[0.15em] text-gray-800 hover:text-black hover:scale-105 transition-all py-2 border-b-2 border-transparent hover:border-black"
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 py-4 animate-in fade-in slide-in-from-top">
            <ul className="flex flex-col">
              <li className="border-b border-gray-50 bg-amber-50">
                <div
                  className="w-full text-left px-6 py-4 text-xs font-bold tracking-widest text-amber-700 flex items-center gap-2"
                >
                  <Sparkles size={16} /> CHARİS JEWELS SİHRİ (VİDEO)
                </div>
              </li>
              {CATEGORIES.map((cat) => (
                <li key={cat} className="border-b border-gray-50 last:border-0">
                  <button 
                    onClick={() => {
                      onNavigate('category', { category: cat });
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-6 py-4 text-xs font-medium tracking-widest text-gray-800"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
