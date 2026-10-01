import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { AccessibilitySettings } from '../types';

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  speak: (text: string, options?: { interrupt?: boolean; rate?: number }) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  announcement: string;
  announceToScreenReader: (message: string) => void;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  voiceFeedback: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceLanguage: 'en-US',
  highContrast: false,
  fontSize: 'normal',
  darkMode: false,
  reduceMotion: false,
  objectAnnouncements: true,
  detectionSensitivity: 0.65,
  emergencyNumber: '112',
};

const STORAGE_KEY = 'senseway_accessibility_settings';

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync settings changes to documentElement classes & localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Unable to persist accessibility settings:', e);
    }

    const root = document.documentElement;

    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    root.classList.remove('font-large', 'font-xlarge');
    if (settings.fontSize === 'large') {
      root.classList.add('font-large');
    } else if (settings.fontSize === 'xlarge') {
      root.classList.add('font-xlarge');
    }

    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string, options?: { interrupt?: boolean; rate?: number }) => {
    if (!settings.voiceFeedback || !('speechSynthesis' in window)) {
      return;
    }

    const interrupt = options?.interrupt !== false;
    if (interrupt) {
      window.speechSynthesis.cancel();
    }

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    
    utterance.rate = options?.rate ?? settings.speechRate;
    utterance.pitch = settings.speechPitch;
    utterance.lang = settings.voiceLanguage;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e.error);
      }
      setIsSpeaking(false);
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  }, [settings.voiceFeedback, settings.speechRate, settings.speechPitch, settings.voiceLanguage]);

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message);
    setTimeout(() => {
      setAnnouncement('');
    }, 4000);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        speak,
        stopSpeaking,
        isSpeaking,
        announcement,
        announceToScreenReader,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
