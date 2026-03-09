
import { Product, Category } from './types';

export const CATEGORIES: Category[] = [
  'KOLYE',
  'BİLEKLİK',
  'KÜPE',
  'YÜZÜK',
  'ERKEK',
  'TAKI SETLERİ',
  'AKSESUAR',
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Pırlanta Damla Kolye',
    price: 12500,
    category: 'KOLYE',
    images: ['https://picsum.photos/seed/necklace1/600/800'],
    description: '18 Ayar Beyaz Altın, 0.25 Karat Pırlanta.',
    isNew: true,
    stock: 12
  },
  {
    id: '2',
    name: 'Safir Taşlı Bileklik',
    price: 8400,
    category: 'BİLEKLİK',
    images: ['https://picsum.photos/seed/bracelet1/600/800'],
    description: 'Gümüş üzerine altın kaplama, doğal safir taşlar.',
    stock: 5
  },
  {
    id: '3',
    name: 'Minimalist Halka Küpe',
    price: 3200,
    category: 'KÜPE',
    images: ['https://picsum.photos/seed/earring1/600/800'],
    description: '14 Ayar Sarı Altın, günlük kullanım için ideal.',
    stock: 0
  },
  {
    id: '4',
    name: 'Zümrüt Tektaş Yüzük',
    price: 15600,
    category: 'YÜZÜK',
    images: ['https://picsum.photos/seed/ring1/600/800'],
    description: 'Eşsiz zümrüt kesim ve pırlanta detaylar.',
    isSale: true,
    stock: 2
  },
  {
    id: '5',
    name: 'Erkek Deri Bileklik',
    price: 1450,
    category: 'ERKEK',
    images: ['https://picsum.photos/seed/men1/600/800'],
    description: 'Gerçek deri ve çelik toka detayı.',
    stock: 25
  },
  {
    id: '6',
    name: 'Gelin Takı Seti',
    price: 45000,
    category: 'TAKI SETLERİ',
    images: ['https://picsum.photos/seed/set1/600/800'],
    description: 'Kolye, küpe ve bileklikten oluşan tam set.',
    stock: 3
  },
  {
    id: '7',
    name: 'Mücevher Kutusu',
    price: 850,
    category: 'AKSESUAR',
    images: ['https://picsum.photos/seed/acc1/600/800'],
    description: 'Kadife iç kaplamalı lüks kutu.',
    stock: 100
  }
];
