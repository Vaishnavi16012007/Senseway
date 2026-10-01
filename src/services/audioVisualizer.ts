export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animId: number | null = null;
  private onDataCallback: ((levels: number[]) => void) | null = null;

  public async start(onData: (levels: number[]) => void): Promise<boolean> {
    this.stop();
    this.onDataCallback = onData;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.mediaStream = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const render = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Group into 8 normalized frequency bands (0 to 100%)
        const barCount = 8;
        const step = Math.floor(bufferLength / barCount) || 1;
        const levels: number[] = [];

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j] || 0;
          }
          const avg = sum / step;
          // Scale non-linearly to make normal speech volume prominently visible
          const normalized = Math.min(100, Math.max(12, Math.round((avg / 255) * 120)));
          levels.push(normalized);
        }

        this.onDataCallback?.(levels);
        this.animId = requestAnimationFrame(render);
      };

      this.animId = requestAnimationFrame(render);
      return true;
    } catch (err) {
      console.warn('Microphone visualizer unavailable:', err);
      return false;
    }
  }

  public stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.onDataCallback = null;
  }
}
