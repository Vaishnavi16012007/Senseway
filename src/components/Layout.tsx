import React, { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { Home, Mic, MapPin, Eye, AlertTriangle } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If still checking localStorage auth, show smooth loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#171225',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(139, 92, 246, 0.3)',
              borderTopColor: '#8B5CF6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          />
          <p style={{ letterSpacing: '0.1em', fontWeight: 600 }}>INITIALIZING SENSEWAY...</p>
        </div>
      </div>
    );
  }

  // Route protection: If unauthenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="app-main">
        <Header onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        
        <main className="content-viewport" id="main-content">
          <Outlet />
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
          <NavLink to="/app" end className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          
          <NavLink to="/app/location" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <MapPin size={18} />
            <span>Places</span>
          </NavLink>

          {/* Central elevated voice trigger */}
          <NavLink to="/app/voice" className="mobile-nav-orb-btn" aria-label="Open Voice Assistant">
            <Mic size={22} />
          </NavLink>

          <NavLink to="/app/vision" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <Eye size={18} />
            <span>Vision</span>
          </NavLink>

          <NavLink to="/app/emergency" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={18} color="#EF4444" />
            <span>SOS</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
