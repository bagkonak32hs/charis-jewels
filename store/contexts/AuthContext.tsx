
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AdminProfile } from '../../types';
import { supabase } from '../../lib/supabase';
import { withRetry, withTimeout } from '../../utils/api'; // Assuming a utils file for common functions

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  postal_code: string | null;
  avatar_url: string | null;
};

interface AuthContextType {
  user: User | null;
  isAuthReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string; needsVerification?: boolean }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<{ error?: string }>;
  adminProfile: AdminProfile;
  updateAdminProfile: (updates: Partial<AdminProfile>) => void;
  readCachedAdminRole: (userId: string) => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_CACHE_KEY = 'isis-auth-session';
const PROFILE_CACHE_PREFIX = 'isis-profile-';
const ADMIN_ROLE_CACHE_PREFIX = 'isis-admin-role-';

type CachedProfile = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  avatar?: string;
  updatedAt?: string;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Admin User',
    email: 'info@charisjewels.com',
    phone: '',
    role: 'Admin',
    location: '',
    avatarUrl: ''
  });

  const getProfileKey = (userId: string) => `${PROFILE_CACHE_PREFIX}${userId}`;

  const readCachedProfile = (userId: string): CachedProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(getProfileKey(userId));
      return raw ? JSON.parse(raw) as CachedProfile : null;
    } catch {
      return null;
    }
  };

  const writeCachedProfile = (userId: string, updates: CachedProfile) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getProfileKey(userId), JSON.stringify(updates));
    } catch {
      // Ignore storage failures.
    }
  };

  const isPlaceholderName = (name: string | undefined, email: string) =>
    !name || name === email || name === 'Isis Musteri';

  const applyCachedProfile = (currentUser: User): User => {
    const cached = readCachedProfile(currentUser.id);
    if (!cached) return currentUser;

    const isDefaultAvatar = currentUser.avatar?.includes('ui-avatars.com');
    return {
      ...currentUser,
      name: cached.name && isPlaceholderName(currentUser.name, currentUser.email) ? cached.name : currentUser.name,
      phone: cached.phone && !currentUser.phone ? cached.phone : currentUser.phone,
      address: cached.address && !currentUser.address ? cached.address : currentUser.address,
      district: cached.district && !currentUser.district ? cached.district : currentUser.district,
      city: cached.city && !currentUser.city ? cached.city : currentUser.city,
      postalCode: cached.postalCode && !currentUser.postalCode ? cached.postalCode : currentUser.postalCode,
      avatar: cached.avatar && (isDefaultAvatar || !currentUser.avatar) ? cached.avatar : currentUser.avatar
    };
  };

  const getAdminRoleKey = (userId: string) => `${ADMIN_ROLE_CACHE_PREFIX}${userId}`;

  const readCachedAdminRole = (userId: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(getAdminRoleKey(userId));
    } catch {
      return null;
    }
  };

  const writeCachedAdminRole = (userId: string, role: User['role']) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getAdminRoleKey(userId), role);
    } catch {
      // Ignore storage failures.
    }
  };

  const readSupabaseStoredSession = () => {
    if (typeof window === 'undefined') return null;
    try {
      const authKey = Object.keys(window.localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (!authKey) return null;
      const raw = window.localStorage.getItem(authKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { access_token?: string; refresh_token?: string; user?: { id: string; email?: string | null } };
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        user: parsed.user
      };
    } catch {
      return null;
    }
  };

  const writeCachedSession = (session: { access_token?: string; refresh_token?: string }) => {
    if (typeof window === 'undefined' || !session.access_token || !session.refresh_token) return;
    try {
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }));
    } catch {
      // Ignore
    }
  };

  const clearCachedSession = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
      // Ignore
    }
  };

  const setBasicUser = (authUser: { id: string; email?: string | null }) => {
    const email = authUser.email ?? '';
    const cachedRole = readCachedAdminRole(authUser.id);
    const baseUser: User = {
      id: authUser.id,
      email,
      name: email || 'Isis Musteri',
      role: cachedRole === 'admin' ? 'admin' : 'user',
      avatar: `https://ui-avatars.com/api/?name=${email}&background=0D0D0D&color=fff`,
      phone: '',
      address: '',
      district: '',
      city: '',
      postalCode: ''
    };
    setUser((prev) => applyCachedProfile({ ...baseUser, ...prev }));
  };

  const buildUser = async (authUser: { id: string; email?: string | null }) => {
    try {
      const cachedRole = readCachedAdminRole(authUser.id);
      const [profileResult, adminRoleResult] = await Promise.all([
        withRetry(async () => supabase
          .from('profiles')
          .select('full_name, email, phone, address, district, city, postal_code, avatar_url')
          .eq('id', authUser.id)
          .maybeSingle<ProfileRow>(), 15000), // Increased timeout to 15 seconds
        withRetry(async () => supabase
          .from('admin_roles')
          .select('role')
          .eq('user_id', authUser.id), 15000), // Increased timeout to 15 seconds
      ]);

      const profile = profileResult.data;
      const adminRoles = adminRoleResult.data;
      const adminError = adminRoleResult.error;

      const email = authUser.email ?? profile?.email ?? '';
      const fallbackAdmin = cachedRole === 'admin';
      const isAdmin = (!adminError && Array.isArray(adminRoles) && adminRoles.some((entry) => 
        ['owner', 'admin', 'staff'].includes(typeof entry.role === 'string' ? entry.role.toLowerCase() : '')
      )) || fallbackAdmin;
      writeCachedAdminRole(authUser.id, isAdmin ? 'admin' : 'user');
      const avatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${email}&background=0D0D0D&color=fff`;

      const nextUser: User = {
        id: authUser.id,
        email,
        name: profile?.full_name || email || 'Isis Musteri',
        role: isAdmin ? 'admin' : 'user',
        avatar,
        phone: profile?.phone ?? '',
        address: profile?.address ?? '',
        district: profile?.district ?? '',
        city: profile?.city ?? '',
        postalCode: profile?.postal_code ?? ''
      };

      setUser(applyCachedProfile(nextUser));
    } catch (error) {
      console.error('buildUser failed, using fallback:', error);
      setBasicUser(authUser);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      let session: { user?: { id: string; email?: string | null }; access_token?: string; refresh_token?: string } | null = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('Auth getSession failed:', error.message);
        session = data.session ?? null;
      } catch (error) {
        console.error('Auth getSession failed:', error instanceof Error ? error.message : String(error));
      }

      if (!isMounted) return;

      if (session?.user) {
        writeCachedSession(session);
        setBasicUser(session.user);
        setIsAuthReady(true);
        buildUser(session.user);
      } else {
        const stored = readSupabaseStoredSession();
        if (stored?.user?.id) {
          setBasicUser(stored.user);
          setIsAuthReady(true);
          buildUser(stored.user);
        } else {
          setUser(null);
          setIsAuthReady(true);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        writeCachedSession(session);
        setBasicUser(session.user);
        setIsAuthReady(true);
        buildUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        clearCachedSession();
        setUser(null);
        setIsAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (!data.session) return { needsVerification: true };
      writeCachedSession(data.session);
      if (data.user) await buildUser(data.user);
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: '',
        avatar_url: `https://ui-avatars.com/api/?name=${email}&background=0D0D0D&color=fff`
      });
    }
    return { error: error?.message };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    return { error: error?.message };
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message };
  };

  const logout = async () => {
    setUser(null);
    clearCachedSession();
    if (typeof window !== 'undefined') {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('sb-'))
        .forEach((key) => window.localStorage.removeItem(key));
    }
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Supabase signOut failed:', error);
    }
  };
  
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return { error: 'Lutfen once giris yapin.' };
    let authError: string | undefined;
    let profileError: string | undefined;

    try {
      if (updates.email && updates.email !== user.email) {
        const { error } = await withTimeout(supabase.auth.updateUser({ email: updates.email }), 15000);
        if (error) authError = error.message;
      }

      if (updates.password) {
        const { error } = await withTimeout(supabase.auth.updateUser({ password: updates.password }), 15000);
        if (error) authError = error.message;
      }

      const { error } = await withTimeout(Promise.resolve(supabase.from('profiles').upsert({
        id: user.id,
        full_name: updates.name ?? user.name,
        email: updates.email ?? user.email,
        phone: updates.phone ?? user.phone ?? '',
        address: updates.address ?? user.address ?? '',
        district: updates.district ?? user.district ?? '',
        city: updates.city ?? user.city ?? '',
        postal_code: updates.postalCode ?? user.postalCode ?? '',
        avatar_url: updates.avatar ?? user.avatar ?? ''
      })), 15000);
      if (error) profileError = error.message;
    } catch (error) {
      profileError = error instanceof Error && error.message == 'timeout'
        ? 'Kaydetme istegi zaman asimina ugradi. Lutfen tekrar deneyin.'
        : error instanceof Error ? error.message : String(error);
    }

    if (profileError) {
      return { error: profileError };
    }

    const safeUpdates = { ...updates };
    if (authError && updates.email) {
      delete safeUpdates.email;
    }

    const cachedProfile: CachedProfile = {
      name: safeUpdates.name ?? user.name,
      email: safeUpdates.email ?? user.email,
      phone: safeUpdates.phone ?? user.phone ?? '',
      address: safeUpdates.address ?? user.address ?? '',
      district: safeUpdates.district ?? user.district ?? '',
      city: safeUpdates.city ?? user.city ?? '',
      postalCode: safeUpdates.postalCode ?? user.postalCode ?? '',
      avatar: safeUpdates.avatar ?? user.avatar ?? '',
      updatedAt: new Date().toISOString()
    };
    writeCachedProfile(user.id, cachedProfile);

    setUser(prev => prev ? { ...prev, ...safeUpdates } : prev);
    return { error: authError };
  };

  const updateAdminProfile = (updates: Partial<AdminProfile>) => {
    setAdminProfile(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthReady,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      logout,
      updateUser,
      adminProfile,
      updateAdminProfile,
      readCachedAdminRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
