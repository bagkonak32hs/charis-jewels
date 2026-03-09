
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Order, Product, User } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { withTimeout } from '../../utils/api';

type OrderRow = {
    id: string;
    user_id: string | null;
    total: number;
    status: Order['status'];
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_address: string | null;
    shipping_district: string | null;
    shipping_city: string | null;
    shipping_postal_code: string | null;
    created_at: string;
    order_items?: {
      id?: string | null;
      order_id?: string | null;
      product_id: string | null;
      name: string;
      price: number;
      quantity: number;
      category: string | null;
      image_url: string | null;
    }[];
    shipments?: { id: string; order_id?: string | null; carrier: string | null; tracking_number: string | null; created_at: string }[];
};

const validTransitions: { [key in Order['status']]: Order['status'][] } = {
    'Sipariş Alındı': ['Hazırlandı', 'İptal Edildi'],
    'Hazırlandı': ['Kargoda', 'İptal Edildi'],
    'Kargoda': ['Teslim Edildi', 'İade Edildi'],
    'Teslim Edildi': ['İade Edildi'],
    'İptal Edildi': [],
    'İade Edildi': []
};

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Order) => Promise<{ error?: string }>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<{error?: string}>;
  updateOrderShipping: (orderId: string, updates: Pick<Order, 'shippingCarrier' | 'trackingNumber'>) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const ORDERS_CACHE_PREFIX = 'isis-orders-';

