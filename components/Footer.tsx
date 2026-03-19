import React from 'react';
import { Instagram, Facebook, Twitter, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white pt-24 pb-12 border-t border-gray-100">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-[0.2em] serif">🔱CHARİS JEWELS🔱</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-light">
              Lüks ve zarafeti günlük hayatınıza taşıyan, her parçası hikaye anlatan mücevher ve takı koleksiyonları.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/charisjewelss/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-black transition-colors"
              >
                <Instagram size={20} />
              </a>
              
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-8">Kategoriler</h4>
            <ul className="space-y-4 text-sm font-light text-gray-500">
              <li><a href="#" className="hover:text-black transition-colors">Kolyeler</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Yüzükler</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Küpeler</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Bileklikler</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-8">Kurumsal</h4>
            <ul className="space-y-4 text-sm font-light text-gray-500">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-black transition-colors"
                >
                  Hakkımızda
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('stores')}
                  className="hover:text-black transition-colors"
                >
                  Mağazalarımız
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('careers')}
                  className="hover:text-black transition-colors"
                >
                  Kariyer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-black transition-colors"
                >
                  İletişim
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-8">Bültene Katılın</h4>
            <p className="text-gray-500 text-sm font-light mb-6">Yeni koleksiyonlar ve Çôzel indirimlerden ilk siz haberdar olun.</p>
            <form className="relative">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-black transition-colors bg-transparent pr-10"
              />
              <button className="absolute right-0 top-3 text-black">
                <Mail size={20} />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest"> 2024 CHARİS JEWELS. TÜM HAKLARI SAKLIDIR.</p>
          <div className="flex gap-8 text-[10px] text-gray-400 uppercase tracking-widest">
            <a href="#" className="hover:text-black transition-colors">KVK Aydınlatma</a>
            <a href="#" className="hover:text-black transition-colors">Çerez Politikası</a>
            <a href="#" className="hover:text-black transition-colors">Mesafeli Satış</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
