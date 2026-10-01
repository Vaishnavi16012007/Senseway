import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Eye, Volume2, VolumeX } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/voice': 'Voice Assistant',
  '/app/location': 'Location Assistance',
  '/app/read-text': 'Read Text & OCR',
  '/app/vision': 'Vision Assistance',
  '/app/road': 'Road Assistance',
  '/app/emergency': 'Emergency Assistance',
  '/app/settings': 'Accessibility Settings',
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const { settings, updateSettings, isSpeaking, stopSpeaking } = useAccessibility();

  const currentTitle = PAGE_TITLES[location.pathname] || 'SenseWay';

  return (
    <header className="app-header" role="banner">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="header-page-title">{currentTitle}</h1>
      </div>

      <div className="header-actions">
        {/* Quick High Contrast Switch */}
        <button
          className="quick-pill"
          onClick={() => updateSettings({ highContrast: !settings.highContrast })}
          aria-label={settings.highContrast ? 'Disable high contrast' : 'Enable high contrast'}
          title="Toggle High Contrast"
        >
          <Eye size={15} />
          <span>{settings.highContrast ? 'Normal' : 'High Contrast'}</span>
        </button>

        {/* Audio Mute/Unmute quick button */}
        <button
          className="quick-pill"
          onClick={() => {
            if (isSpeaking) {
              stopSpeaking();
            } else {
              updateSettings({ voiceFeedback: !settings.voiceFeedback });
            }
          }}
          aria-label={settings.voiceFeedback ? 'Mute voice feedback' : 'Enable voice feedback'}
          title="Voice Feedback"
        >
          {settings.voiceFeedback ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{settings.voiceFeedback ? 'Voice ON' : 'Voice OFF'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
