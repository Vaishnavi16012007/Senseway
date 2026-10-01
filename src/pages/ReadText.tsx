import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Upload,
  Volume2,
  Square,
  Copy,
  Trash2,
  ScanText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useAccessibility } from '../context/AccessibilityContext';

export const ReadTextPage: React.FC = () => {
  const { speak, stopSpeaking, isSpeaking } = useAccessibility();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to scan');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, []);

  const startCamera = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatusMessage('Camera active. Position text within view.');
      speak('Camera active. Align text in frame and tap Capture.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        'Unable to access camera. Please check camera permissions in your browser or upload an image.'
      );
      setStatusMessage('Camera access failed');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);

    stopCamera();
    runOCR(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      stopCamera();
      runOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runOCR = async (imageSource: string) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setStatusMessage('Recognizing text...');
      setErrorMessage('');

      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatusMessage(`Recognizing text: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const cleanText = result.data.text.trim();
      const conf = Math.round(result.data.confidence);

      setConfidence(conf);
      setRecognizedText(cleanText);
      setIsProcessing(false);

      if (cleanText) {
        setStatusMessage('Text recognized successfully');
        speak(cleanText);
      } else {
        setStatusMessage('No readable text detected');
        speak('No readable text was detected. Please try capturing closer with better lighting.');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setIsProcessing(false);
      setErrorMessage('Failed to read text. Please ensure the image is clear and try again.');
      setStatusMessage('Recognition failed');
    }
  };

  const handleReadAloud = () => {
    if (recognizedText) {
      speak(recognizedText, { interrupt: true });
    }
  };

  const handleCopy = () => {
    if (!recognizedText) return;
    navigator.clipboard.writeText(recognizedText);
    setCopied(true);
    speak('Text copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClear = () => {
    stopSpeaking();
    setRecognizedText('');
    setCapturedImage(null);
    setConfidence(null);
    setProgress(0);
    setStatusMessage('Ready to scan');
    setErrorMessage('');
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <div className="card-header-clean" style={{ marginBottom: '20px' }}>
        <div className="card-title-box">
          <div className="card-icon-pill">
            <ScanText size={22} />
          </div>
          <div>
            <h2 className="card-title-text" style={{ fontSize: '1.5rem' }}>
              Read Text & OCR
            </h2>
            <div className="card-subtitle-text">
              Point at printed signs, labels, or documents for instant audio reading
            </div>
          </div>
        </div>

        {confidence !== null && (
          <div className="confidence-indicator">
            <CheckCircle2 size={14} />
            <span>Confidence: {confidence}%</span>
          </div>
        )}
      </div>

      <section className="camera-preview-wrapper" aria-label="Camera Text Scanning Viewport">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="camera-video-elem"
              aria-label="Live camera feed for text capture"
            />
            <div className="camera-reticle">
              <div className="scan-line" />
            </div>
          </>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured text preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C4B5FD',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <Camera size={56} style={{ marginBottom: '16px', opacity: 0.6 }} />
            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF' }}>
              Camera is currently offline
            </p>
            <p style={{ fontSize: '0.88rem', color: '#A5A1B8', marginTop: '6px' }}>
              Activate the camera or upload an image to extract text
            </p>
          </div>
        )}
      </section>

      {isProcessing && (
        <div className="ocr-progress-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-purple)', marginBottom: '6px' }}>
            <span>EXTRACTING TEXT VIA TESSERACT.JS...</span>
            <span>{progress}%</span>
          </div>
          <div className="ocr-progress-track">
            <div className="ocr-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="camera-controls-bar">
        {cameraActive ? (
          <>
            <button onClick={captureFrame} className="btn-primary">
              <Camera size={18} />
              <span>CAPTURE TEXT</span>
            </button>
            <button onClick={stopCamera} className="btn-secondary">
              <CameraOff size={18} />
              <span>STOP CAMERA</span>
            </button>
          </>
        ) : (
          <button onClick={startCamera} className="btn-primary">
            <Camera size={18} />
            <span>START CAMERA</span>
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary"
          title="Upload image from your files"
        >
          <Upload size={18} />
          <span>UPLOAD IMAGE</span>
        </button>

        {recognizedText && (
          <>
            <button
              onClick={handleReadAloud}
              className="btn-primary"
              style={{ background: 'var(--gradient-purple)' }}
              disabled={isSpeaking}
            >
              <Volume2 size={18} />
              <span>{isSpeaking ? 'READING ALOUD...' : 'READ ALOUD'}</span>
            </button>

            {isSpeaking && (
              <button onClick={stopSpeaking} className="btn-danger">
                <Square size={16} />
                <span>STOP SPEECH</span>
              </button>
            )}

            <button onClick={handleCopy} className="btn-secondary" title="Copy text to clipboard">
              <Copy size={18} />
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>

            <button onClick={handleClear} className="btn-secondary" title="Clear scanned text">
              <Trash2 size={18} />
              <span>CLEAR</span>
            </button>
          </>
        )}
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: '0.9rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <section className="sense-card" aria-label="Detected Text Results">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <ScanText size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Detected Text</h3>
              <div className="card-subtitle-text">{statusMessage}</div>
            </div>
          </div>

          {recognizedText && (
            <button
              onClick={handleReadAloud}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--soft-lavender)',
                color: 'var(--primary-purple)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <Volume2 size={14} />
              <span>Speak</span>
            </button>
          )}
        </div>

        <div
          style={{
            minHeight: '130px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--soft-lavender)',
            border: '1px solid var(--border-subtle)',
            fontSize: '1.15rem',
            color: recognizedText ? 'var(--text-main)' : 'var(--text-muted)',
            fontStyle: recognizedText ? 'normal' : 'italic',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
          }}
        >
          {recognizedText || 'Recognized text will appear here. Tap "Capture" or "Upload Image" to begin.'}
        </div>
      </section>
    </div>
  );
};

export default ReadTextPage;
