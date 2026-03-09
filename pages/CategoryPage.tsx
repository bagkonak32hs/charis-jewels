import React, { useEffect, useMemo, useState } from 'react';
import { useProducts } from '../store';
import { CATEGORIES } from '../constants';
import { Category } from '../types';
import ProductCard from '../components/ProductCard';
import { Filter, ChevronDown } from 'lucide-react';

interface CategoryPageProps {
  category: Category;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ category }) => {
  const { products } = useProducts();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>(category);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortOption, setSortOption] = useState<'price-asc' | 'price-desc' | 'new' | 'popular'>('new');

  useEffect(() => {
    setSelectedCategory(category);
  }, [category]);

  const filtered = useMemo(() => {
    const minValue = Number(priceMin);
    const maxValue = Number(priceMax);

    return products.filter((product) => {
      if (selectedCategory !== 'ALL' && product.category !== selectedCategory) return false;
      if (priceMin.trim() !== '' && Number.isFinite(minValue) && product.price < minValue) return false;
      if (priceMax.trim() !== '' && Number.isFinite(maxValue) && product.price > maxValue) return false;
      if (inStockOnly && (product.stock ?? 0) <= 0) return false;
      if (onSaleOnly && !product.isSale) return false;
      return true;
    });
  }, [products, selectedCategory, priceMin, priceMax, inStockOnly, onSaleOnly]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    const getStock = (product: typeof items[number]) => product.stock ?? 0;

    switch (sortOption) {
      case 'price-asc':
        return items.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return items.sort((a, b) => b.price - a.price);
      case 'popular':
        return items.sort((a, b) => getStock(b) - getStock(a) || b.price - a.price);
      case 'new':
      default:
        return items.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || b.price - a.price);
    }
  }, [filtered, sortOption]);

  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in">
      <div className="flex flex-col items-center mb-16">
        <h1 className="text-5xl serif mb-4">{category}</h1>
        <p className="text-gray-500 text-xs tracking-[0.3em] uppercase">Zarafetin En Güzel Hali</p>
      </div>

      <div className="flex justify-between items-center mb-6 py-6 border-y border-gray-100">
        <div className="flex items-center gap-8">
          <button
            className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-gray-700 hover:text-black transition-colors"
            onClick={() => setIsFilterOpen((prev) => !prev)}
          >
            <Filter size={16} /> Filtrele
          </button>
        </div>
        <div className="flex items-center gap-6">
          <p className="text-[10px] tracking-widest uppercase text-gray-400 hidden sm:block">{sorted.length} ÇorÇ¬n Bulundu</p>
          <div className="relative">
            <button
              className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-gray-700 hover:text-black transition-colors"
              onClick={() => setIsSortOpen((prev) => !prev)}
            >
              SŽñrala <ChevronDown size={14} />
            </button>
            {isSortOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-gray-100 shadow-lg rounded-xl p-2 z-20">
                {[
                  { id: 'new', label: 'Yeniler' },
                  { id: 'popular', label: 'PopÇ¬ler' },
                  { id: 'price-asc', label: 'Fiyat (Artan)' },
                  { id: 'price-desc', label: 'Fiyat (Azalan)' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSortOption(option.id as typeof sortOption);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[10px] uppercase tracking-widest rounded-lg transition-colors ${
                      sortOption === option.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isFilterOpen && (
        <div className="mb-12 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Kategori</label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as Category | 'ALL')}
                className="w-full border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
              >
                <option value="ALL">TÇ¬mÇ¬</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Fiyat AralŽñŠñ (Min)</label>
              <input
                type="number"
                min="0"
                value={priceMin}
                onChange={(event) => setPriceMin(event.target.value)}
                className="w-full border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Fiyat AralŽñŠñ (Max)</label>
              <input
                type="number"
                min="0"
                value={priceMax}
                onChange={(event) => setPriceMax(event.target.value)}
                className="w-full border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">DiŠÿer Filtreler</label>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                />
                Stokta Olanlar
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={onSaleOnly}
                  onChange={(event) => setOnSaleOnly(event.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                />
                Žøndirimdekiler
              </label>
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-400 text-lg font-light italic">Bu kategoride henÇ¬z Ç¬rÇ¬n bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {sorted.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