const mapOrderRow = (row: OrderRow): Order => {
    const shipment = row.shipments?.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
    const items = (row.order_items ?? []).map((item) => ({
      id: item.id ?? item.product_id ?? '',
      name: item.name,
      price: item.price,
      category: (item.category as Product['category']) ?? 'KOLYE',
      images: item.image_url ? [item.image_url] : [],
      description: '',
      quantity: item.quantity
    }));

    return {
      id: row.id,
      userId: row.user_id ?? '',
      items,
      total: row.total,
      status: row.status,
      shippingAddress: {
        recipientName: row.shipping_name ?? '',
        phone: row.shipping_phone ?? '',
        address: row.shipping_address ?? '',
        district: row.shipping_district ?? '',
        city: row.shipping_city ?? '',
        postalCode: row.shipping_postal_code ?? ''
      },
      shippingCarrier: shipment?.carrier ?? undefined,
      trackingNumber: shipment?.tracking_number ?? undefined,
      createdAt: row.created_at
    };
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, readCachedAdminRole, isAuthReady } = useAuth();
    const { setProducts } = useProducts();
    const [orders, setOrders] = useState<Order[]>([]);
    const ordersFetchInFlight = useRef(false);
    const ordersFetchQueued = useRef(false);
    const ordersLastFetch = useRef(0);

    const getOrdersKey = (userId: string) => `${ORDERS_CACHE_PREFIX}${userId}`;

    const readCachedOrders = (userId: string): Order[] | null => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(getOrdersKey(userId));
            return raw ? JSON.parse(raw) as Order[] : null;
        } catch { return null; }
    };

    const writeCachedOrders = (userId: string, items: Order[]) => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(getOrdersKey(userId), JSON.stringify(items));
        } catch { /* Ignore */ }
    };
    
    const setOrdersWithCache = useCallback((updater: (prev: Order[]) => Order[]) => {
        setOrders(prev => {
            const next = updater(prev);
            if (user) writeCachedOrders(user.id, next);
            return next;
        });
    }, [user]);

    const fetchOrderDetails = useCallback(async (orderId: string) => {
        const orderSelect = 'id, user_id, total, status, shipping_name, shipping_phone, shipping_address, shipping_district, shipping_city, shipping_postal_code, created_at';
        const { data: orderRow, error } = await supabase.from('orders').select(orderSelect).eq('id', orderId).maybeSingle();
        if (error) { console.error('Order detail fetch failed:', error.message); return; }
        if (!orderRow) return;

        const { data: itemsData, error: itemsError } = await supabase.from('order_items').select('id, order_id, product_id, name, price, quantity, category, image_url').eq('order_id', orderId);
        if (itemsError) console.error('Order items fetch failed:', itemsError.message);

        const { data: shipmentData, error: shipmentError } = await supabase.from('shipments').select('id, order_id, carrier, tracking_number, created_at').eq('order_id', orderId);
        if (shipmentError) console.error('Shipments fetch failed:', shipmentError.message);

        const merged: OrderRow = {
          ...(orderRow as OrderRow),
          order_items: (itemsData ?? []) as OrderRow['order_items'],
          shipments: (shipmentData ?? []) as OrderRow['shipments']
        };
        const mapped = mapOrderRow(merged);
        setOrdersWithCache(prev => {
            const existingIndex = prev.findIndex((order) => order.id === mapped.id);
            if (existingIndex >= 0) {
                const next = prev.slice();
                next[existingIndex] = mapped;
                return next;
            }
            return [mapped, ...prev];
        });
    }, [setOrdersWithCache]);

    const upsertOrder = useCallback((order: Order) => {
        setOrdersWithCache(prev => {
            const existingIndex = prev.findIndex((entry) => entry.id === order.id);
            const next = existingIndex >= 0 ? prev.map(entry => (entry.id === order.id ? order : entry)) : [order, ...prev];
            return next.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        });
    }, [setOrdersWithCache]);

    const removeOrder = useCallback((orderId: string) => {
        setOrdersWithCache(prev => prev.filter(order => order.id !== orderId));
    }, [setOrdersWithCache]);

    const fetchOrders = useCallback(async (currentUser: User, attempt = 0) => {
        const now = Date.now();
        if (ordersFetchInFlight.current) {
            ordersFetchQueued.current = true;
            return;
        }
        if (now - ordersLastFetch.current < 800 && attempt === 0) return;

        ordersFetchInFlight.current = true;
        ordersLastFetch.current = now;
        let isAdmin = currentUser.role === 'admin' || readCachedAdminRole(currentUser.id) === 'admin';

        try {
            if (!isAdmin) {
                const { data: adminRoles, error: adminError } = await supabase.from('admin_roles').select('role').eq('user_id', currentUser.id);
                if (adminError) console.error('Admin role check failed:', adminError.message);
                if (!adminError && adminRoles?.some(e => ['owner', 'admin', 'staff'].includes(e.role?.toLowerCase() ?? ''))) {
                    isAdmin = true;
                }
            }

            const orderSelect = 'id, user_id, total, status, shipping_name, shipping_phone, shipping_address, shipping_district, shipping_city, shipping_postal_code, created_at';
            const base = supabase.from('orders').select(orderSelect).order('created_at', { ascending: false });
            const query = isAdmin ? base : base.eq('user_id', currentUser.id);
            const { data: orderRows, error } = await query;

            if (error || !orderRows) {
                console.error('Orders fetch failed:', error?.message ?? 'no data');
                return;
            }

            if (isAdmin && orderRows.length === 0 && attempt < 2) {
                window.setTimeout(() => fetchOrders(currentUser, attempt + 1), 2000);
                return;
            }

            const orderIds = orderRows.map(row => row.id);
            if (orderIds.length === 0) {
                setOrdersWithCache(() => []);
                return;
            }

            const [{ data: itemsData, error: itemsError }, { data: shipmentData, error: shipmentError }] = await Promise.all([
                supabase.from('order_items').select('id, order_id, product_id, name, price, quantity, category, image_url').in('order_id', orderIds),
                supabase.from('shipments').select('id, order_id, carrier, tracking_number, created_at').in('order_id', orderIds)
            ]);

            if (itemsError) console.error('Order items fetch failed:', itemsError.message);
            if (shipmentError) console.error('Shipments fetch failed:', shipmentError.message);

            const itemsByOrder = new Map<string, OrderRow['order_items']>();
            (itemsData ?? []).forEach(item => {
                const orderId = item.order_id ?? '';
                if (!orderId) return;
                const bucket = itemsByOrder.get(orderId) ?? [];
                bucket.push(item as any);
                itemsByOrder.set(orderId, bucket);
            });

            const shipmentsByOrder = new Map<string, OrderRow['shipments']>();
            (shipmentData ?? []).forEach(shipment => {
                const orderId = shipment.order_id ?? '';
                if (!orderId) return;
                const bucket = shipmentsByOrder.get(orderId) ?? [];
                bucket.push(shipment as any);
                shipmentsByOrder.set(orderId, bucket);
            });

            const merged = orderRows.map(row => ({ ...row, order_items: itemsByOrder.get(row.id) ?? [], shipments: shipmentsByOrder.get(row.id) ?? [] }));
            setOrdersWithCache(() => merged.map(row => mapOrderRow(row as OrderRow)));

        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
              console.error('Orders fetch failed:', error);
            }
        } finally {
            ordersFetchInFlight.current = false;
            if (ordersFetchQueued.current) {
                ordersFetchQueued.current = false;
                window.setTimeout(() => fetchOrders(currentUser), 0);
            }
        }
    }, [readCachedAdminRole, setOrdersWithCache]);

    useEffect(() => {
        if (!isAuthReady) return;
        if (!user) {
            setOrders([]);
            return;
        }
        const cached = readCachedOrders(user.id);
        if (cached?.length) setOrders(cached);
        
        fetchOrders(user);
        const interval = window.setInterval(() => fetchOrders(user), 60000);
        return () => window.clearInterval(interval);
    }, [user, fetchOrders, isAuthReady]);

    useEffect(() => {
        if (!isAuthReady || !user) return;
        
        const isAdmin = user.role === 'admin' || readCachedAdminRole(user.id) === 'admin';
        const orderFilter = isAdmin ? undefined : `user_id=eq.${user.id}`;
        
        const channel = supabase.channel(`orders-sync-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: orderFilter }, payload => {
                if (payload.eventType === 'DELETE') {
                    removeOrder(payload.old.id);
                } else if (payload.new?.id) {
                    const baseRow = { ...(payload.new as OrderRow), order_items: [], shipments: [] };
                    upsertOrder(mapOrderRow(baseRow));
                    fetchOrderDetails(payload.new.id);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, p => p.new?.order_id && fetchOrderDetails(p.new.order_id))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, p => p.new?.order_id && fetchOrderDetails(p.new.order_id))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, readCachedAdminRole, fetchOrderDetails, removeOrder, upsertOrder, isAuthReady]);

    const addOrder = async (order: Order) => {
        if (!user) return { error: 'Lutfen once giris yapin.' };

        const { data: orderRow, error } = await withTimeout(
            supabase.from('orders').insert({
                user_id: user.id,
                total: order.total,
                status: order.status,
                shipping_name: order.shippingAddress?.recipientName ?? user.name ?? '',
                shipping_phone: order.shippingAddress?.phone ?? user.phone ?? '',
                shipping_address: order.shippingAddress?.address ?? user.address ?? '',
                shipping_district: order.shippingAddress?.district ?? user.district ?? '',
                shipping_city: order.shippingAddress?.city ?? user.city ?? '',
                shipping_postal_code: order.shippingAddress?.postalCode ?? user.postalCode ?? ''
            }).select('id, user_id, total, status, shipping_name, shipping_phone, shipping_address, shipping_district, shipping_city, shipping_postal_code, created_at').single(), 20000);

        if (error || !orderRow) return { error: error?.message ?? 'Siparis olusturulamadi.' };

        const localItemsPayload = order.items.map(item => ({ ...item, order_id: orderRow.id, product_id: item.id }));
        
        const dbItemsPayload = localItemsPayload.map(p => ({
            order_id: p.order_id,
            product_id: p.product_id,
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            category: p.category,
            image_url: p.images?.[0] ?? null
        }));

        const { error: itemError } = await supabase.from('order_items').insert(dbItemsPayload);
        if (itemError) return { error: itemError.message };

        try {
            await Promise.all(order.items.map(async (item) => {
                const { data: productRow, error: productError } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', item.id)
                    .maybeSingle();

                if (productError) {
                    console.error('Stock fetch failed:', productError.message);
                    return; // Skip this item if stock cannot be fetched
                }
                const currentStock = typeof productRow?.stock === 'number' ? productRow.stock : 0;
                const nextStock = Math.max(0, currentStock - item.quantity);

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ stock: nextStock })
                    .eq('id', item.id);

                if (updateError) {
                    console.error('Stock update failed:', updateError.message);
                }
            }));
            setProducts(prev => prev.map(p => {
                const match = order.items.find(item => item.id === p.id);
                if (!match) return p;
                return { ...p, stock: Math.max(0, (p.stock ?? 0) - match.quantity) };
            }));
        } catch (error) { // Changed from rpcError to generic error
            console.error('Stock update failed:', error);
        }
        
        await supabase.from('order_status_events').insert({ order_id: orderRow.id, status: order.status, created_by: user.id });

        upsertOrder(mapOrderRow({ ...orderRow, order_items: localItemsPayload } as OrderRow));
        return {};
    };

    const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return { error: "Sipariş bulunamadı." };

        if (!validTransitions[order.status]?.includes(newStatus)) {
            return { error: `Durum '${order.status}' iken '${newStatus}' durumuna geçirilemez.` };
        }
        if (newStatus === 'Kargoda' && (!order.shippingCarrier?.trim() || !order.trackingNumber?.trim())) {
            return { error: 'Kargoya vermek için Kargo Firması ve Takip Numarası girilmelidir.'};
        }
    
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) return { error: error.message };

        if (user) {
          await supabase.from('order_status_events').insert({ order_id: orderId, status: newStatus, created_by: user.id });
        }
    
        setOrdersWithCache(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
        return {};
    };

    const updateOrderShipping = async (orderId: string, updates: Pick<Order, 'shippingCarrier' | 'trackingNumber'>) => {
        const carrier = updates.shippingCarrier?.trim() ?? '';
        const trackingNumber = updates.trackingNumber?.trim() ?? '';

        const { error } = await supabase
            .from('shipments')
            .upsert({ order_id: orderId, carrier, tracking_number: trackingNumber }, { onConflict: 'order_id' });

        if (error) {
            console.error('Shipment upsert failed:', error.message);
            return;
        }

        setOrdersWithCache(prev => prev.map(o => o.id === orderId ? { ...o, shippingCarrier: carrier, trackingNumber } : o));
    };

    const getOrderById = (orderId: string) => orders.find(o => o.id === orderId);

    return (
        <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, updateOrderShipping, getOrderById }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrders = () => {
    const context = useContext(OrderContext);
    if (context === undefined) throw new Error('useOrders must be used within an OrderProvider');
    return context;
};
