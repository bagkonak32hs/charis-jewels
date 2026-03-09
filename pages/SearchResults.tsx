import React from 'react';
import { useProducts } from '../store';
import ProductCard from '../components/ProductCard';

interface SearchResultsProps {
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query }) => {
  const { products } = useProducts();
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? products.filter((product) => {
        const fields = [
          product.name,
          product.category,
          product.description
        ].filter(Boolean);
        return fields.some((field) => field.toLowerCase().includes(normalizedQuery));
      })
    : [];

  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in">
      <div className="flex flex-col items-center mb-16 text-center">
        <h1 className="text-5xl serif mb-4">Arama</h1>
        <p className="text-gray-500 text-xs tracking-[0.3em] uppercase">
          {normalizedQuery ? `Aranan: ${query}` : 'Arama terimi girin'}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-400 text-lg font-light italic">Sonuc bulunamadi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
