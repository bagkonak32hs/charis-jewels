
import React, { useState, useRef, useEffect } from 'react';
import { Heart, ShoppingCart, Camera, X, Maximize2, RefreshCw, Camera as CameraIcon, Plus, Minus, Move, Download, Share2, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useCart, useFavorites } from '../store';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [showTryOn, setShowTryOn] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // AR Calibration State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transparentImageSrc, setTransparentImageSrc] = useState<string | null>(null);

  const images = product.images ?? [];
  const videos = product.videos ?? [];
  const primaryImage = images[activeImageIndex] ?? images[0] ?? '';
  const isFavoriteProduct = isFavorite(product.id);
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock < 5;
  const isOutOfStock = product.stock === 0;
  const productLink = (product.adminLink ?? '').trim();
  const hasExternalLink = productLink.length > 0;
  const actionLabel = hasExternalLink ? 'ÜRÜNE GİT' : isOutOfStock ? 'STOKTA YOK' : 'SEPETE EKLE';
  const tryOnActionLabel = hasExternalLink ? 'ÜRÜNE GİT' : 'SEPETE EKLE';

  const openProductLink = () => {
    if (!productLink) return;
    window.open(productLink, '_blank', 'noopener,noreferrer');
  };

  const handlePrimaryAction = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (hasExternalLink) {
      openProductLink();
      return;
    }
    addToCart(product);
  };

  const handleTryOnAction = () => {
    if (hasExternalLink) {
      openProductLink();
      return;
    }
    addToCart(product);
    setShowTryOn(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCaptured(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Kamera erişim hatası:", err);
      setCameraError("Kamera erişimi reddedildi. Lütfen tarayıcı ayarlarınızdan izin verin.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStartPos.current.x,
      y: clientY - dragStartPos.current.y
    });
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw flipped video (mirror effect)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset

        // Draw the jewelry on top
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = transparentImageSrc || primaryImage;
        img.onload = () => {
          const jewelrySize = 300 * scale;
          // Adjustment for mirror effect in drawing
          const drawX = (canvas.width / 2) + position.x - (jewelrySize / 2);
          const drawY = (canvas.height / 2) + position.y - (jewelrySize / 2);

          ctx.shadowBlur = 20;
          ctx.shadowColor = "rgba(255,255,255,0.7)";
          ctx.drawImage(img, drawX, drawY, jewelrySize, jewelrySize);
          
          // Add Branding to shot
          ctx.fillStyle = "white";
          ctx.font = "bold 20px Montserrat";
          ctx.fillText("CHARİS JEWELS", 40, canvas.height - 40);

          setIsCaptured(canvas.toDataURL('image/png'));
        };
      }
    }
  };

  useEffect(() => {
    if (showTryOn) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showTryOn]);

  useEffect(() => {
    if (!showTryOn || !primaryImage) {
      setTransparentImageSrc(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement('canvas');
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      c.width = w;
      c.height = h;
      const cx = c.getContext('2d');
      if (!cx) return;
      cx.drawImage(img, 0, 0);
      const imgData = cx.getImageData(0, 0, w, h);
      const d = imgData.data;

      const cornerSamples: number[][] = [];
      const sLen = Math.min(20, w, h);
      for (let s = 0; s < sLen; s++) {
        const ex = Math.floor((s / sLen) * w);
        const ey = Math.floor((s / sLen) * h);
        const positions = [
          [0, s], [s, 0], [w - 1, s], [s, h - 1],
          [ex, 0], [ex, h - 1], [0, ey], [w - 1, ey]
        ];
        for (const [px, py] of positions) {
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const ci = (py * w + px) * 4;
            cornerSamples.push([d[ci], d[ci + 1], d[ci + 2]]);
          }
        }
      }

      let bgR = 255, bgG = 255, bgB = 255;
      if (cornerSamples.length > 0) {
        let sr = 0, sg = 0, sb = 0;
        for (const p of cornerSamples) { sr += p[0]; sg += p[1]; sb += p[2]; }
        bgR = Math.round(sr / cornerSamples.length);
        bgG = Math.round(sg / cornerSamples.length);
        bgB = Math.round(sb / cornerSamples.length);
      }

      const tolerance = 35;
      const softEdge = 15;
      const visited = new Uint8Array(w * h);
      const bgMask = new Uint8Array(w * h);
      const stack: number[] = [];

      for (let x = 0; x < w; x++) {
        stack.push(x, 0, x, h - 1);
      }
      for (let y = 1; y < h - 1; y++) {
        stack.push(0, y, w - 1, y);
      }

      while (stack.length > 0) {
        const sy = stack.pop()!;
        const sx = stack.pop()!;
        const pi = sy * w + sx;
        if (sx < 0 || sx >= w || sy < 0 || sy >= h || visited[pi]) continue;
        visited[pi] = 1;
        const ii = pi * 4;
        const dr = Math.abs(d[ii] - bgR);
        const dg = Math.abs(d[ii + 1] - bgG);
        const db = Math.abs(d[ii + 2] - bgB);
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < tolerance + softEdge) {
          bgMask[pi] = 1;
          stack.push(sx - 1, sy, sx + 1, sy, sx, sy - 1, sx, sy + 1);
        }
      }

      for (let i = 0; i < w * h; i++) {
        if (bgMask[i]) {
          const ii = i * 4;
          const dr = Math.abs(d[ii] - bgR);
          const dg = Math.abs(d[ii + 1] - bgG);
          const db = Math.abs(d[ii + 2] - bgB);
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist < tolerance) {
            d[ii + 3] = 0;
          } else {
            const alpha = (dist - tolerance) / softEdge;
            d[ii + 3] = Math.round(Math.min(1, alpha) * d[ii + 3]);
          }
        }
      }

      cx.putImageData(imgData, 0, 0);
      setTransparentImageSrc(c.toDataURL('image/png'));
    };
    img.onerror = () => {
      setTransparentImageSrc(null);
    };
    img.src = primaryImage;
  }, [showTryOn, primaryImage]);

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
          <button 
            onClick={(e) => { e.stopPropagation(); setShowTryOn(true); }}
            className="p-2 rounded-full bg-amber-600 text-white shadow-lg transform hover:scale-110 transition-all"
            title="Sanal Deneme"
          >
            <Camera size={18} />
          </button>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
          <button 
            disabled={!hasExternalLink && isOutOfStock}
            onClick={handlePrimaryAction}
            className={`w-full text-white text-[10px] py-4 tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl ${!hasExternalLink && isOutOfStock ? 'bg-gray-400' : 'bg-black hover:bg-gray-900'}`}
          >
            <ShoppingCart size={14} /> {actionLabel}
          </button>
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="flex items-center justify-center gap-2">
              {images.slice(0, 5).map((image, index) => (
                <button
                  key={image + index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(index);
                  }}
                  className={`w-10 h-10 rounded-sm overflow-hidden border transition-colors ${
                    activeImageIndex === index ? 'border-black' : 'border-white/70'
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
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
              <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
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
              <div className="text-sm text-gray-600 leading-relaxed">
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

      {showTryOn && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 p-0 md:p-10 animate-in fade-in duration-500 backdrop-blur-xl overflow-hidden"
          onMouseMove={handleDragMove}
          onMouseUp={() => setIsDragging(false)}
          onTouchMove={handleDragMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          {isFlashing && <div className="fixed inset-0 bg-white z-[200] animate-out fade-out duration-300 pointer-events-none"></div>}

          <button 
            onClick={() => setShowTryOn(false)}
            className="absolute top-6 right-6 text-white hover:rotate-90 transition-transform p-3 z-[150] bg-white/10 rounded-full"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-6xl bg-white overflow-hidden md:rounded-lg flex flex-col md:flex-row h-full md:h-[85vh] shadow-2xl relative">
            
            <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden touch-none">
               {isCaptured ? (
                 <div className="relative w-full h-full animate-in zoom-in-95 duration-500">
                    <img src={isCaptured} className="w-full h-full object-cover" alt="Captured" />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-8 p-6 text-center">
                       <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mb-2 shadow-2xl">
                          <Sparkles className="text-white" size={40} />
                       </div>
                       <h3 className="text-white serif text-4xl">Işıltınız Göz Kamaştırıyor</h3>
                       <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                          <button onClick={() => setIsCaptured(null)} className="flex-1 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-full text-[10px] font-bold tracking-widest uppercase border border-white/20 hover:bg-white/20 transition-all">YENİDEN DENE</button>
                          <a href={isCaptured} download={`${product.name}-lumina.png`} className="flex-1 bg-amber-600 text-white px-8 py-4 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-amber-700 transition-all"><Download size={14} /> FOTOĞRAFI İNDİR</a>
                       </div>
                    </div>
                 </div>
               ) : (
                 <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                      <div className="absolute inset-0 border-[60px] border-black/20 pointer-events-none">
                        <div className="w-full h-full border border-white/5 flex items-center justify-center">
                           <div className="w-72 h-96 border-2 border-dashed border-white/10 rounded-[120px] opacity-30"></div>
                        </div>
                      </div>

                      <div 
                        className={`relative pointer-events-auto cursor-move transition-shadow duration-300 ${isDragging ? 'scale-[1.02]' : ''}`}
                        style={{ 
                          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        }}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                      >
                        <img
                          src={transparentImageSrc || primaryImage}
                          className={`w-64 h-64 object-contain transition-all duration-300 drop-shadow-[0_0_40px_rgba(255,255,255,0.5)] ${isDragging ? 'opacity-80' : 'opacity-100'}`}
                          alt="AR Jewelry"
                          draggable="false"
                        />
                        {isDragging && (
                          <div className="absolute -inset-4 border-2 border-amber-500/30 rounded-full animate-ping pointer-events-none"></div>
                        )}
                      </div>
                    </div>

                    <div className="absolute bottom-24 right-8 flex flex-col gap-5 z-20">
                       <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/10 flex flex-col gap-4 shadow-2xl">
                          <div className="flex flex-col gap-2">
                             <span className="text-[8px] font-bold text-white tracking-[0.2em] uppercase text-center">ÖLÇEK</span>
                             <input 
                                type="range" 
                                min="0.3" 
                                max="2.2" 
                                step="0.01" 
                                value={scale} 
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                className="w-32 accent-amber-500"
                             />
                          </div>
                          <div className="h-px bg-white/10"></div>
                          <button onClick={() => {setPosition({x:0, y:0}); setScale(1);}} className="w-10 h-10 self-center bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:bg-amber-500 hover:text-white transition-all"><RefreshCw size={16}/></button>
                       </div>
                    </div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                       <button 
                         onClick={capturePhoto}
                         className="group relative flex items-center justify-center transition-transform active:scale-95"
                       >
                          <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center transition-all group-hover:border-white/60">
                             <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center">
                                <CameraIcon className="text-black group-hover:scale-110 transition-transform" size={28} />
                             </div>
                          </div>
                          <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] px-4 py-1.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all font-bold tracking-widest">GÖRÜNTÜYÜ YAKALA</span>
                       </button>
                    </div>
                 </>
               )}
               <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="w-full md:w-96 p-8 md:p-12 flex flex-col justify-between bg-white z-30">
              <div>
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-amber-600 text-[10px] font-bold tracking-[0.3em] uppercase block">CHARİS JEWELS SMART MIRROR</span>
                  </div>
                  <h2 className="text-4xl serif mb-3 text-gray-900 leading-tight">{product.name}</h2>
                  <div className="h-px w-20 bg-amber-200 mb-6"></div>
                  <p className="text-xl font-medium text-gray-900">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}</p>
                </div>

                <div className="space-y-6">
                   <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-100/50">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2">
                        <Move size={12} /> KONTROL PANELİ
                      </h4>
                      <p className="text-xs text-amber-900/60 leading-relaxed italic">
                        "Mücevheri parmağınızla serbestçe hareket ettirin. Yandaki sürgü ile boyutu yüz hatlarınıza göre hassasça ayarlayın."
                      </p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center">
                         <span className="text-[10px] font-bold text-gray-800">4K RENDER</span>
                         <span className="text-[8px] text-gray-400 uppercase tracking-widest">Ultra Netlik</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center">
                         <span className="text-[10px] font-bold text-gray-800">AI LIGHT</span>
                         <span className="text-[8px] text-gray-400 uppercase tracking-widest">Doğal Işık</span>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-4 pt-10 border-t border-gray-100">
                <button 
                  onClick={handleTryOnAction}
                  className="w-full bg-black text-white py-5 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-amber-700 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  <ShoppingCart size={16} /> {tryOnActionLabel}
                </button>
                <div className="flex gap-3">
                   <button className="flex-1 border border-gray-200 py-4 rounded-xl text-[9px] font-bold tracking-widest uppercase hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"><Share2 size={12}/> PAYLAŞ</button>
                   <button onClick={() => setShowTryOn(false)} className="flex-1 border border-gray-200 py-4 rounded-xl text-[9px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all">KAPAT</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        input[type=range].accent-amber-500 {
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          height: 4px;
        }
        input[type=range].accent-amber-500::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #d97706;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};

export default ProductCard;
