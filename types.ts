
export type Category = 'KOLYE' | 'BİLEKLİK' | 'KÜPE' | 'YÜZÜK' | 'ERKEK' | 'TAKI SETLERİ' | 'AKSESUAR';

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  extraCost?: number;
  category: Category;
  images: string[];
  videos?: string[];
  description: string;
  isNew?: boolean;
  isSale?: boolean;
  stock?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  password?: string;
}

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  location: string;
  avatarUrl?: string;
}


export interface ShippingAddress {
  recipientName?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  postalCode?: string;
}

export type OrderStatus = 'Sipariş Alındı' | 'Hazırlandı' | 'Kargoda' | 'Teslim Edildi' | 'İptal Edildi' | 'İade Edildi';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  shippingAddress?: ShippingAddress;
  shippingCarrier?: string;
  trackingNumber?: string;
  createdAt: string;
}
