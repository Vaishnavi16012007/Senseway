import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  MapPin,
  Camera,
  Wifi,
  Radio,
  Sparkles,
  Volume2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { VoiceAssistantService } from '../services/voiceService';
import type { VoiceCommandMatch } from '../services/voiceService';
import { AudioVisualizer } from '../services/audioVisualizer';
import { getHumanReadableLocation } from '../services/locationService';
import type { VoiceState, HumanLocation } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { speak, isSpeaking, stopSpeaking } = useAccessibility();
  const navigate = useNavigate();

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [matchedAction, setMatchedAction] = useState<VoiceCommandMatch | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [humanLoc, setHumanLoc] = useState<HumanLocation | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([14, 18, 14, 22, 14, 18, 14, 16]);

  const voiceServiceRef = useRef<VoiceAssistantService | null>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch human-readable location on load for dashboard overview
  useEffect(() => {
    getHumanReadableLocation()
      .then((res) => setHumanLoc(res.humanLocation))
      .catch(() => {});
  }, []);

  // Initialize voice service & visualizer
  useEffect(() => {
    const service = new VoiceAssistantService();
    voiceServiceRef.current = service;
    visualizerRef.current = new AudioVisualizer();

    service.setCallbacks({
      onStateChange: (state) => setVoiceState(state),
      onTranscript: (text) => setTranscript(text),
      onCommandMatched: (match) => {
        handleVoiceMatch(match);
      },
      onError: (err) => {
        console.warn('Dashboard voice error:', err);
      },
    });

    return () => {
      service.stopListening();
      visualizerRef.current?.stop();
    };
  }, []);

  const handleVoiceMatch = (match: VoiceCommandMatch) => {
    setMatchedAction(match);
    setVoiceState('RESPONDING');

    switch (match.action) {
      case 'LOCATION':
        speak('Opening Location Assistance to find your readable location.');
        setTimeout(() => navigate('/app/location'), 1200);
        break;
      case 'NEARBY':
        speak('Finding real nearby places around your location.');
        setTimeout(() => navigate('/app/location'), 1200);
        break;
      case 'READ_TEXT':
        speak('Opening Read Text OCR.');
        setTimeout(() => navigate('/app/read-text'), 1200);
        break;
      case 'VISION':
      case 'DESCRIBE_SURROUNDINGS':
        speak('Opening Vision Assistant to analyze what is in front of you.');
        setTimeout(() => navigate('/app/vision'), 1200);
        break;
      case 'ROAD_ASSISTANCE':
        speak('Opening Road Assistance.');
        setTimeout(() => navigate('/app/road'), 1200);
        break;
      case 'EMERGENCY':
        speak('Emergency assistance activated. Opening emergency center.');
        setTimeout(() => navigate('/app/emergency'), 1000);
        break;
      case 'SETTINGS':
        speak('Opening Settings.');
        setTimeout(() => navigate('/app/settings'), 1000);
        break;
      default:
        speak(`I heard: "${match.rawTranscript}". Opening Voice Assistant.`);
        setTimeout(() => navigate('/app/voice'), 1500);
        break;
    }
  };

  const toggleQuickAssist = async () => {
    if (!voiceServiceRef.current) return;

    if (voiceState === 'LISTENING') {
      voiceServiceRef.current.stopListening();
      visualizerRef.current?.stop();
      setVoiceState('IDLE');
    } else {
      stopSpeaking();
      setTranscript('');
      setMatchedAction(null);

      // Start live visualizer
      visualizerRef.current?.start((levels) => {
        setAudioLevels(levels);
      });

      // Start listening directly without computer audio feedback interrupting the microphone
      const ok = await voiceServiceRef.current.startListening();
      if (!ok) {
        visualizerRef.current?.stop();
      }
    }
  };

  const handleQuickCommandClick = (cmd: string) => {
    stopSpeaking();
    setTranscript(cmd);
    if (voiceServiceRef.current) {
      const match = voiceServiceRef.current.matchCommand(cmd);
      handleVoiceMatch(match);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const quickPillCommands = [
    { label: 'Where am I?', icon: MapPin },
    { label: 'What is around me?', icon: Compass },
    { label: 'Read this', icon: Sparkles },
    { label: 'What is in front of me?', icon: Radio },
    { label: 'Emergency SOS', icon: AlertTriangle, danger: true },
  ];

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Top Greeting & User Profile Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'var(--soft-lavender)',
              color: 'var(--primary-purple)',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            <Clock size={13} />
            <span>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            {greeting}, {user?.name.split(' ')[0] || 'Member'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '4px' }}>
            Your intelligent accessibility companion is online and ready to assist.
          </p>
        </div>

        {/* User Profile Card */}
        {user && (
          <div
            className="sense-card"
            style={{
              padding: '14px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              minWidth: '250px',
              border: '1.5px solid var(--border-subtle)',
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={user.avatar}
                alt={user.name}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '2px solid var(--secondary-purple)',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  border: '2px solid #FFFFFF',
                }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--success)',
                  marginTop: '2px',
                }}
              >
                <span>● Active Companion</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ASSIST: PREMIER 3D PURPLE HERO CARD */}
      <section className="quick-assist-hero-card" aria-label="Quick Assist Voice Interface">
        <div>
          <div className="quick-assist-badge">
            <Sparkles size={14} />
            <span>SEE • HEAR • UNDERSTAND • NAVIGATE</span>
          </div>

          <h3 className="quick-assist-title">Quick Assist</h3>
          <p className="quick-assist-subtitle">
            {voiceState === 'LISTENING'
              ? 'Listening to you now... Speak naturally in full sentences.'
              : voiceState === 'PROCESSING'
              ? 'Processing speech...'
              : voiceState === 'RESPONDING' || isSpeaking
              ? 'Responding aloud...'
              : '"How can I help you today?"'}
          </p>

          {/* Live Transcript / Feedback Area */}
          {transcript && (
            <div
              style={{
                padding: '12px 18px',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '1rem',
                color: '#FFFFFF',
                maxWidth: '520px',
                border: '1px solid rgba(196, 181, 253, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#C4B5FD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {matchedAction ? `Recognized: ${matchedAction.label}` : 'Listening:'}
              </div>
              <div>"{transcript}"</div>
            </div>
          )}

          {/* Primary Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={toggleQuickAssist}
              className="btn-primary"
              style={{
                padding: '15px 32px',
                fontSize: '1.05rem',
                backgroundColor: voiceState === 'LISTENING' ? '#EF4444' : undefined,
                backgroundImage: voiceState === 'LISTENING' ? 'none' : undefined,
                boxShadow: voiceState === 'LISTENING' ? '0 0 25px rgba(239, 68, 68, 0.6)' : undefined,
              }}
              aria-label={voiceState === 'LISTENING' ? 'Stop listening' : 'Tap to speak'}
            >
              {voiceState === 'LISTENING' ? <MicOff size={20} /> : <Mic size={20} />}
              <span>
                {voiceState === 'LISTENING'
                  ? 'LISTENING... (TAP TO STOP)'
                  : voiceState === 'PROCESSING'
                  ? 'PROCESSING...'
                  : 'TAP TO SPEAK'}
              </span>
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="btn-secondary"
                style={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <span>MUTE VOICE</span>
              </button>
            )}
          </div>

          {/* Quick Voice Command Chips */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', color: '#C4B5FD', marginBottom: '10px' }}>
              OR CHOOSE A QUICK COMMAND:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {quickPillCommands.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleQuickCommandClick(item.label)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      background: item.danger ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                      border: item.danger ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.18)',
                      color: item.danger ? '#FCA5A5' : '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title={`Speak "${item.label}"`}
                  >
                    <Icon size={13} />
                    <span>"{item.label}"</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3D Glowing Microphone Orb & Live Web Audio Visualizer Waveform */}
        <div className="voice-orb-stage">
          <div className="orb-center-wrapper">
            {voiceState === 'LISTENING' && (
              <>
                <div className="orb-pulse-ring" />
                <div className="orb-pulse-ring" />
                <div className="orb-pulse-ring" />
              </>
            )}
            <div
              className={`orb-3d ${voiceState === 'LISTENING' || isSpeaking ? 'active' : ''}`}
              onClick={toggleQuickAssist}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleQuickAssist()}
              title={voiceState === 'LISTENING' ? 'Click to stop listening' : 'Click to start voice recognition'}
              aria-label="3D Microphone Orb"
            >
              {voiceState === 'LISTENING' ? <MicOff size={42} /> : <Mic size={42} />}
            </div>
          </div>

          {/* REAL Dynamic Audio Waveform reacting to live microphone voice frequencies */}
          <div className="waveform-bars" style={{ height: '52px', marginTop: '20px' }}>
            {audioLevels.map((lvl, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  height: voiceState === 'LISTENING' ? `${lvl}%` : isSpeaking ? undefined : '10px',
                  background:
                    voiceState === 'LISTENING'
                      ? 'linear-gradient(180deg, #F43F5E 0%, #8B5CF6 100%)'
                      : 'var(--gradient-purple)',
                }}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color:
                voiceState === 'LISTENING'
                  ? '#F87171'
                  : voiceState === 'PROCESSING'
                  ? '#FBBF24'
                  : voiceState === 'RESPONDING' || isSpeaking
                  ? '#C4B5FD'
                  : '#A5A1B8',
            }}
          >
            ● {voiceState === 'LISTENING' ? 'LISTENING (SPEAK NOW)' : voiceState === 'PROCESSING' ? 'UNDERSTANDING...' : voiceState === 'RESPONDING' || isSpeaking ? 'RESPONDING' : 'STANDBY'}
          </div>
        </div>
      </section>

      {/* SYSTEM STATUS ROW */}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          marginBottom: '16px',
        }}
      >
        SYSTEM STATUS
      </h3>

      <div className="status-grid" style={{ marginBottom: '28px' }}>
        <div className="status-mini-card">
          <div className="status-info-left">
            <div className="status-icon-box">
              <Camera size={18} />
            </div>
            <div>
              <div className="status-label">Camera Sensor</div>
              <div className="status-state-text">
                <div className="status-dot-sm" />
                <span>Online / Ready</span>
              </div>
            </div>
          </div>
        </div>

        <div className="status-mini-card">
          <div className="status-info-left">
            <div className="status-icon-box">
              <MapPin size={18} />
            </div>
            <div>
              <div className="status-label">Location Intelligence</div>
              <div className="status-state-text">
                <div className="status-dot-sm" />
                <span>Ready (OSM Locked)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="status-mini-card">
          <div className="status-info-left">
            <div className="status-icon-box">
              <Radio size={18} />
            </div>
            <div>
              <div className="status-label">Voice / Microphone</div>
              <div className="status-state-text">
                <div className="status-dot-sm" />
                <span>Active & Tuned</span>
              </div>
            </div>
          </div>
        </div>

        <div className="status-mini-card">
          <div className="status-info-left">
            <div className="status-icon-box">
              <Wifi size={18} />
            </div>
            <div>
              <div className="status-label">Network Connectivity</div>
              <div className="status-state-text">
                <div
                  className="status-dot-sm"
                  style={{ backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)' }}
                />
                <span>{isOnline ? 'Online (Connected)' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE ENVIRONMENT & ACCESSIBILITY INSIGHTS (Replacing generic capabilities with contextual companion intel) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Environment Overview Card */}
        <section className="sense-card" aria-label="Current Environment Overview">
          <div className="card-header-clean">
            <div className="card-title-box">
              <div className="card-icon-pill">
                <MapPin size={20} />
              </div>
              <div>
                <h4 className="card-title-text">Current Environment</h4>
                <div className="card-subtitle-text">Verified human-readable location</div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--soft-lavender)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              {humanLoc ? humanLoc.city : 'Locating Area...'}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {humanLoc ? humanLoc.fullAddress : 'Resolving local physical context via OpenStreetMap'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                if (humanLoc) {
                  speak(`You are currently in ${humanLoc.city}, ${humanLoc.state}. ${humanLoc.fullAddress}`);
                } else {
                  speak('Resolving your readable location, please wait.');
                }
              }}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Volume2 size={15} />
              <span>SPEAK LOCATION</span>
            </button>

            <button
              onClick={() => navigate('/app/location')}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <span>EXPLORE PLACES</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* Safety & Emergency Readiness Card */}
        <section className="sense-card" aria-label="Safety and Emergency Status">
          <div className="card-header-clean">
            <div className="card-title-box">
              <div className="card-icon-pill" style={{ background: '#FEF2F2', color: 'var(--danger)' }}>
                <Shield size={20} />
              </div>
              <div>
                <h4 className="card-title-text">Safety & Assistance</h4>
                <div className="card-subtitle-text">Emergency readiness and SOS access</div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
            Emergency contacts and direct one-tap dialing (112) are armed. In any urgent situation,
            say <em>"I need emergency help"</em> or tap SOS to immediately broadcast your readable address.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/app/emergency')}
              className="btn-danger"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              <AlertTriangle size={15} />
              <span>EMERGENCY SOS</span>
            </button>

            <button
              onClick={() => navigate('/app/road')}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <span>ROAD AWARENESS</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
