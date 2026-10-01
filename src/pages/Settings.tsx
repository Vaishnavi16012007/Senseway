import React, { useState } from 'react';
import {
  Volume2,
  Eye,
  Sliders,
  ShieldCheck,
  UserCheck,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, speak } = useAccessibility();
  const { user, logout, updateProfile } = useAuth();

  const [editName, setEditName] = useState(user?.name || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Permission test states
  const [camStatus, setCamStatus] = useState<string>('Check Status');
  const [micStatus, setMicStatus] = useState<string>('Check Status');
  const [geoStatus, setGeoStatus] = useState<string>('Check Status');

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCamStatus('Permission Granted');
      speak('Camera permission is active and working.');
    } catch {
      setCamStatus('Permission Denied / Unavailable');
      speak('Camera permission was denied or unavailable.');
    }
  };

  const testMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus('Permission Granted');
      speak('Microphone permission is active and working.');
    } catch {
      setMicStatus('Permission Denied / Unavailable');
      speak('Microphone permission was denied or unavailable.');
    }
  };

  const testLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoStatus('Permission Granted');
        speak('Location permission is active and accurate.');
      },
      () => {
        setGeoStatus('Permission Denied');
        speak('Location permission was denied.');
      }
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      updateProfile({ name: editName.trim() });
      setProfileSaved(true);
      speak('Profile updated successfully.');
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. VOICE SETTINGS */}
      <section className="sense-card" aria-label="Voice Feedback Settings">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Volume2 size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Voice Feedback</h3>
              <div className="card-subtitle-text">Speech synthesis and announcement controls</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Enable Voice Responses</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Speaks assistant responses, location, and OCR aloud
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !settings.voiceFeedback;
                updateSettings({ voiceFeedback: nextVal });
                if (nextVal) speak('Voice feedback enabled.');
              }}
              className={settings.voiceFeedback ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              {settings.voiceFeedback ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Speech Speed</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-purple)' }}>
                {settings.speechRate.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary-purple)' }}
              aria-label="Speech speed slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>0.75x (Slower)</span>
              <span>1.0x (Normal)</span>
              <span>1.5x (Faster)</span>
            </div>
          </div>

          <div>
            <label className="form-label">Voice Language</label>
            <select
              className="form-input"
              value={settings.voiceLanguage}
              onChange={(e) => updateSettings({ voiceLanguage: e.target.value })}
              aria-label="Select voice language"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-IN">English (India)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. VISUAL ACCESSIBILITY SETTINGS */}
      <section className="sense-card" aria-label="Visual Display Settings">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Eye size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Visual & Display</h3>
              <div className="card-subtitle-text">High contrast, text scaling, and theme</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>High Contrast Mode</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ultra high-visibility yellow & white outlines on deep black for low-vision users
              </div>
            </div>
            <button
              onClick={() => updateSettings({ highContrast: !settings.highContrast })}
              className={settings.highContrast ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              {settings.highContrast ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Font Size Scaling
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {(['normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateSettings({ fontSize: size })}
                  className={settings.fontSize === size ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 20px', fontSize: '0.88rem', textTransform: 'capitalize' }}
                >
                  {size === 'xlarge' ? 'Extra Large' : size}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Dark Theme</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Reduces glare with low-light deep violet surfaces
              </div>
            </div>
            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className={settings.darkMode ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              {settings.darkMode ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Reduce Motion</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Disables all 3D rotations, pulses, and transitions
              </div>
            </div>
            <button
              onClick={() => updateSettings({ reduceMotion: !settings.reduceMotion })}
              className={settings.reduceMotion ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              {settings.reduceMotion ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </section>

      {/* 3. VISION & SENSITIVITY SETTINGS */}
      <section className="sense-card" aria-label="Vision Sensitivity Settings">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="card-title-text">AI Vision Controls</h3>
              <div className="card-subtitle-text">Throttling and neural confidence threshold</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Automatic Object Announcements</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Automatically speaks newly detected objects with intelligent throttling
              </div>
            </div>
            <button
              onClick={() => updateSettings({ objectAnnouncements: !settings.objectAnnouncements })}
              className={settings.objectAnnouncements ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              {settings.objectAnnouncements ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Detection Sensitivity Threshold</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-purple)' }}>
                {Math.round(settings.detectionSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.85"
              step="0.05"
              value={settings.detectionSensitivity}
              onChange={(e) => updateSettings({ detectionSensitivity: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary-purple)' }}
              aria-label="Detection sensitivity slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>40% (More Detections)</span>
              <span>65% (Balanced)</span>
              <span>85% (High Precision Only)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRIVACY & PERMISSIONS */}
      <section className="sense-card" aria-label="Privacy and Permissions">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Privacy & Permissions</h3>
              <div className="card-subtitle-text">SenseWay only accesses sensors when requested</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--soft-lavender)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Camera Access</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status: {camStatus}</div>
            </div>
            <button onClick={testCamera} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              TEST CAMERA
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--soft-lavender)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Microphone Access</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status: {micStatus}</div>
            </div>
            <button onClick={testMic} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              TEST MIC
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--soft-lavender)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Location Access</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status: {geoStatus}</div>
            </div>
            <button onClick={testLocation} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              TEST LOCATION
            </button>
          </div>
        </div>
      </section>

      {/* 5. ACCOUNT PROFILE */}
      <section className="sense-card" aria-label="Account Profile Management">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Account Profile</h3>
              <div className="card-subtitle-text">Manage your personal settings</div>
            </div>
          </div>

          <button onClick={logout} className="btn-danger" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
            <LogOut size={16} />
            <span>LOGOUT</span>
          </button>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="form-label">Registered Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
              SAVE PROFILE
            </button>
            {profileSaved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700, fontSize: '0.88rem' }}>
                <CheckCircle size={16} />
                Profile updated!
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
};

export default SettingsPage;
