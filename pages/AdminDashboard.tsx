
import React, { useEffect, useState } from 'react';
import { useOrders, useProducts } from '../store';
import { CATEGORIES } from '../constants';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Settings, 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  XCircle, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Share2,
  Save, 
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Tag,
  Layers,
  LogOut
} from 'lucide-react';
import { OrderStatus, Order, Product, Category } from '../types';
import { supabase } from '../lib/supabase';

type AdminTab = 'dashboard' | 'orders' | 'products' | 'customers' | 'settings';
type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  lastOrderDate: string | null;
};

const AdminDashboard: React.FC<{ onExitToStore: () => void; onLogout: () => void; }> = ({ onExitToStore, onLogout }) => {
  const { orders, updateOrderStatus, updateOrderShipping } = useOrders();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [shippingForm, setShippingForm] = useState({ carrier: '', trackingNumber: '' });
  const [shippingSaved, setShippingSaved] = useState(false);
  const [isCleaningMedia, setIsCleaningMedia] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState('');

  // Product Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    costPrice: 0,
    extraCost: 0,
    category: 'KOLYE',
    images: [],
    videos: [],
    description: '',
    adminLink: '',
    stock: 0,
    isNew: false,
    isSale: false
  });
  const [uploadQueue, setUploadQueue] = useState<Array<{ file: File; tempUrl: string }>>([]);
  const [uploadVideoQueue, setUploadVideoQueue] = useState<Array<{ file: File; tempUrl: string }>>([]);

  const currentMonthRevenue = orders
    .filter((order) => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      return sum + orderTotal;
    }, 0);

  const activeUsers = new Set(orders.map(order => order.userId)).size;

  const stats = [
  {
    label: 'Toplam Sipariş',
    value: orders.length.toString(),
    icon: ShoppingCart,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Aktif Ürün',
    value: products.length.toString(),
    icon: Package,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  
  {
  label: 'Aktif Kullanıcı',
  value: activeUsers.toLocaleString('tr-TR'),
  icon: Users,
  color: 'text-purple-600',
  bg: 'bg-purple-50',
},
  {
    label: 'Aylık Gelir',
    value: currentMonthRevenue.toLocaleString('tr-TR') + ' ₺',
    icon: LayoutDashboard,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
]

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);

  const totalInventoryValue = products.reduce((sum, product) => {
    const stock = product.stock ?? 0;
    return sum + (product.price ?? 0) * stock;
  }, 0);

  const getProductImage = (item: { images: string[] }) => item.images[0] ?? '';

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    const nextUploads = Array.from(files).map((file) => ({
      file,
      tempUrl: URL.createObjectURL(file)
    }));
    setUploadQueue((prev) => [...prev, ...nextUploads]);
    setProductForm((prev) => ({
      ...prev,
      images: [...(prev.images ?? []), ...nextUploads.map((item) => item.tempUrl)]
    }));
  };

  const extractStoragePath = (url: string) => {
    const marker = '/storage/v1/object/public/product-media/';
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.slice(index + marker.length);
  };

  const removeStorageObject = async (url: string) => {
    const path = extractStoragePath(url);
    if (!path) return;
    await supabase.storage.from('product-media').remove([path]);
  };

  const listStorageFiles = async (folder: string) => {
    const { data, error } = await supabase.storage
      .from('product-media')
      .list(folder, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });

    if (error || !data) return [] as string[];
    return data
      .filter((item) => item.name)
      .map((item) => `${folder}/${item.name}`);
  };

  const handleCleanupOrphanMedia = async () => {
    setIsCleaningMedia(true);
    setCleanupMessage('');

    const usedPaths = new Set(
      products
        .flatMap((product) => [...(product.images ?? []), ...(product.videos ?? [])])
        .map((url) => extractStoragePath(url))
        .filter((path): path is string => Boolean(path))
    );

    const imageFiles = await listStorageFiles('products/images');
    const videoFiles = await listStorageFiles('products/videos');
    const orphanFiles = [...imageFiles, ...videoFiles].filter((path) => !usedPaths.has(path));

    if (orphanFiles.length > 0) {
      await supabase.storage.from('product-media').remove(orphanFiles);
      setCleanupMessage(`${orphanFiles.length} dosya temizlendi.`);
    } else {
      setCleanupMessage('Temizlenecek dosya yok.');
    }

    setIsCleaningMedia(false);
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    } else {
      await removeStorageObject(imageUrl);
    }
    setUploadQueue((prev) => prev.filter((item) => item.tempUrl !== imageUrl));
    setProductForm((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((url) => url !== imageUrl)
    }));
  };

  const handleVideoUpload = (files: FileList | null) => {
    if (!files) return;
    const nextUploads = Array.from(files).map((file) => ({
      file,
      tempUrl: URL.createObjectURL(file)
    }));
    setUploadVideoQueue((prev) => [...prev, ...nextUploads]);
    setProductForm((prev) => ({
      ...prev,
      videos: [...(prev.videos ?? []), ...nextUploads.map((item) => item.tempUrl)]
    }));
  };

  const handleRemoveVideo = async (videoUrl: string) => {
    if (videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    } else {
      await removeStorageObject(videoUrl);
    }
    setUploadVideoQueue((prev) => prev.filter((item) => item.tempUrl !== videoUrl));
    setProductForm((prev) => ({
      ...prev,
      videos: (prev.videos ?? []).filter((url) => url !== videoUrl)
    }));
  };

  const sanitizeFileName = (name: string) => {
    const normalized = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const safe = normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
    return safe.length > 0 ? safe : `file_${Date.now()}`;
  };

  const buildShareText = (product: Product) => {
    const price = formatCurrency(product.price ?? 0);
    const link = (product.adminLink ?? '').trim();
    return link ? `${product.name} • ${price}\n${link}` : `${product.name} • ${price}`;
  };

  const resolveShareFile = async (imageUrl: string, productName: string) => {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('share-image-download-failed');
    const blob = await response.blob();
    const extension = blob.type === 'image/png'
      ? 'png'
      : blob.type === 'image/webp'
        ? 'webp'
        : blob.type === 'image/gif'
          ? 'gif'
          : 'jpg';
    const fileName = `${sanitizeFileName(productName || 'urun')}.${extension}`;
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  };

  const handleShareProduct = async (product: Product) => {
    const shareText = buildShareText(product);
    const shareData: ShareData = {
      title: product.name,
      text: shareText,
    };
    const shareUrl = (product.adminLink ?? '').trim();
    if (shareUrl) shareData.url = shareUrl;

    const imageUrl = product.images?.[0];
    if (imageUrl) {
      try {
        const file = await resolveShareFile(imageUrl, product.name);
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      } catch (error) {
        // Fallback to text-only share if image fetch fails.
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
      alert('Paylaşım desteklenmedi. Görsel yeni sekmede açıldı; Instagram uygulamasında gönderi veya hikaye olarak paylaşabilirsiniz.');
    } else {
      alert('Paylaşım bu cihazda desteklenmiyor.');
    }
  };

  const uploadProductImages = async (queue: Array<{ file: File; tempUrl: string }>, folder: string) => {
    if (queue.length === 0) return {} as Record<string, string>;
    const uploadedMap: Record<string, string> = {};

    for (const item of queue) {
      const safeName = sanitizeFileName(item.file.name);
      const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
      const { error } = await supabase.storage
        .from('product-media')
        .upload(filePath, item.file, { upsert: false });

      if (error) {
        throw new Error(error.message);
      }

      const { data } = supabase.storage.from('product-media').getPublicUrl(filePath);
      uploadedMap[item.tempUrl] = data.publicUrl;
      URL.revokeObjectURL(item.tempUrl);
    }

    return uploadedMap;
  };

  const uploadImages = async () => {
    const map = await uploadProductImages(uploadQueue, 'products/images');
    setUploadQueue([]);
    return map;
  };

  const uploadVideos = async () => {
    const map = await uploadProductImages(uploadVideoQueue, 'products/videos');
    setUploadVideoQueue([]);
    return map;
  };

  const handleStatusChange = async (e: React.MouseEvent | React.FormEvent, id: string, status: OrderStatus) => {
    if (e.type === 'click') (e as React.MouseEvent).stopPropagation();
    await updateOrderStatus(id, status);
  };

  const statusSequence: OrderStatus[] = ['Sipariş Alındı', 'Hazırlandı', 'Kargoda', 'Teslim Edildi'];

  const isTerminalStatus = (status: OrderStatus) =>
    status === 'İade Edildi' || status === 'İptal Edildi';

  const isStatusAtOrAfter = (current: OrderStatus, target: OrderStatus) => {
    const currentIndex = statusSequence.indexOf(current);
    const targetIndex = statusSequence.indexOf(target);
    if (currentIndex === -1 || targetIndex === -1) return current === target;
    return currentIndex >= targetIndex;
  };

  const hasShippingInfo = (order: Order) =>
    Boolean((order.shippingCarrier ?? '').trim() && (order.trackingNumber ?? '').trim());

  const handleInitiateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderId) {
      updateOrderStatus(selectedOrderId, 'İade Edildi');
      setIsReturnModalOpen(false);
      setReturnReason('');
      setSelectedOrderId(null); // Close detail view or reset selection
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: 0,
      costPrice: 0,
      extraCost: 0,
      category: 'KOLYE',
      images: [],
      videos: [],
      description: '',
      adminLink: '',
      stock: 0,
      isNew: true,
      isSale: false
    });
    setUploadQueue([]);
    setUploadVideoQueue([]);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({ ...product, images: product.images ?? [], videos: product.videos ?? [] });
    setUploadQueue([]);
    setUploadVideoQueue([]);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProduct) return;
    setIsSavingProduct(true);
    const images = productForm.images ?? [];
    if (images.length === 0) {
      alert('Lütfen en az bir Ürün fotoğrafı ekleyin.');
      setIsSavingProduct(false);
      return;
    }
    let uploadedImages: Record<string, string> = {};
    let uploadedVideos: Record<string, string> = {};
    try {
      uploadedImages = await uploadImages();
      uploadedVideos = await uploadVideos();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.';
      alert(message);
      setIsSavingProduct(false);
      return;
    }
    const resolvedImages = images.map((url) => uploadedImages[url] ?? url);
    const resolvedVideos = (productForm.videos ?? []).map((url) => uploadedVideos[url] ?? url);
    const normalizedForm = { 
      ...productForm, 
      images: resolvedImages, 
      videos: resolvedVideos,
      adminLink: productForm.adminLink?.trim() || ''
    };
    if (editingProduct) {
      const { error } = await updateProduct({ ...editingProduct, ...normalizedForm } as Product);
      if (error) {
        alert(error);
        setIsSavingProduct(false);
        return;
      }
    } else {
      const newProduct: Product = {
        ...normalizedForm,
        id: Math.random().toString(36).substr(2, 9),
      } as Product;
      const { error } = await addProduct(newProduct);
      if (error) {
        alert(error);
        setIsSavingProduct(false);
        return;
      }
    }
    setIsProductModalOpen(false);
    setIsSavingProduct(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz')) {
      const { error } = await deleteProduct(id);
      if (error) {
        alert(error);
      }
    }
  };

  const handleSettingsSave = () => {
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 2000);
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  useEffect(() => {
    if (!selectedOrder) {
      setShippingForm({ carrier: '', trackingNumber: '' });
      return;
    }
    setShippingForm({
      carrier: selectedOrder.shippingCarrier ?? '',
      trackingNumber: selectedOrder.trackingNumber ?? ''
    });
  }, [selectedOrderId, selectedOrder?.shippingCarrier, selectedOrder?.trackingNumber]);

  useEffect(() => {
    if (activeTab !== 'customers') return;
    let isMounted = true;

    const loadCustomers = async () => {
      setIsLoadingCustomers(true);
      setCustomersError('');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone');

      if (profilesError) {
        if (isMounted) setCustomersError(profilesError.message);
        setIsLoadingCustomers(false);
        return;
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, created_at');

      if (ordersError) {
        if (isMounted) setCustomersError(ordersError.message);
        setIsLoadingCustomers(false);
        return;
      }
        const { data: adminRoles, error: adminRolesError } = await supabase
          .from('admin_roles')
          .select('user_id');

        if (adminRolesError) {
          if (isMounted) setCustomersError(adminRolesError.message);
          setIsLoadingCustomers(false);
          return;
        }

        const adminIds = new Set((adminRoles ?? []).map((entry) => entry.user_id).filter(Boolean));

      const stats = new Map<string, { totalOrders: number; lastOrderDate: string | null }>();
      (ordersData ?? []).forEach((order) => {
        if (!order.user_id) return;
        const existing = stats.get(order.user_id) ?? { totalOrders: 0, lastOrderDate: null };
        const nextOrders = existing.totalOrders + 1;
        const nextLast = !existing.lastOrderDate || (order.created_at && order.created_at > existing.lastOrderDate)
          ? order.created_at
          : existing.lastOrderDate;
        stats.set(order.user_id, { totalOrders: nextOrders, lastOrderDate: nextLast ?? null });
      });

      const mergedMap = new Map<string, CustomerSummary>();
      (profiles ?? []).forEach((profile) => {
        if (adminIds.has(profile.id)) return;
        const summary = stats.get(profile.id) ?? { totalOrders: 0, lastOrderDate: null };
        mergedMap.set(profile.id, {
          id: profile.id,
          name: profile.full_name || profile.email || 'Müşteri',
          email: profile.email || '',
          phone: profile.phone || '',
          ...summary
        });
      });

      const merged = Array.from(mergedMap.values());

      merged.sort((a, b) => {
        if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
        return (b.lastOrderDate ?? '').localeCompare(a.lastOrderDate ?? '');
      });

      if (isMounted) setCustomers(merged);
      setIsLoadingCustomers(false);
    };

    loadCustomers();

    return () => { isMounted = false; };
  }, [activeTab]);

  const handleShippingSave = (event: React.FormEvent, orderId: string) => {
    event.preventDefault();
    updateOrderShipping(orderId, {
      shippingCarrier: shippingForm.carrier.trim(),
      trackingNumber: shippingForm.trackingNumber.trim()
    });
    setShippingSaved(true);
    window.setTimeout(() => setShippingSaved(false), 2000);
  };

  // --- SUB-COMPONENT: ORDER DETAIL VIEW ---
  const renderOrderDetailView = (order: Order) => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <button 
          onClick={() => setSelectedOrderId(null)}
          className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={16} /> Sipariş Listesine Dön
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">ID: {order.id}</span>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
            order.status === 'Sipariş Alındı' ? 'bg-blue-50 text-blue-600' :
            order.status === 'Hazırlandı' ? 'bg-indigo-50 text-indigo-600' :
            order.status === 'Kargoda' ? 'bg-amber-50 text-amber-600' :
            order.status === 'İade Edildi' ? 'bg-purple-50 text-purple-600' :
            order.status === 'İptal Edildi' ? 'bg-red-50 text-red-600' :
            'bg-green-50 text-green-600'
          }`}>
            {order.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Sipariş İçeriği</h3>
              <span className="text-xs text-gray-400">{order.items.length} Ürün</span>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="p-6 flex items-center gap-6 group hover:bg-gray-50/50 transition-colors">
                  <div className="w-20 h-24 bg-gray-100 rounded overflow-hidden shrink-0 shadow-sm">
                    <img src={getProductImage(item)} className="w-full h-full object-cover" alt={item.name} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-black">{item.name}</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">{item.category}</p>
                      </div>
                      <p className="text-sm font-bold">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>Birim Fiyat: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price)}</span>
                      <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-700">Adet: {item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Teslimat Adresi</h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Alici</p>
                <p className="text-sm font-medium">{order.shippingAddress.recipientName || 'Girilmedi'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Telefon</p>
                <p className="text-sm font-medium">{order.shippingAddress.phone || 'Girilmedi'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Adres</p>
                <p className="text-sm font-medium">{order.shippingAddress.address || 'Girilmedi'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ilce</p>
                  <p className="text-sm font-medium">{order.shippingAddress.district || 'Girilmedi'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Sehir</p>
                  <p className="text-sm font-medium">{order.shippingAddress.city || 'Girilmedi'}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Posta Kodu</p>
                <p className="text-sm font-medium">{order.shippingAddress.postalCode || 'Girilmedi'}</p>
              </div>
            </div>
          </div>
          <form
            onSubmit={(event) => handleShippingSave(event, order.id)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4"
          >
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Kargo Bilgileri</h3>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Kargo Firması</label>
              <input
                type="text"
                value={shippingForm.carrier}
                onChange={(e) => setShippingForm((prev) => ({ ...prev, carrier: e.target.value }))}
                className="w-full border-b py-2 text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="Örn: Yurtiçi Kargo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Takip Numarası</label>
              <input
                type="text"
                value={shippingForm.trackingNumber}
                onChange={(e) => setShippingForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                className="w-full border-b py-2 text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="Örn: TRK-123456"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-black text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all"
            >
              Kargo Bilgilerini Kaydet
            </button>
            {!hasShippingInfo(order) && (
              <p className="text-[10px] uppercase tracking-widest text-amber-600">
                Kargoya almak için firma ve takip no girin.
              </p>
            )}
            {shippingSaved && (
              <p className="text-[10px] uppercase tracking-widest text-green-600">Kargo bilgileri kaydedildi.</p>
            )}
          </form>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-3">
              <button 
                onClick={(e) => handleStatusChange(e, order.id, 'Sipariş Alındı')}
                disabled={isTerminalStatus(order.status) || isStatusAtOrAfter(order.status, 'Sipariş Alındı')}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 text-gray-700 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Sipariş Alındı
              </button>
              <button 
                onClick={(e) => handleStatusChange(e, order.id, 'Hazırlandı')}
                disabled={isTerminalStatus(order.status) || isStatusAtOrAfter(order.status, 'Hazırlandı')}
                className="w-full flex items-center justify-center gap-3 bg-blue-50 text-blue-600 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Hazırlandı
              </button>
              <button 
                onClick={(e) => handleStatusChange(e, order.id, 'Kargoda')}
                disabled={
                  isTerminalStatus(order.status) ||
                  isStatusAtOrAfter(order.status, 'Kargoda') ||
                  !hasShippingInfo(order)
                }
                className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Truck size={16} /> Siparişi Kargola
              </button>
              <button 
                onClick={(e) => handleStatusChange(e, order.id, 'Teslim Edildi')}
                disabled={isTerminalStatus(order.status) || isStatusAtOrAfter(order.status, 'Teslim Edildi')}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 text-gray-700 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Teslim Edildi İşaretle
              </button>
              <button 
                onClick={() => setIsReturnModalOpen(true)}
                disabled={isTerminalStatus(order.status)}
                className="w-full flex items-center justify-center gap-3 bg-amber-50 text-amber-600 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-colors border border-amber-100"
              >
                <RotateCcw size={16} /> İade Başlat
              </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboardHome = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-green-500 text-xs font-bold">+12%</span>
            </div>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 font-bold">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Ürün Yönetimi ({products.length})</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleCleanupOrphanMedia}
            disabled={isCleaningMedia}
            className="border border-gray-200 text-gray-700 text-[10px] px-4 py-2 rounded-lg font-bold tracking-widest uppercase hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {isCleaningMedia ? 'Temizleniyor...' : 'Yetim Medyayı Temizle'}
          </button>
          <button 
            onClick={openAddProductModal}
            className="bg-black text-white text-[10px] px-4 py-2 rounded-lg font-bold tracking-widest flex items-center gap-2 uppercase hover:bg-gray-800 transition-colors shadow-lg"
          >
            <Plus size={14} /> Yeni Ürün Ekle
          </button>
        </div>
      </div>
      {cleanupMessage && (
        <div className="px-6 pt-4 text-[10px] uppercase tracking-widest text-amber-600">
          {cleanupMessage}
        </div>
      )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b">
                <th className="px-6 py-4">Müşteri</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setActiveTab('orders'); setSelectedOrderId(order.id); }}>
                  <td className="px-6 py-4 text-sm font-semibold">Müşteri #{order.userId}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-400">#{order.id}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${
                      order.status === 'Sipariş Alındı' ? 'bg-blue-50 text-blue-600' :
                      order.status === 'Hazırlandı' ? 'bg-indigo-50 text-indigo-600' :
                      order.status === 'Kargoda' ? 'bg-amber-50 text-amber-600' :
                      order.status === 'İade Edildi' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderOrdersView = () => {
    if (selectedOrderId && selectedOrder && !isReturnModalOpen) return renderOrderDetailView(selectedOrder);
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Tüm Siparişler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b">
                <th className="px-6 py-4">Sipariş ID</th>
                <th className="px-6 py-4">Müşteri</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4">Hızlı İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer group" 
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-400 group-hover:text-black transition-colors">#{order.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">Müşteri #{order.userId}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${
                        order.status === 'Sipariş Alındı' ? 'bg-blue-50 text-blue-600' :
                        order.status === 'Hazırlandı' ? 'bg-indigo-50 text-indigo-600' :
                        order.status === 'Kargoda' ? 'bg-amber-50 text-amber-600' :
                        order.status === 'İade Edildi' ? 'bg-purple-50 text-purple-600' :
                        order.status === 'İptal Edildi' ? 'bg-red-50 text-red-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {order.status}
                      </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => handleStatusChange(e, order.id, 'Hazırlandı')} 
                        disabled={isTerminalStatus(order.status) || isStatusAtOrAfter(order.status, 'Hazırlandı')}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded disabled:opacity-20" 
                        title="Hazırlandı"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleStatusChange(e, order.id, 'Kargoda')} 
                        disabled={
                          isTerminalStatus(order.status) ||
                          isStatusAtOrAfter(order.status, 'Kargoda') ||
                          !hasShippingInfo(order)
                        }
                        className="p-1.5 hover:bg-amber-50 text-amber-600 rounded disabled:opacity-20" 
                        title="Kargola"
                      >
                        <Truck size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleStatusChange(e, order.id, 'Teslim Edildi')} 
                        disabled={isTerminalStatus(order.status) || isStatusAtOrAfter(order.status, 'Teslim Edildi')}
                        className="p-1.5 hover:bg-green-50 text-green-600 rounded disabled:opacity-20" 
                        title="Teslim Et"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedOrderId(order.id); 
                          setIsReturnModalOpen(true); 
                        }} 
                        disabled={order.status === 'İade Edildi' || order.status === 'İptal Edildi'}
                        className="p-1.5 hover:bg-purple-50 text-purple-600 rounded disabled:opacity-20" 
                        title="İade Başlat"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleStatusChange(e, order.id, 'İptal Edildi')} 
                        disabled={order.status === 'İptal Edildi' || order.status === 'Teslim Edildi' || order.status === 'İade Edildi'}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded disabled:opacity-20" 
                        title="İptal Et"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProductsView = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Ürün Yönetimi ({products.length})</h3>
        <button 
          onClick={openAddProductModal}
          className="bg-black text-white text-[10px] px-4 py-2 rounded-lg font-bold tracking-widest flex items-center gap-2 uppercase hover:bg-gray-800 transition-colors shadow-lg"
        >
          <Plus size={14} /> Yeni Ürün Ekle
        </button>
      </div>
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/40 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">
        Toplam Stok Değeri: <span className="text-gray-900">{formatCurrency(totalInventoryValue)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b">
              <th className="px-6 py-4">Görsel</th>
              <th className="px-6 py-4">Ürün Adı</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4">Satış Tutarı</th>
              <th className="px-6 py-4">Maliyet</th>
              <th className="px-6 py-4">Ek Masraf</th>
              <th className="px-6 py-4">Kar</th>
              <th className="px-6 py-4">Stok</th>
              <th className="px-6 py-4">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => {
              const costPrice = product.costPrice ?? 0;
              const extraCost = product.extraCost ?? 0;
              const profit = (product.price ?? 0) - costPrice - extraCost;

              return (
              <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                    <img src={getProductImage(product)} className="w-full h-full object-cover" alt="" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-800">{product.name}</p>
                  <div className="flex gap-1 mt-1">
                    {product.isNew && <span className="text-[7px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-bold uppercase tracking-tighter">Yeni</span>}
                    {product.isSale && <span className="text-[7px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold uppercase tracking-tighter">İndirim</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">{product.category}</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(product.price ?? 0)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{formatCurrency(costPrice)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{formatCurrency(extraCost)}</td>
                <td className={`px-6 py-4 text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${product.stock && product.stock > 5 ? 'bg-green-500' : product.stock === 0 ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    <span className="text-xs font-semibold text-gray-700">{product.stock ?? 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEditProductModal(product)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors"><Edit size={14}/></button>
                    <button onClick={() => handleShareProduct(product)} className="p-1.5 hover:bg-gray-50 text-gray-600 rounded transition-colors"><Share2 size={14}/></button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Product Modal (Add/Edit) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                 <div className="flex items-center gap-3">
                    <Package className="text-black" size={20} />
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">
                      {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                    </h3>
                 </div>
                 <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-black p-1">
                    <X size={20} />
                 </button>
              </div>
              
              <form onSubmit={handleProductSubmit} className="p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ürün Adı</label>
                          <div className="relative">
                             <Tag className="absolute left-3 top-3.5 text-gray-300" size={16} />
                             <input 
                                required
                                type="text"
                                value={productForm.name}
                                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                                className="w-full pl-10 pr-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
                                placeholder="Örn: Pırlanta Kolye"
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Fiyat</label>
                             <input 
                                required
                                type="number"
                                value={Number.isFinite(productForm.price) ? productForm.price : 0}
                                onChange={(e) => setProductForm({...productForm, price: Number(e.target.value) || 0})}
                                className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Stok</label>
                             <input 
                                required
                                type="number"
                                value={Number.isFinite(productForm.stock) ? productForm.stock : 0}
                                onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value) || 0})}
                                className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ürün Maliyeti</label>
                             <input 
                                type="number"
                                value={Number.isFinite(productForm.costPrice) ? productForm.costPrice : 0}
                                onChange={(e) => setProductForm({...productForm, costPrice: Number(e.target.value) || 0})}
                                className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ek Masraf</label>
                             <input 
                                type="number"
                                value={Number.isFinite(productForm.extraCost) ? productForm.extraCost : 0}
                                onChange={(e) => setProductForm({...productForm, extraCost: Number(e.target.value) || 0})}
                                className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
                             />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Kategori</label>
                          <div className="relative">
                             <Layers className="absolute left-3 top-3.5 text-gray-300" size={16} />
                             <select 
                                value={productForm.category}
                                onChange={(e) => setProductForm({...productForm, category: e.target.value as Category})}
                                className="w-full pl-10 pr-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all appearance-none"
                             >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                             </select>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ürün Linki (Opsiyonel)</label>
                          <input
                             type="url"
                             value={productForm.adminLink ?? ''}
                             onChange={(e) => setProductForm({ ...productForm, adminLink: e.target.value })}
                             className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all"
                             placeholder="https://"
                          />
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ürün Fotoğraf</label>
                          <div className="space-y-3">
                             <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:border-amber-500 transition-colors">
                                <ImageIcon className="text-gray-400" size={16} />
                                <span className="text-xs text-gray-600">Fotoğraf Ekle</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(e.target.files)}
                                />
                             </label>
                             <p className="text-[9px] text-gray-400 uppercase tracking-widest">Birden fazla dosya secilebilir.</p>
                          </div>
                          {(productForm.images ?? []).length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                              {productForm.images.map((imageUrl) => (
                                <div key={imageUrl} className="relative">
                                  <img src={imageUrl} className="w-full h-20 object-cover rounded border border-gray-100" alt="Önizleme" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(imageUrl)}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shadow"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ürün Video</label>
                          <div className="space-y-3">
                             <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:border-amber-500 transition-colors">
                                <ImageIcon className="text-gray-400" size={16} />
                                <span className="text-xs text-gray-600">Video Ekle</span>
                                <input
                                  type="file"
                                  accept="video/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleVideoUpload(e.target.files)}
                                />
                             </label>
                             <p className="text-[9px] text-gray-400 uppercase tracking-widest">Birden fazla video secilebilir.</p>
                          </div>
                          {(productForm.videos ?? []).length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                              {productForm.videos.map((videoUrl, index) => (
                                <div key={`${videoUrl}-${index}`} className="relative border border-gray-100 rounded bg-gray-50 p-2">
                                  <video src={videoUrl} className="w-full h-24 object-cover rounded" controls />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVideo(videoUrl)}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shadow"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>

                       <div className="flex gap-6 pt-4">
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <input 
                                type="checkbox" 
                                checked={productForm.isNew}
                                onChange={(e) => setProductForm({...productForm, isNew: e.target.checked})}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                             />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">YENİ</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <input 
                                type="checkbox" 
                                checked={productForm.isSale}
                                onChange={(e) => setProductForm({...productForm, isSale: e.target.checked})}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                             />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">İNDİRİMLİ</span>
                          </label>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Ürün Açıklaması</label>
                    <textarea 
                      required
                      value={productForm.description}
                      onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-100 rounded-lg p-4 text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all resize-none"
                    ></textarea>
                 </div>

                 <div className="flex gap-4 pt-4 border-t border-gray-50">
                    <button 
                      type="button" 
                      onClick={() => setIsProductModalOpen(false)}
                      className="flex-1 py-4 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProduct}
                      className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 ${
                        isSavingProduct ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-black text-white hover:bg-amber-600'
                      }`}
                    >
                      <Save size={16} /> {isSavingProduct ? 'Kaydediliyor...' : (editingProduct ? 'Güncelle' : 'Ürünü Kaydet')}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );

    const renderCustomersView = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Müşteri Listesi</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold border-b">
              <th className="px-6 py-4">Müşteri</th>
              <th className="px-6 py-4">E-posta</th>
              <th className="px-6 py-4">Telefon</th>
              <th className="px-6 py-4">Toplam Sipariş</th>
              <th className="px-6 py-4">Son Sipariş</th>
              <th className="px-6 py-4">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoadingCustomers && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-sm text-gray-500">Yükleniyor...</td>
              </tr>
            )}
            {!isLoadingCustomers && customersError && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-sm text-red-500">{customersError}</td>
              </tr>
            )}
            {!isLoadingCustomers && !customersError && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-sm text-gray-500">Müşteri bulunamadı.</td>
              </tr>
            )}
            {!isLoadingCustomers && !customersError && customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-[10px] text-white font-bold">
                    {(customer.name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold">{customer.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{customer.email || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{customer.phone || '-'}</td>
                <td className="px-6 py-4 text-sm font-bold">{customer.totalOrders}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('tr-TR') : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-widest ${
                    customer.totalOrders > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {customer.totalOrders > 0 ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 animate-in fade-in">
      <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800 mb-8 pb-4 border-b">Mağaza Ayarları</h3>
      <div className="max-w-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mağaza Adı</label>
            <input type="text" defaultValue="Charis Jewels " className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Para Birimi</label>
            <select className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors">
               <option>Türk Lirası (?)</option>
               <option>Amerikan Doları ($)</option>
               <option>Euro (â‚¬)</option>
            </select>
          </div>
        </div>
        <div className="pt-6">
          <button onClick={handleSettingsSave} className="bg-black text-white text-[10px] px-10 py-4 rounded-xl font-bold tracking-[0.2em] uppercase flex items-center gap-3 hover:bg-amber-600 transition-all shadow-lg">
            <Save size={16} /> Ayarları Kaydet
          </button>
          {settingsSaved && (
            <p className="mt-3 text-[10px] uppercase tracking-widest text-green-600">Ayarlar kaydedildi.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-black text-white shrink-0 hidden lg:block sticky top-0 h-screen overflow-y-auto z-20 shadow-2xl">
        <div className="p-8 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold serif text-xl rounded">⚡</div>
          <h1 className="text-xl tracking-[0.2em] serif font-bold">Charis Jewels</h1>
        </div>
        <nav className="p-6 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders', label: 'Siparişler', icon: ShoppingCart },
            { id: 'products', label: 'Ürünler', icon: Package },
            { id: 'customers', label: 'Müşteriler', icon: Users },
            { id: 'settings', label: 'Ayarlar', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as AdminTab); setSelectedOrderId(null); }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all ${
                activeTab === item.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <header className="px-8 py-6 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-800">
            {selectedOrderId ? 'Sipariş Detayı' : activeTab.toUpperCase()}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onExitToStore}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-black transition-colors"
            >
              <ExternalLink size={14} /> Kullanıcı Görünümü
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={14} /> Çıkış Yap
            </button>
            <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
               <img src="https://ui-avatars.com/api/name=Admin&background=000&color=fff" alt="Admin" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && renderDashboardHome()}
          {activeTab === 'orders' && renderOrdersView()}
          {activeTab === 'products' && renderProductsView()}
          {activeTab === 'customers' && renderCustomersView()}
          {activeTab === 'settings' && renderSettingsView()}
        </div>
      </main>

      {/* Return Reason Modal (Global for both list and detail initiate) */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-amber-50/30">
                 <div className="flex items-center gap-3">
                    <RotateCcw className="text-amber-600" size={20} />
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">İade İşlemi Başlat</h3>
                 </div>
                 <button onClick={() => { setIsReturnModalOpen(false); setSelectedOrderId(null); }} className="text-gray-400 hover:text-black p-1">
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleInitiateReturn} className="p-8 space-y-6">
                 <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                    <p className="text-[10px] text-amber-700 leading-relaxed uppercase tracking-widest font-medium">
                      Bu işlem siparişi 'İade Edildi' durumuna çekecektir. Lütfen iade nedenini belirtin.
                    </p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">İade Nedeni</label>
                    <textarea 
                      required
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      rows={4}
                      placeholder="Müşteri şikayeti, hatalı ürün veya cayma hakkı..."
                      className="w-full border border-gray-100 rounded-lg p-4 text-sm focus:ring-2 focus:ring-black/5 outline-none bg-gray-50 transition-all resize-none"
                    ></textarea>
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setIsReturnModalOpen(false); setSelectedOrderId(null); }}
                      className="flex-1 py-4 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
                    >
                      İadeyi Onayla
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;












