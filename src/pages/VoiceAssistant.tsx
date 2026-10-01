import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  Sparkles,
  Command,
  ArrowRight,
  AlertCircle,
  Send,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { VoiceAssistantService } from '../services/voiceService';
import type { VoiceCommandMatch } from '../services/voiceService';
import { AudioVisualizer } from '../services/audioVisualizer';
import { getHumanReadableLocation, getRealNearbyPlaces } from '../services/locationService';
import type { VoiceState } from '../types';

export const VoiceAssistant: React.FC = () => {
  const { speak, stopSpeaking, isSpeaking } = useAccessibility();
  const navigate = useNavigate();

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>(
    'Hello, I am SenseWay. You can ask me "Where am I?", "What is around me?", "Read this", or "Describe my surroundings".'
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [audioLevels, setAudioLevels] = useState<number[]>([14, 18, 14, 22, 14, 18, 14, 16]);

  const voiceServiceRef = useRef<VoiceAssistantService | null>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);

  const suggestedCommands = [
    'Where am I?',
    'What is around me?',
    'Read this',
    'What does this say?',
    'What is in front of me?',
    'Describe my surroundings',
    'Open road assistance',
    'Open vision',
    'Open settings',
    'Go home',
    'I need emergency help',
  ];

  useEffect(() => {
    const service = new VoiceAssistantService();
    voiceServiceRef.current = service;
    visualizerRef.current = new AudioVisualizer();

    if (!service.isSupported()) {
      setErrorMsg('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }

    service.setCallbacks({
      onStateChange: (state) => {
        setVoiceState(state);
      },
      onTranscript: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          setErrorMsg('');
        }
      },
      onCommandMatched: (match) => {
        processCommand(match);
      },
      onError: (err) => {
        setErrorMsg(err);
      },
    });

    return () => {
      service.stopListening();
      visualizerRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  const processCommand = async (match: VoiceCommandMatch) => {
    setVoiceState('PROCESSING');

    switch (match.action) {
      case 'LOCATION': {
        setLastResponse('Locating your physical position...');
        speak('Locating your position, one moment.');
        try {
          const loc = await getHumanReadableLocation();
          const spoken = `You are currently in ${loc.humanLocation.city}, ${loc.humanLocation.state}. ${loc.humanLocation.fullAddress}`;
          setLastResponse(spoken);
          setVoiceState('RESPONDING');
          speak(spoken);
        } catch (e: any) {
          const errMsg = e.message || 'Unable to retrieve location.';
          setLastResponse(errMsg);
          speak(errMsg);
          setVoiceState('IDLE');
        }
        break;
      }

      case 'NEARBY': {
        setLastResponse('Searching for real verified places around you...');
        speak('Searching for nearby places around your location.');
        try {
          const loc = await getHumanReadableLocation();
          const places = await getRealNearbyPlaces(
            loc.internalCoords.latitude,
            loc.internalCoords.longitude
          );

          if (places.length === 0) {
            const noPlaces = `You are currently in ${loc.humanLocation.city}, ${loc.humanLocation.state}. I couldn't retrieve nearby places right now. Please try again.`;
            setLastResponse(noPlaces);
            speak(noPlaces);
          } else {
            const topPlaces = places.slice(0, 3);
            const placesSummary = topPlaces
              .map((p) => `${p.name}, ${p.distanceFormatted}`)
              .join('; ');
            const answer = `You are in ${loc.humanLocation.city}, ${loc.humanLocation.state}. I found nearby: ${placesSummary}. Opening Location page.`;
            setLastResponse(answer);
            speak(answer);
            setTimeout(() => {
              navigate('/app/location');
            }, 3000);
          }
          setVoiceState('RESPONDING');
        } catch (e: any) {
          const errMsg = e.message || 'Unable to retrieve nearby places right now.';
          setLastResponse(errMsg);
          speak(errMsg);
          setVoiceState('IDLE');
        }
        break;
      }

      case 'READ_TEXT': {
        const resp = 'Opening Read Text OCR. Point your camera at text to capture.';
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        setTimeout(() => navigate('/app/read-text'), 1800);
        break;
      }

      case 'DESCRIBE_SURROUNDINGS':
      case 'VISION': {
        const resp = 'Opening Vision Assistant to analyze what is in front of you.';
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        setTimeout(() => navigate('/app/vision'), 2000);
        break;
      }

      case 'ROAD_ASSISTANCE': {
        const resp = 'Opening Road Assistance. Camera and traffic alerts are active.';
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        setTimeout(() => navigate('/app/road'), 1800);
        break;
      }

      case 'EMERGENCY': {
        const resp = 'Emergency assistance activated. Opening emergency center now.';
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        setTimeout(() => navigate('/app/emergency'), 1500);
        break;
      }

      case 'SETTINGS': {
        const resp = 'Opening Accessibility Settings.';
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        setTimeout(() => navigate('/app/settings'), 1500);
        break;
      }

      case 'HOME': {
        const resp = 'Returning to dashboard.';
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        setTimeout(() => navigate('/app'), 1500);
        break;
      }

      default: {
        const resp = `I heard: "${match.rawTranscript}". Try saying "Where am I?", "What is around me?", or "Describe my surroundings".`;
        setLastResponse(resp);
        setVoiceState('RESPONDING');
        speak(resp);
        break;
      }
    }
  };

  const handleStartListening = async () => {
    setErrorMsg('');
    stopSpeaking();

    // Start live microphone frequency visualizer
    visualizerRef.current?.start((levels) => {
      setAudioLevels(levels);
    });

    const ok = await voiceServiceRef.current?.startListening();
    if (!ok) {
      visualizerRef.current?.stop();
    }
  };

  const handleStopListening = () => {
    voiceServiceRef.current?.stopListening();
    visualizerRef.current?.stop();
    setVoiceState('IDLE');
  };

  const handleClear = () => {
    setTranscript('');
    stopSpeaking();
    setVoiceState('IDLE');
  };

  const handleReplay = () => {
    if (lastResponse) {
      speak(lastResponse, { interrupt: true });
    }
  };

  const handleSuggestedClick = (cmd: string) => {
    setTranscript(cmd);
    if (voiceServiceRef.current) {
      const match = voiceServiceRef.current.matchCommand(cmd);
      processCommand(match);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const cmd = manualInput.trim();
    setManualInput('');
    setTranscript(cmd);
    if (voiceServiceRef.current) {
      const match = voiceServiceRef.current.matchCommand(cmd);
      processCommand(match);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* 3D Microphone Orb Stage */}
      <section className="sense-card" style={{ textAlign: 'center', padding: '36px 24px', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', background: 'var(--soft-lavender)', color: 'var(--primary-purple)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '20px' }}>
          <Sparkles size={15} />
          <span>REAL-TIME VOICE ASSISTANT</span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Voice Assistant
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '28px' }}>
          Speak naturally in full sentences. The live waveform physically reacts to your vocal sound waves.
        </p>

        {/* Central 3D Purple Orb with Concentric Waves */}
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
              onClick={voiceState === 'LISTENING' ? handleStopListening : handleStartListening}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (voiceState === 'LISTENING' ? handleStopListening() : handleStartListening())}
              aria-label={voiceState === 'LISTENING' ? 'Stop listening' : 'Start voice recognition'}
              style={{
                boxShadow: voiceState === 'LISTENING' ? '0 0 50px rgba(244, 63, 94, 0.7)' : undefined,
              }}
            >
              {voiceState === 'LISTENING' ? <MicOff size={42} /> : <Mic size={42} />}
            </div>
          </div>

          {/* REAL Frequency Sound Waves reacting to live mic input */}
          <div className="waveform-bars" style={{ height: '52px', marginTop: '24px' }}>
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

          {/* State Indicator */}
          <div style={{ marginTop: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.08em', color: voiceState === 'LISTENING' ? '#EF4444' : voiceState === 'PROCESSING' ? '#F59E0B' : voiceState === 'RESPONDING' || isSpeaking ? 'var(--primary-purple)' : 'var(--text-muted)' }}>
            ● {voiceState === 'LISTENING' ? 'LISTENING TO YOU (SPEAK NOW)...' : voiceState === 'PROCESSING' ? 'PROCESSING INTENT...' : voiceState === 'RESPONDING' || isSpeaking ? 'RESPONDING ALOUD...' : 'READY'}
          </div>
        </div>

        {/* Controls Bar: START LISTENING, STOP, CLEAR, REPLAY */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          {voiceState === 'LISTENING' ? (
            <button onClick={handleStopListening} className="btn-danger">
              <MicOff size={18} />
              <span>STOP LISTENING</span>
            </button>
          ) : (
            <button onClick={handleStartListening} className="btn-primary">
              <Mic size={18} />
              <span>START LISTENING</span>
            </button>
          )}

          <button onClick={handleReplay} className="btn-secondary" title="Replay Last Spoken Response">
            <Volume2 size={18} />
            <span>REPLAY AUDIO</span>
          </button>

          <button onClick={handleClear} className="btn-secondary" title="Clear current transcript">
            <RotateCcw size={18} />
            <span>CLEAR</span>
          </button>
        </div>

        {/* Fallback Command Input Bar */}
        <form
          onSubmit={handleManualSubmit}
          style={{
            display: 'flex',
            maxWidth: '540px',
            margin: '24px auto 0 auto',
            gap: '8px',
          }}
        >
          <input
            type="text"
            className="form-input"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder='Or type a voice command e.g. "Where am I?"'
            style={{ borderRadius: '9999px', paddingLeft: '20px' }}
          />
          <button type="submit" className="btn-primary" style={{ borderRadius: '9999px', padding: '10px 20px' }}>
            <Send size={16} />
          </button>
        </form>

        {errorMsg && (
          <div style={{ marginTop: '18px', padding: '10px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Transcript & Assistant Response Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Transcript Card */}
        <div className="sense-card">
          <div className="card-header-clean">
            <div className="card-title-box">
              <div className="card-icon-pill">
                <Mic size={20} />
              </div>
              <div>
                <h3 className="card-title-text">Live Transcript</h3>
                <div className="card-subtitle-text">What SenseWay heard</div>
              </div>
            </div>
          </div>
          <div
            style={{
              minHeight: '110px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--soft-lavender)',
              border: '1px solid var(--border-subtle)',
              fontSize: '1.05rem',
              color: transcript ? 'var(--text-main)' : 'var(--text-muted)',
              fontStyle: transcript ? 'normal' : 'italic',
              lineHeight: 1.6,
            }}
          >
            {transcript || 'Start speaking or tap a command below to see your transcript in real-time...'}
          </div>
        </div>

        {/* Assistant Response Card */}
        <div className="sense-card">
          <div className="card-header-clean">
            <div className="card-title-box">
              <div className="card-icon-pill" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#16A34A' }}>
                <Volume2 size={20} />
              </div>
              <div>
                <h3 className="card-title-text">SenseWay Response</h3>
                <div className="card-subtitle-text">Spoken assistance result</div>
              </div>
            </div>
            <button
              onClick={handleReplay}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--soft-lavender)', color: 'var(--primary-purple)', fontSize: '0.8rem', fontWeight: 700 }}
              aria-label="Replay audio response"
            >
              Replay
            </button>
          </div>
          <div
            style={{
              minHeight: '110px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--soft-lavender)',
              border: '1px solid var(--border-subtle)',
              fontSize: '1.05rem',
              color: 'var(--text-main)',
              lineHeight: 1.6,
            }}
          >
            {lastResponse}
          </div>
        </div>
      </div>

      {/* Suggested Commands Section */}
      <section className="sense-card" aria-label="Suggested Voice Commands">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Command size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Suggested Voice Commands</h3>
              <div className="card-subtitle-text">Tap any command to test instant execution</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {suggestedCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleSuggestedClick(cmd)}
              className="cat-chip"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>"{cmd}"</span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default VoiceAssistant;
