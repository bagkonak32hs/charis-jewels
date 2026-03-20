
import React, { useState } from 'react';
import { Heart, ShoppingCart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { useCart, useFavorites } from '../store';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  

  const images = product.images ?? [];
  const videos = product.videos ?? [];
  const primaryImage = images[activeImageIndex] ?? images[0] ?? '';
  const isFavoriteProduct = isFavorite(product.id);
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock < 5;
  const isOutOfStock = product.stock === 0;
  const productLink = (product.adminLink ?? '').trim();
  const hasExternalLink = productLink.length > 0;
  const actionLabel = hasExternalLink ? 'ÜRÜNE GİT' : isOutOfStock ? 'STOKTA YOK' : 'SEPETE EKLE';

  const openProductLink = () => {
    if (!productLink) return;
    window.open(productLink, '_blank', 'noopener,noreferrer');
  };

  const handleZoomMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clamp = (value: number) => Math.min(100, Math.max(0, value));
    setZoomPosition({ x: clamp(x), y: clamp(y) });
  };

  const handlePrimaryAction = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (hasExternalLink) {
      openProductLink();
      return;
    }
    addToCart(product);
  };

  

  return (
    <div className="group relative flex flex-col">
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-50 rounded-sm">
        <div onClick={() => setShowDetailModal(true)} className="absolute inset-0 cursor-pointer z-0">
          <img 
            src={primaryImage} 
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
          />
        </div>
        
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10 pointer-events-none">
          {isLowStock && (
            <span className="bg-amber-500 text-white text-[9px] px-2 py-1 tracking-widest font-bold uppercase shadow-sm">DÜŞÜK STOK</span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-800 text-white text-[9px] px-2 py-1 tracking-widest font-bold uppercase shadow-sm">TÜKENDİ</span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
            className={`p-2 rounded-full transition-all duration-300 ${isFavoriteProduct ? 'bg-red-50 text-red-500' : 'bg-white/90 text-gray-500 hover:text-black shadow-sm'}`}
          >
            <Heart size={18} fill={isFavoriteProduct ? 'currentColor' : 'none'} />
          </button>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20 pointer-events-none">
          <button 
            disabled={!hasExternalLink && isOutOfStock}
            onClick={handlePrimaryAction}
            className={`w-full text-white text-[10px] py-4 tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl pointer-events-auto ${!hasExternalLink && isOutOfStock ? 'bg-gray-400' : 'bg-black hover:bg-gray-900'}`}
          >
            <ShoppingCart size={14} /> {actionLabel}
          </button>
        </div>

        {images.length > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-2 pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
              }}
              className="pointer-events-auto w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              aria-label="Önceki fotoğraf"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev + 1) % images.length);
              }}
              className="pointer-events-auto w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              aria-label="Sonraki fotoğraf"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-1">{product.category}</h3>
        <button
          onClick={() => setShowDetailModal(true)}
          className="text-sm font-medium mb-1 hover:underline"
        >
          {product.name}
        </button>
        <p className="text-sm font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}</p>
      </div>

      {showDetailModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 md:p-8 animate-in fade-in"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative md:w-1/2 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                type="button"
                className="absolute top-4 right-4 z-20 bg-white/90 rounded-full p-2 hover:bg-white transition-colors shadow"
              >
                <X size={18} />
              </button>
              <div
                className="relative w-full h-full"
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleZoomMove}
              >
                <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                  style={{
                    opacity: isZooming ? 1 : 0,
                    backgroundImage: `url(${primaryImage})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '200%'
                  }}
                />
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {images.map((image, index) => (
                    <button
                      key={image + index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`w-12 h-12 rounded-sm overflow-hidden border transition-colors ${
                        activeImageIndex === index ? 'border-black' : 'border-white/70'
                      }`}
                    >
                      <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="md:w-1/2 p-8 flex flex-col gap-6 overflow-y-auto">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">{product.category}</p>
                <h2 className="text-3xl serif mb-3">{product.name}</h2>
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
                </p>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
              {videos.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">Videolar</p>
                  <div className="grid grid-cols-1 gap-4">
                    {videos.map((videoUrl, index) => (
                      <video
                        key={`${videoUrl}-${index}`}
                        src={videoUrl}
                        controls
                        className="w-full h-48 rounded-lg border border-gray-100 bg-black"
                      />
                    ))}
                  </div>
                </div>
              )}
              {typeof product.stock !== 'undefined' && (
                <p className="text-[10px] uppercase tracking-widest text-gray-500">
                  {product.stock === 0 ? 'Stokta yok' : `Stok: ${product.stock}`}
                </p>
              )}
              <button
                onClick={handlePrimaryAction}
                disabled={!hasExternalLink && isOutOfStock}
                className={`w-full py-4 text-[10px] tracking-widest uppercase font-bold flex items-center justify-center gap-2 ${
                  !hasExternalLink && isOutOfStock ? 'bg-gray-300 text-gray-600' : 'bg-black text-white hover:bg-gray-900'
                }`}
              >
                <ShoppingCart size={14} /> {actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductCard;
