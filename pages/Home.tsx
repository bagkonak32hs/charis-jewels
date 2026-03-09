
import React, { useEffect, useState } from 'react';
import { useProducts } from '../store';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Sparkles, ShieldCheck, Star } from 'lucide-react';
import heroImage from '../assets/1 (2).png';

const Home: React.FC = () => {
  const { products } = useProducts();
  const featured = products.slice(0, 4);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="animate-in fade-in duration-700 overflow-hidden bg-white">
      {/* Dynamic Parallax Hero Section */}
      <section className="relative h-[65vh] flex flex-col justify-end items-center overflow-hidden bg-[#0d0904]">
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 will-change-transform transition-transform duration-100 ease-out"
            style={{ 
              transform: `scale(1.15) translateY(${scrollY * 0.2}px)`,
            }}
          >
            <img 
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-center scale-110 blur-xl opacity-55"
            />
          </div>
          <div className="absolute inset-y-0 left-0 w-[18vw] min-w-[140px] symbol-column symbol-left"></div>
          <div className="absolute inset-y-0 right-0 w-[18vw] min-w-[140px] symbol-column symbol-right"></div>
          <div className="absolute inset-0 z-10">
            <img 
              src={heroImage}
              alt="Tanrıça İsis Lüks Mücevher Mağazası"
              className="w-full h-full object-contain object-center"
            />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,212,140,0.25),rgba(62,42,20,0.55)_55%)]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#3b2a12]/60 via-transparent to-transparent"></div>
        </div>

        <div 
          className="container mx-auto px-8 relative z-20 pb-16 text-center text-white will-change-transform transition-transform duration-75 ease-out"
          style={{ transform: `translateY(${scrollY * -0.05}px)` }}
        >
          
        </div>
      </section>

      {/* Featured Collection Section */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-8">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-5xl serif mb-6 text-gray-900 tracking-tight">⚡️ Eşsiz Ürünler ⚡️</h2>
            <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-8"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck className="text-amber-500" size={32} />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-[0.3em] mb-3">Sertifikalı Güvence</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed uppercase tracking-widest px-4">Uluslararası standartlarda pırlanta ve değerli taş sertifikasyonu.</p>
            </div>
            
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Star className="text-amber-500" size={32} />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-[0.3em] mb-3">VIP Servis</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed uppercase tracking-widest px-4">Size özel mücevher danışmanı ile kişiselleştirilmiş alışveriş deneyimi.</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="text-amber-500" size={32} />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-[0.3em] mb-3">Eşsiz Tasarım</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed uppercase tracking-widest px-4">Dünyada sadece sizde olacak, size özel tasarlanan sanat eserleri.</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .symbol-column {
          opacity: 0.95;
          filter: blur(0.1px) drop-shadow(0 0 18px rgba(255, 210, 140, 0.6));
          mix-blend-mode: screen;
          overflow: hidden;
          position: absolute;
          z-index: 20;
          background-repeat: repeat-y;
          background-position: center 0;
          background-size: 140px 672px;
        }
        .symbol-left {
          background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27140%27%20height%3D%27672%27%20viewBox%3D%270%200%20140%20672%27%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27%23f7d9a1%27%20stroke-width%3D%272.6%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cg%20transform%3D%27translate%280%2C0%29%27%3E%3Cpath%20d%3D%27M70%208c-14%200-24%206-24%2014s10%2014%2024%2014%2024-6%2024-14S84%208%2070%208z%27%2F%3E%3Cpath%20d%3D%27M52%2012c-4-4-10-6-10-6s2%208%206%2012%27%2F%3E%3Cpath%20d%3D%27M88%2012c4-4%2010-6%2010-6s-2%208-6%2012%27%2F%3E%3Cpath%20d%3D%27M52%2030c-4%204-10%206-10%206s2-8%206-12%27%2F%3E%3Cpath%20d%3D%27M88%2030c4%204%2010%206%2010%206s-2-8-6-12%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C42%29%27%3E%3Cpath%20d%3D%27M40%2018h20v-6h20v6h20%20M50%2018v16h40v-16%20M56%2024h28%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C84%29%27%3E%3Cpath%20d%3D%27M70%206l18%2030H52L70%206z%20M70%2014v14%20M63%2028l7-8%207%208%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C126%29%27%3E%3Cpath%20d%3D%27M70%206v30%20M62%206c0%2010%208%2016%208%2016s8-6%208-16%20M56%2016h28%20M70%2036l-8%204h16z%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C168%29%27%3E%3Cpath%20d%3D%27M50%2010c-4%2016%208%2024%2020%2028c12-4%2024-12%2020-28%20M58%2016h24%20M62%2022h16%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C210%29%27%3E%3Cpath%20d%3D%27M70%208l4%2010h10l-8%206%203%2010-9-6-9%206%203-10-8-6h10z%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C252%29%27%3E%3Cpath%20d%3D%27M56%2034V14c0-6%206-10%2014-10s14%204%2014%2010v20%20M56%2018h28%20M64%2018v16%20M76%2018v16%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C294%29%27%3E%3Cpath%20d%3D%27M70%2010c-8%200-16%204-16%2010s8%206%2016%206%2016%200%2016%206-8%2010-16%2010%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C336%29%27%3E%3Ccircle%20cx%3D%2770%27%20cy%3D%2714%27%20r%3D%278%27%2F%3E%3Cpath%20d%3D%27M70%2022v14%20M58%2028h24%20M58%2036l12-4%2012%204%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C378%29%27%3E%3Cpath%20d%3D%27M48%2012h44%20M48%2012l-6-6%20M92%2012l6-6%20M52%2012v22%20M88%2012v22%20M52%2034h36%20M60%2012v22%20M70%2012v22%20M80%2012v22%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C420%29%27%3E%3Cpath%20d%3D%27M52%2030c0-14%208-22%2018-22s18%208%2018%2022%20M60%2010c-4-6-2-12%204-12%20M80%2010c4-6%202-12-4-12%20M70%2030v6%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C462%29%27%3E%3Ccircle%20cx%3D%2770%27%20cy%3D%2721%27%20r%3D%2714%27%2F%3E%3Cpath%20d%3D%27M60%2016l4%206-4%206%20M80%2016l-4%206%204%206%20M66%2019h8%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C504%29%27%3E%3Cpath%20d%3D%27M58%208c-8%202-14%208-14%2016h52c0-8-6-14-14-16%20M44%2024v4h52v-4%20M50%2028v6%20M90%2028v6%20M46%2034h48%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C546%29%27%3E%3Cpath%20d%3D%27M56%2032c-2-8%200-16%204-22s10-8%2016-4c-2-6%202-10%208-8s8%208%204%2014c4%200%206%204%204%208s-6%206-10%204%27%2F%3E%3Cpath%20d%3D%27M62%2020l6%204-2%208%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C588%29%27%3E%3Cpath%20d%3D%27M56%2010Q56%2030%2070%2036Q84%2030%2084%2010%20M56%2010h28%20M70%2010v26%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C630%29%27%3E%3Cpath%20d%3D%27M46%2018h18v-8h12v8h18%20M50%2018v18%20M86%2018v18%20M50%2036h36%20M50%2026h36%27%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E");
          animation: symbols-rise 26s linear infinite;
        }
        .symbol-right {
          background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27140%27%20height%3D%27672%27%20viewBox%3D%270%200%20140%20672%27%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27%23ffdca8%27%20stroke-width%3D%272.6%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cg%20transform%3D%27translate%280%2C0%29%27%3E%3Cpath%20d%3D%27M70%208c-14%200-24%206-24%2014s10%2014%2024%2014%2024-6%2024-14S84%208%2070%208z%27%2F%3E%3Cpath%20d%3D%27M52%2012c-4-4-10-6-10-6s2%208%206%2012%27%2F%3E%3Cpath%20d%3D%27M88%2012c4-4%2010-6%2010-6s-2%208-6%2012%27%2F%3E%3Cpath%20d%3D%27M52%2030c-4%204-10%206-10%206s2-8%206-12%27%2F%3E%3Cpath%20d%3D%27M88%2030c4%204%2010%206%2010%206s-2-8-6-12%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C42%29%27%3E%3Cpath%20d%3D%27M40%2018h20v-6h20v6h20%20M50%2018v16h40v-16%20M56%2024h28%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C84%29%27%3E%3Cpath%20d%3D%27M70%206l18%2030H52L70%206z%20M70%2014v14%20M63%2028l7-8%207%208%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C126%29%27%3E%3Cpath%20d%3D%27M70%206v30%20M62%206c0%2010%208%2016%208%2016s8-6%208-16%20M56%2016h28%20M70%2036l-8%204h16z%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C168%29%27%3E%3Cpath%20d%3D%27M50%2010c-4%2016%208%2024%2020%2028c12-4%2024-12%2020-28%20M58%2016h24%20M62%2022h16%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C210%29%27%3E%3Cpath%20d%3D%27M70%208l4%2010h10l-8%206%203%2010-9-6-9%206%203-10-8-6h10z%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C252%29%27%3E%3Cpath%20d%3D%27M56%2034V14c0-6%206-10%2014-10s14%204%2014%2010v20%20M56%2018h28%20M64%2018v16%20M76%2018v16%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C294%29%27%3E%3Cpath%20d%3D%27M70%2010c-8%200-16%204-16%2010s8%206%2016%206%2016%200%2016%206-8%2010-16%2010%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C336%29%27%3E%3Ccircle%20cx%3D%2770%27%20cy%3D%2714%27%20r%3D%278%27%2F%3E%3Cpath%20d%3D%27M70%2022v14%20M58%2028h24%20M58%2036l12-4%2012%204%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C378%29%27%3E%3Cpath%20d%3D%27M48%2012h44%20M48%2012l-6-6%20M92%2012l6-6%20M52%2012v22%20M88%2012v22%20M52%2034h36%20M60%2012v22%20M70%2012v22%20M80%2012v22%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C420%29%27%3E%3Cpath%20d%3D%27M52%2030c0-14%208-22%2018-22s18%208%2018%2022%20M60%2010c-4-6-2-12%204-12%20M80%2010c4-6%202-12-4-12%20M70%2030v6%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C462%29%27%3E%3Ccircle%20cx%3D%2770%27%20cy%3D%2721%27%20r%3D%2714%27%2F%3E%3Cpath%20d%3D%27M60%2016l4%206-4%206%20M80%2016l-4%206%204%206%20M66%2019h8%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C504%29%27%3E%3Cpath%20d%3D%27M58%208c-8%202-14%208-14%2016h52c0-8-6-14-14-16%20M44%2024v4h52v-4%20M50%2028v6%20M90%2028v6%20M46%2034h48%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C546%29%27%3E%3Cpath%20d%3D%27M56%2032c-2-8%200-16%204-22s10-8%2016-4c-2-6%202-10%208-8s8%208%204%2014c4%200%206%204%204%208s-6%206-10%204%27%2F%3E%3Cpath%20d%3D%27M62%2020l6%204-2%208%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C588%29%27%3E%3Cpath%20d%3D%27M56%2010Q56%2030%2070%2036Q84%2030%2084%2010%20M56%2010h28%20M70%2010v26%27%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%27translate%280%2C630%29%27%3E%3Cpath%20d%3D%27M46%2018h18v-8h12v8h18%20M50%2018v18%20M86%2018v18%20M50%2036h36%20M50%2026h36%27%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E");
          animation: symbols-fall 22s linear infinite;
        }
        @keyframes symbols-fall {
          from { background-position: center 0; }
          to { background-position: center 672px; }
        }
        @keyframes symbols-rise {
          from { background-position: center 672px; }
          to { background-position: center 0; }
        }
        @media (max-width: 768px) {
          .symbol-column {
            width: 24vw;
            opacity: 0.7;
            background-size: 110px 528px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
