import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/navigation/Header';
import Footer from '../../components/navigation/Footer';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuthStore } from '../../store/auth.store';

export function RootLayout() {
  const { initAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Global listener for expired refresh token
  useEffect(() => {
    const handleAuthExpired = () => {
      navigate('/login', {
        state: { from: location }
      });
    };
    window.addEventListener('bms:auth:expired', handleAuthExpired);
    return () => window.removeEventListener('bms:auth:expired', handleAuthExpired);
  }, [navigate, location]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-brand selection:text-white">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default RootLayout;

