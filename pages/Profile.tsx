
import React, { useState, useEffect } from 'react';
import { useAuth, useOrders, useFavorites } from '../store';
import { Package, Heart, User as UserIcon, LogOut, ChevronRight, Truck, CheckCircle2, AlertCircle, MapPin, Box, CreditCard, RotateCcw, Image as ImageIcon, Save, Lock, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/api';

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { orders } = useOrders();
  const { favorites } = useFavorites();
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'tracking' | 'profile'>('orders');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    postalCode: '',
    avatar: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [reportOrderId, setReportOrderId] = useState<string | null>(null);
  const getItemImage = (item: { images: string[] }) => item.images[0] ?? '';
  const reportOrder = orders.find(o => o.id === reportOrderId);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      district: user.district || '',
      city: user.city || '',
      postalCode: user.postalCode || '',
      avatar: user.avatar || ''
    });
  }, [user]);

  useEffect(() => {
    if (!profileSaved) return;
    const timer = window.setTimeout(() => setProfileSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [profileSaved]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    setIsSavingProfile(true);

    if (isUploadingAvatar) {
      setProfileError('Once fotograf yuklemesi tamamlanmali.');
      setIsSavingProfile(false);
      return;
    }

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileError('Ad ve e-posta alanlari zorunludur.');
      setIsSavingProfile(false);
      return;
    }

    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      setProfileError('Sifreler eslesmiyor.');
      setIsSavingProfile(false);
      return;
    }

    const { error } = await updateUser({
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      address: profileForm.address.trim(),
      district: profileForm.district.trim(),
      city: profileForm.city.trim(),
      postalCode: profileForm.postalCode.trim(),
      avatar: profileForm.avatar || undefined,
      ...(newPassword ? { password: newPassword } : {})
    });

    if (error) {
      setProfileError(error);
      setIsSavingProfile(false);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setProfileSaved(true);
    setIsSavingProfile(false);
  };

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const file = files[0];
    setProfileError('');
    setIsUploadingAvatar(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error } = await withTimeout(
        supabase.storage.from('user-avatars').upload(filePath, file, { upsert: true }),
        15000
      );

      if (error) throw error;

      const { data } = supabase.storage.from('user-avatars').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Avatar URL olusturulamadi.');

      setProfileForm((prev) => ({ ...prev, avatar: data.publicUrl }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      const message = err instanceof Error && err.message === 'timeout'
        ? 'Fotograf yukleme zaman asimina ugradi. Lutfen tekrar deneyin.'
        : 'Profil fotografi yuklenemedi.';
      setProfileError(message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <div className="w-full md:w-1/4">
          <div className="flex items-center gap-4 mb-10 pb-10 border-b border-gray-100">
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border border-gray-200" />
            <div>
              <h2 className="font-semibold text-lg">{user.name}</h2>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'profile', label: 'Profilim', icon: UserIcon },
              { id: 'orders', label: 'Siparişlerim', icon: Package },
              { id: 'tracking', label: 'Kargo Takibi', icon: Truck },
              { id: 'favorites', label: 'Favorilerim', icon: Heart },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between p-4 text-[11px] tracking-widest uppercase transition-all ${
                  activeTab === item.id ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} />
                  {item.label}
                </div>
                <ChevronRight size={14} />
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 text-[11px] tracking-widest uppercase text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={16} />
              Çıkış Yap
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="w-full md:w-3/4">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-3xl serif mb-8">Profilim</h2>
              <form onSubmit={handleProfileSave} className="bg-white border border-gray-100 rounded-sm p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={profileForm.avatar || user.avatar || undefined}
                      alt={profileForm.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 border border-gray-200 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <ImageIcon size={14} /> Fotograf Yukle
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarUpload(e.target.files)}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                    {isUploadingAvatar && (
                      <p className="text-[10px] uppercase tracking-widest text-gray-500">Profil fotografi yukleniyor...</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ad Soyad</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">E-posta</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Telefon</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Adres</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ilce</label>
                    <input
                      type="text"
                      value={profileForm.district}
                      onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                      className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Sehir</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Posta Kodu</label>
                    <input
                      type="text"
                      value={profileForm.postalCode}
                      onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                      className="w-full border-b py-3 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Yeni Sifre</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-0 top-3 text-gray-300" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border-b py-3 pl-6 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Yeni Sifre (Tekrar)</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-0 top-3 text-gray-300" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border-b py-3 pl-6 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {profileError && (
                  <p className="text-xs text-red-500 uppercase tracking-widest">{profileError}</p>
                )}
                {profileSaved && (
                  <p className="text-xs text-green-600 uppercase tracking-widest">Profil guncellendi.</p>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-black text-white text-[10px] px-10 py-4 rounded-xl font-bold tracking-[0.2em] uppercase flex items-center gap-3 hover:bg-amber-600 transition-all shadow-lg"
                  >
                    <Save size={16} /> {isSavingProfile ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-3xl serif mb-8">Siparişlerim</h2>
              {orders.length === 0 ? (
                <div className="bg-gray-50 p-12 text-center rounded-sm">
                  <Package className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 uppercase tracking-widest text-xs">Henüz bir siparişiniz bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-100 p-6 rounded-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Sipariş No</p>
                          <p className="font-mono text-sm font-bold">#{order.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Durum</p>
                          <span className={`text-[10px] px-3 py-1 uppercase tracking-widest font-bold rounded-full ${
                            order.status === 'Sipariş Alındı' ? 'bg-blue-50 text-blue-600' :
                            order.status === 'Hazırlandı' ? 'bg-indigo-50 text-indigo-600' :
                            order.status === 'Kargoda' ? 'bg-amber-50 text-amber-600' :
                            order.status === 'İptal Edildi' ? 'bg-red-50 text-red-600' :
                            order.status === 'İade Edildi' ? 'bg-purple-50 text-purple-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {order.items.map(item => (
                          <div key={item.id} className="shrink-0 text-center group">
                            <img src={getItemImage(item)} className="w-16 h-20 object-cover rounded-sm border group-hover:border-black transition-colors" alt={item.name} />
                            <p className="text-[8px] mt-1 text-gray-400 uppercase">{item.quantity} Adet</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                        <div className="flex gap-6">
                           <div>
                              <p className="text-[9px] uppercase tracking-widest text-gray-400">Tarih</p>
                              <p className="text-xs font-medium">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
                           </div>
                           <div>
                              <p className="text-[9px] uppercase tracking-widest text-gray-400">Ödeme</p>
                              <div className="flex items-center gap-1">
                                <CreditCard size={10} />
                                <span className="text-xs font-medium">Visa **** 4242</span>
                              </div>
                           </div>
                        </div>
                        <p className="font-bold text-xl text-black">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              <h2 className="text-3xl serif mb-8">Favorilerim</h2>
              {favorites.length === 0 ? (
                <div className="bg-gray-50 p-12 text-center rounded-sm">
                  <Heart className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 uppercase tracking-widest text-xs">Favori ürününüz bulunmuyor.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {favorites.map((product) => (
                    <div key={product.id} className="flex flex-col">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tracking' && (
            <div>
              <h2 className="text-3xl serif mb-8">Kargo Takibi</h2>
              {orders.filter(o => o.status === 'Kargoda').length === 0 ? (
                <div className="bg-gray-50 p-12 text-center rounded-sm">
                  <Truck className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 uppercase tracking-widest text-xs">Şu an aktif bir kargonuz bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {orders.filter(o => o.status === 'Kargoda').map(order => {
                    const statusOrder = ['Sipariş Alındı', 'Hazırlandı', 'Kargoda', 'Teslim Edildi'];
                    const currentIndex = statusOrder.indexOf(order.status);
                    return (
                    <div key={order.id} className="bg-white border border-gray-100 p-8 rounded-sm shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-50">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-full shadow-lg">
                            <Truck size={32} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xl mb-1">Teslimat Yolunda</h4>
                            <p className="text-[10px] text-gray-400 tracking-widest uppercase">Sipariş No: #{order.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Tahmini Teslimat</p>
                           <p className="font-bold text-sm">Cuma, 14 Mart</p>
                        </div>
                      </div>

                      {/* Milestone Visualizer */}
                      <div className="relative mb-16 px-4">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 left-0 h-0.5 bg-green-500 -translate-y-1/2 transition-all duration-1000" style={{ width: '75%' }}></div>
                        
                        <div className="relative flex justify-between">
                           {[
                             { id: 1, label: 'Sipariş Alındı', status: 'Sipariş Alındı', icon: Box },
                             { id: 2, label: 'Hazırlandı', status: 'Hazırlandı', icon: Package },
                             { id: 3, label: 'Yola Çıktı', status: 'Kargoda', icon: Truck },
                             { id: 4, label: 'Teslim Edildi', status: 'Teslim Edildi', icon: CheckCircle2 }
                           ].map((step) => {
                             const stepIndex = statusOrder.indexOf(step.status);
                             const isActive = stepIndex !== -1 && currentIndex >= stepIndex;
                             return (
                             <div key={step.id} className="flex flex-col items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 ${
                                 isActive ? 'bg-green-500 text-white shadow-md shadow-green-100' : 'bg-white border-2 border-gray-100 text-gray-300'
                               }`}>
                                 <step.icon size={18} />
                               </div>
                               <span className={`text-[9px] font-bold uppercase tracking-widest text-center ${isActive ? 'text-black' : 'text-gray-300'}`}>
                                 {step.label}
                               </span>
                             </div>
                           )})}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-sm border border-gray-100">
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                               <MapPin size={18} className="text-gray-400" />
                               <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Teslimat Adresi</p>
                                  <p className="text-xs font-medium">
                                    {order.shippingAddress?.address || 'Girilmedi'}
                                    {order.shippingAddress?.district ? `, ${order.shippingAddress.district}` : ''}
                                    {order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ''}
                                  </p>
                               </div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                               <Package size={18} className="text-gray-400" />
                               <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Kurye Firması</p>
                                  <p className="text-xs font-medium">{order.shippingCarrier || 'Isis Premium Express'}</p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="mt-8 flex justify-between items-center">
                        <p className="text-xs font-mono text-gray-500">Takip No: <span className="text-black font-bold uppercase">{order.trackingNumber || 'Girilmedi'}</span></p>
                        <button
                          onClick={() => setReportOrderId(order.id)}
                          className="text-[10px] font-bold tracking-[0.2em] uppercase text-black border-b border-black pb-1 hover:opacity-50 transition-opacity"
                        >
                          Detayli Rapor
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {reportOrder && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-widest text-gray-800">Detayli Rapor</h3>
              <button onClick={() => setReportOrderId(null)} className="text-gray-400 hover:text-black">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Siparis No</p>
                <p className="text-sm font-mono">#{reportOrder.id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Kargo Firmasi</p>
                <p className="text-sm font-medium">{reportOrder.shippingCarrier || 'Girilmedi'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Kargo Takip No</p>
                <p className="text-sm font-medium">{reportOrder.trackingNumber || 'Girilmedi'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Durum</p>
                <p className="text-sm font-medium">{reportOrder.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
