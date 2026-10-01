import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Mic,
  MapPin,
  ScanText,
  Eye,
  TrafficCone,
  AlertTriangle,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navLinks = [
    { to: '/app', label: 'HOME', icon: Home, end: true },
    { to: '/app/voice', label: 'VOICE ASSISTANT', icon: Mic },
    { to: '/app/location', label: 'LOCATION', icon: MapPin },
    { to: '/app/read-text', label: 'READ TEXT', icon: ScanText },
    { to: '/app/vision', label: 'VISION', icon: Eye },
    { to: '/app/road', label: 'ROAD ASSISTANCE', icon: TrafficCone },
    { to: '/app/emergency', label: 'EMERGENCY', icon: AlertTriangle },
    { to: '/app/settings', label: 'SETTINGS', icon: Settings },
  ];

  return (
    <aside
      className={`sidebar ${isOpen ? 'mobile-open' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-header">
          <div className="brand-icon-box">
            <Sparkles size={22} color="#FFFFFF" />
          </div>
          <div>
            <div className="brand-title">SENSEWAY</div>
            <div className="brand-tagline">SEE • HEAR • UNDERSTAND • NAVIGATE</div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with System Status & User Profile */}
      <div className="sidebar-footer">
        <div className="system-status-pill">
          <div className="status-dot" />
          <span>SYSTEM ONLINE</span>
        </div>

        {user && (
          <div className="user-mini-card">
            <img
              src={user.avatar}
              alt={user.name}
              className="user-avatar-sm"
            />
            <div className="user-info-sm">
              <div className="user-name-sm">{user.name}</div>
              <div className="user-role-sm">● Active</div>
            </div>
            <button
              onClick={logout}
              className="btn-logout-icon"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
