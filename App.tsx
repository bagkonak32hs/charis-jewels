
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import CategoryPage from './pages/CategoryPage';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import VideoGeneration from './pages/VideoGeneration';
import SearchResults from './pages/SearchResults';
import About from './pages/About';
import Contact from './pages/Contact';
import Careers from './pages/Careers';
import Stores from './pages/Stores';
import { GlobalProvider, useAuth } from './store';
import { Category } from './types';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState<any>({});
  const { user, logout, isAuthReady } = useAuth();
  const idleTimerRef = useRef<number | undefined>(undefined);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user && ['profile', 'favorites', 'cart', 'animation', 'admin'].includes(currentPage)) {
      setCurrentPage('home');
    }
  }, [user, currentPage, isAuthReady]);

  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(async () => {
      await logout();
      setCurrentPage('home');
    }, 10 * 60 * 1000);
  }, [user, logout]);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    resetIdleTimer();
    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const options: AddEventListenerOptions = { passive: true };
    events.forEach((event) => window.addEventListener(event, resetIdleTimer, options));
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer, options));
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [isAuthReady, user, resetIdleTimer]);

  const handleNavigate = (page: string, params?: any) => {
    if ((page === 'profile' || page === 'favorites' || page === 'cart' || page === 'animation') && !user) {
      setPageParams({ redirectTo: page, ...params });
      setCurrentPage('login');
    } else {
      setCurrentPage(page);
      if (params) setPageParams(params);
    }
  };

  const renderPage = () => {
    if (user?.role === 'admin' && currentPage === 'admin') {
      return (
        <AdminDashboard
          onExitToStore={() => setCurrentPage('home')}
          onLogout={async () => {
            await logout();
            setCurrentPage('home');
          }}
        />
      );
    }

    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'login':
        return <Login onSuccess={() => setCurrentPage(pageParams.redirectTo || 'home')} />;
      case 'category':
        return <CategoryPage category={pageParams.category} />;
      case 'cart':
        return (
          <Cart
            onCheckout={() => setCurrentPage('profile')}
            onContinueShopping={() => setCurrentPage('home')}
          />
        );
      case 'profile':
      case 'favorites':
        return <Profile />;
      case 'search':
        return <SearchResults query={pageParams.query || ''} />;
      case 'animation':
        return <VideoGeneration onBack={() => setCurrentPage('home')} />;
      case 'about':
        return <About />;
      case 'contact':
        return <Contact />;
      case 'careers':
        return <Careers />;
      case 'stores':
        return <Stores />;
      default:
        return <Home />;
    }
  };

  // Special layout for Admin Dashboard
  if (user?.role === 'admin' && currentPage === 'admin') {
    return renderPage();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onNavigate={handleNavigate} />
      <main className="flex-grow">
        {renderPage()}
      </main>
      {user?.role === 'admin' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button 
            onClick={() => handleNavigate('admin')}
            className="bg-red-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform font-bold text-xs tracking-widest uppercase"
          >
            YÖNETİCİ PANELİ
          </button>
        </div>
      )}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
};

export default App;
