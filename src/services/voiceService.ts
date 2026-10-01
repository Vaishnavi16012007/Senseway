import type { VoiceState } from '../types';

export interface VoiceCommandMatch {
  action:
    | 'LOCATION'
    | 'NEARBY'
    | 'READ_TEXT'
    | 'VISION'
    | 'DESCRIBE_SURROUNDINGS'
    | 'ROAD_ASSISTANCE'
    | 'EMERGENCY'
    | 'SETTINGS'
    | 'HOME'
    | 'UNKNOWN';
  rawTranscript: string;
  confidence: number;
  label: string;
}

export class VoiceAssistantService {
  private recognition: SpeechRecognition | null = null;
  private isListeningActive: boolean = false;
  private onStateChange?: (state: VoiceState) => void;
  private onTranscript?: (transcript: string, isFinal: boolean) => void;
  private onCommandMatched?: (match: VoiceCommandMatch) => void;
  private onError?: (err: string) => void;
  private restartTimeout: number | null = null;

  constructor() {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const rec = new SpeechRecognitionAPI();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 3;
        rec.lang = navigator.language || 'en-US';
        this.recognition = rec;

        this.setupHandlers();
      } catch (err) {
        console.warn('SpeechRecognition constructor error:', err);
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public setCallbacks(handlers: {
    onStateChange: (state: VoiceState) => void;
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onCommandMatched: (match: VoiceCommandMatch) => void;
    onError: (err: string) => void;
  }) {
    this.onStateChange = handlers.onStateChange;
    this.onTranscript = handlers.onTranscript;
    this.onCommandMatched = handlers.onCommandMatched;
    this.onError = handlers.onError;
  }

  // Play a pleasant accessibility audio chime for microphone state transitions
  private playChime(type: 'start' | 'stop' | 'match') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.08, now);

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'match') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }

      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 500);
    } catch {
      // Audio chime optional
    }
  }

  private setupHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListeningActive = true;
      this.onStateChange?.('LISTENING');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const activeText = (final || interim).trim();
      if (activeText) {
        this.onTranscript?.(activeText, !!final);
      }

      // If we got a final phrase, parse and match command
      if (final.trim()) {
        this.onStateChange?.('PROCESSING');
        this.playChime('match');
        const match = this.matchCommand(final.trim());
        this.onCommandMatched?.(match);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('Speech recognition status:', event.error);
      if (event.error === 'not-allowed') {
        this.onError?.('Microphone access was denied. Please allow microphone permission in your browser.');
        this.isListeningActive = false;
        this.onStateChange?.('ERROR');
      } else if (event.error === 'network') {
        this.onError?.('Network error during speech recognition. Please check your internet connection.');
        this.onStateChange?.('ERROR');
      }
    };

    this.recognition.onend = () => {
      if (this.isListeningActive) {
        // Keep listening continuously unless user explicitly stopped
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = window.setTimeout(() => {
          if (this.isListeningActive) {
            try {
              this.recognition?.start();
            } catch {
              this.isListeningActive = false;
              this.onStateChange?.('IDLE');
            }
          }
        }, 150);
      } else {
        this.onStateChange?.('IDLE');
      }
    };
  }

  public async startListening(): Promise<boolean> {
    if (!this.recognition) {
      this.onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    try {
      // First ensure microphone permission is actively granted
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.isListeningActive = true;
      this.playChime('start');
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        this.onError?.('Microphone permission denied. Please allow microphone in browser settings.');
      } else {
        try {
          this.isListeningActive = true;
          this.recognition.start();
          return true;
        } catch {}
      }
      this.onStateChange?.('ERROR');
      return false;
    }
  }

  public stopListening() {
    this.isListeningActive = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.playChime('stop');
      } catch {}
    }
    this.onStateChange?.('IDLE');
  }

  public matchCommand(phrase: string): VoiceCommandMatch {
    const text = phrase.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();

    // 1. Location matches
    if (
      text.includes('where am i') ||
      text.includes('where i am') ||
      text.includes('what is my location') ||
      text.includes('tell me my location') ||
      text.includes('current location') ||
      text.includes('my location') ||
      text.includes('locate me') ||
      text.includes('where am') ||
      text.includes('what place') ||
      text === 'location'
    ) {
      return { action: 'LOCATION', rawTranscript: phrase, confidence: 0.96, label: 'Location Assistance' };
    }

    // 2. Nearby places matches
    if (
      text.includes('what is around me') ||
      text.includes('what is around') ||
      text.includes('around me') ||
      text.includes('what is nearby') ||
      text.includes('nearby places') ||
      text.includes('places near me') ||
      text.includes('nearby') ||
      text.includes('near me') ||
      text.includes('surrounding places') ||
      text.includes('find hospital') ||
      text.includes('find pharmacy') ||
      text.includes('find bus') ||
      text.includes('find food')
    ) {
      return { action: 'NEARBY', rawTranscript: phrase, confidence: 0.95, label: 'Nearby Places' };
    }

    // 3. Read text / OCR matches
    if (
      text.includes('read this') ||
      text.includes('what does this say') ||
      text.includes('read text') ||
      text.includes('scan text') ||
      text.includes('read document') ||
      text.includes('read sign') ||
      text.includes('read board') ||
      text.includes('read paper') ||
      text.includes('scan document') ||
      text.includes('ocr') ||
      text === 'read' ||
      text === 'scan'
    ) {
      return { action: 'READ_TEXT', rawTranscript: phrase, confidence: 0.94, label: 'Read Text OCR' };
    }

    // 4. Describe surroundings / Scene understanding
    if (
      text.includes('describe my surroundings') ||
      text.includes('describe surroundings') ||
      text.includes('what is in front of me') ||
      text.includes('what is in front') ||
      text.includes('what do you see') ||
      text.includes('look around') ||
      text.includes('analyze scene') ||
      text.includes('describe scene') ||
      text.includes('what is ahead')
    ) {
      return { action: 'DESCRIBE_SURROUNDINGS', rawTranscript: phrase, confidence: 0.95, label: 'Scene Description' };
    }

    // 5. Vision Mode
    if (
      text.includes('open vision') ||
      text.includes('vision mode') ||
      text.includes('vision assistance') ||
      text.includes('detect objects') ||
      text.includes('object detection') ||
      text === 'vision'
    ) {
      return { action: 'VISION', rawTranscript: phrase, confidence: 0.93, label: 'Vision Assistance' };
    }

    // 6. Road Assistance
    if (
      text.includes('open road assistance') ||
      text.includes('road assistance') ||
      text.includes('traffic assistance') ||
      text.includes('cross road') ||
      text.includes('street assistance') ||
      text.includes('traffic light') ||
      text.includes('traffic') ||
      text === 'road'
    ) {
      return { action: 'ROAD_ASSISTANCE', rawTranscript: phrase, confidence: 0.94, label: 'Road Assistance' };
    }

    // 7. Emergency
    if (
      text.includes('emergency') ||
      text.includes('help me') ||
      text.includes('i need help') ||
      text.includes('i need emergency help') ||
      text.includes('sos') ||
      text.includes('call sos') ||
      text.includes('urgent help') ||
      text.includes('call emergency') ||
      text.includes('danger')
    ) {
      return { action: 'EMERGENCY', rawTranscript: phrase, confidence: 0.98, label: 'Emergency SOS' };
    }

    // 8. Settings
    if (
      text.includes('open settings') ||
      text.includes('go to settings') ||
      text.includes('settings') ||
      text.includes('preferences') ||
      text.includes('contrast')
    ) {
      return { action: 'SETTINGS', rawTranscript: phrase, confidence: 0.92, label: 'Settings' };
    }

    // 9. Home
    if (
      text.includes('go home') ||
      text.includes('home') ||
      text.includes('dashboard') ||
      text.includes('main menu')
    ) {
      return { action: 'HOME', rawTranscript: phrase, confidence: 0.92, label: 'Home Dashboard' };
    }

    return { action: 'UNKNOWN', rawTranscript: phrase, confidence: 0.5, label: 'General Query' };
  }
}
