import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import {
  Eye,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { analyzeScene } from '../services/sceneUnderstanding';
import type { Detection, SceneObservation } from '../types';

export const VisionPage: React.FC = () => {
  const { speak, stopSpeaking, isSpeaking, settings, updateSettings } = useAccessibility();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnnouncedMap = useRef<Record<string, number>>({});

  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [sceneObservation, setSceneObservation] = useState<SceneObservation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadVisionModel = async () => {
      try {
        setIsModelLoading(true);
        const model = await cocoSsd.load();
        if (isMounted) {
          modelRef.current = model;
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error('Failed to load COCO-SSD model:', err);
        if (isMounted) {
          setIsModelLoading(false);
          setErrorMessage('Failed to initialize AI vision engine. Please refresh and check internet connection.');
        }
      }
    };

    loadVisionModel();

    return () => {
      isMounted = false;
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
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      speak('Vision camera activated. Scanning surroundings for objects.');
      startDetectionLoop();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Unable to access camera. Please allow camera permissions in your browser.');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const detectFrame = useCallback(async () => {
    if (
      !modelRef.current ||
      !videoRef.current ||
      videoRef.current.readyState !== 4
    ) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const rawDetections = await modelRef.current.detect(video);
      const filtered: Detection[] = rawDetections
        .filter((d) => d.score >= settings.detectionSensitivity)
        .map((d) => ({
          class: d.class,
          score: Math.round(d.score * 100),
          bbox: d.bbox,
        }));

      setDetections(filtered);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      filtered.forEach((det) => {
        const [x, y, width, height] = det.bbox;

        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#6D3DF5';
        ctx.shadowBlur = 10;
        ctx.strokeRect(x, y, width, height);

        const label = `${det.class.toUpperCase()} ${det.score}%`;
        ctx.font = 'bold 14px Inter, sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = '#6D3DF5';
        ctx.shadowBlur = 0;
        ctx.fillRect(x, Math.max(0, y - 24), textWidth + 14, 24);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, x + 7, Math.max(16, y - 7));
      });

      if (settings.objectAnnouncements && filtered.length > 0) {
        const now = Date.now();
        const THROTTLE_MS = 10000;

        const candidateToAnnounce = filtered.find((d) => {
          const lastTime = lastAnnouncedMap.current[d.class] || 0;
          return now - lastTime > THROTTLE_MS;
        });

        if (candidateToAnnounce && !isSpeaking) {
          lastAnnouncedMap.current[candidateToAnnounce.class] = now;
          speak(`${candidateToAnnounce.class} detected.`, { interrupt: false });
        }
      }
    } catch (e) {
      console.warn('Frame detection error:', e);
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, [settings.detectionSensitivity, settings.objectAnnouncements, isSpeaking, speak]);

  const startDetectionLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const handleDescribeSurroundings = () => {
    const video = videoRef.current;
    const observation = analyzeScene(
      detections,
      video?.videoWidth || 640,
      video?.videoHeight || 480
    );

    setSceneObservation(observation);
    speak(observation.summary, { interrupt: true });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="card-header-clean" style={{ marginBottom: '20px' }}>
        <div className="card-title-box">
          <div className="card-icon-pill">
            <Eye size={22} />
          </div>
          <div>
            <h2 className="card-title-text" style={{ fontSize: '1.5rem' }}>
              Vision Assistance
            </h2>
            <div className="card-subtitle-text">
              Real-time object detection and intelligent scene description
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            updateSettings({ objectAnnouncements: !settings.objectAnnouncements })
          }
          className="quick-pill"
          aria-label={
            settings.objectAnnouncements
              ? 'Disable automatic object announcements'
              : 'Enable automatic object announcements'
          }
        >
          {settings.objectAnnouncements ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>Announcements: {settings.objectAnnouncements ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {isModelLoading && (
        <div
          className="sense-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '20px',
            background: 'var(--soft-lavender)',
          }}
        >
          <Loader2 size={24} className="animate-spin" color="var(--primary-purple)" />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--primary-purple)' }}>
              Loading TensorFlow.js COCO-SSD Vision Model...
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Initial download may take a few moments
            </div>
          </div>
        </div>
      )}

      <section className="camera-preview-wrapper" aria-label="Real-time Vision Camera">
        <video
          ref={videoRef}
          playsInline
          muted
          className="camera-video-elem"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} className="camera-canvas-overlay" />

        {!cameraActive && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C4B5FD',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <Eye size={60} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
              Vision Camera Standby
            </p>
            <p style={{ fontSize: '0.9rem', color: '#A5A1B8', marginTop: '6px' }}>
              Activate camera to begin real-time neural detection
            </p>
          </div>
        )}
      </section>

      <div className="camera-controls-bar">
        {cameraActive ? (
          <>
            <button onClick={stopCamera} className="btn-secondary">
              <CameraOff size={18} />
              <span>STOP CAMERA</span>
            </button>
            <button
              onClick={handleDescribeSurroundings}
              className="btn-primary"
              disabled={isSpeaking}
            >
              <Sparkles size={18} />
              <span>DESCRIBE SURROUNDINGS</span>
            </button>
          </>
        ) : (
          <button
            onClick={startCamera}
            className="btn-primary"
            disabled={isModelLoading}
          >
            <Camera size={18} />
            <span>START VISION CAMERA</span>
          </button>
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

      {sceneObservation && (
        <section className="scene-summary-box" aria-label="Scene Understanding Summary">
          <div className="scene-summary-title">
            <Sparkles size={18} />
            <span>Scene Understanding</span>
          </div>
          <p className="scene-summary-text">{sceneObservation.summary}</p>
          {sceneObservation.safetyNote && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#FEF3C7',
                color: '#92400E',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <HelpCircle size={16} />
              <span>{sceneObservation.safetyNote}</span>
            </div>
          )}
        </section>
      )}

      <section className="sense-card" style={{ marginTop: '24px' }} aria-label="Detected Objects List">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Eye size={20} />
            </div>
            <div>
              <h3 className="card-title-text">
                Objects Detected ({detections.length})
              </h3>
              <div className="card-subtitle-text">
                Live confidence ratings from COCO-SSD
              </div>
            </div>
          </div>
        </div>

        {detections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.95rem' }}>
              {cameraActive
                ? 'Scanning camera field of view... No objects currently above threshold.'
                : 'Start camera to begin detecting real-time objects.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {detections.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--soft-lavender)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                  {item.class}
                </div>
                <div className="confidence-indicator">
                  <span>{item.score}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default VisionPage;
