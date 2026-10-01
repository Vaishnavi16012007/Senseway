import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import {
  TrafficCone,
  Camera,
  CameraOff,
  Volume2,
  Square,
  Car,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import type { Detection } from '../types';

export const RoadAssistancePage: React.FC = () => {
  const { speak, stopSpeaking, isSpeaking, settings } = useAccessibility();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRoadAnnouncement = useRef<number>(0);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [activeObservations, setActiveObservations] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState('');

  const ROAD_TARGET_CLASSES = new Set([
    'car',
    'truck',
    'bus',
    'motorcycle',
    'bicycle',
    'person',
    'traffic light',
    'stop sign',
    'fire hydrant',
  ]);

  useEffect(() => {
    let mounted = true;
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        const model = await cocoSsd.load();
        if (mounted) {
          modelRef.current = model;
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setIsModelLoading(false);
          setCameraError('Unable to load vision model. Please check connection and refresh.');
        }
      }
    };

    loadModel();

    return () => {
      mounted = false;
      stopCamera();
      stopSpeaking();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError('');
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
      speak('Road assistance activated. Scanning for vehicles, pedestrians, and signals.');
      startDetectionLoop();
    } catch (err: any) {
      console.error(err);
      setCameraError('Unable to access camera for road assistance.');
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
      const raw = await modelRef.current.detect(video);
      const filtered: Detection[] = raw
        .filter(
          (d) =>
            ROAD_TARGET_CLASSES.has(d.class.toLowerCase()) &&
            d.score >= settings.detectionSensitivity
        )
        .map((d) => ({
          class: d.class,
          score: Math.round(d.score * 100),
          bbox: d.bbox,
        }));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      filtered.forEach((det) => {
        const [x, y, width, height] = det.bbox;
        const isVehicle = ['car', 'bus', 'truck', 'motorcycle'].includes(det.class.toLowerCase());

        ctx.strokeStyle = isVehicle ? '#EF4444' : '#8B5CF6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        const label = `${det.class.toUpperCase()} ${det.score}%`;
        ctx.font = 'bold 13px Inter, sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = isVehicle ? '#EF4444' : '#8B5CF6';
        ctx.fillRect(x, Math.max(0, y - 22), textWidth + 12, 22);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, x + 6, Math.max(15, y - 6));
      });

      const observations: string[] = [];
      const vehicleCount = filtered.filter((d) =>
        ['car', 'bus', 'truck', 'motorcycle'].includes(d.class.toLowerCase())
      ).length;
      const trafficLightCount = filtered.filter(
        (d) => d.class.toLowerCase() === 'traffic light'
      ).length;
      const personCount = filtered.filter(
        (d) => d.class.toLowerCase() === 'person'
      ).length;

      if (vehicleCount > 0) {
        observations.push(
          vehicleCount > 1
            ? `${vehicleCount} vehicles detected ahead.`
            : 'Vehicle detected ahead.'
        );
      }
      if (trafficLightCount > 0) {
        observations.push('Traffic light detected.');
      }
      if (personCount > 0) {
        observations.push(
          personCount > 1
            ? `${personCount} pedestrians detected near pathway.`
            : 'Person detected near the road.'
        );
      }

      setActiveObservations(observations);

      const now = Date.now();
      if (
        observations.length > 0 &&
        settings.objectAnnouncements &&
        now - lastRoadAnnouncement.current > 8000 &&
        !isSpeaking
      ) {
        lastRoadAnnouncement.current = now;
        speak(observations.join(' '), { interrupt: false });
      }
    } catch (e) {
      console.warn('Road detection error:', e);
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, [settings.detectionSensitivity, settings.objectAnnouncements, isSpeaking, speak]);

  const startDetectionLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const handleSpeakObservations = () => {
    if (activeObservations.length === 0) {
      speak('No vehicles, pedestrians, or traffic signals detected at this moment.');
    } else {
      speak(activeObservations.join(' '), { interrupt: true });
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="card-header-clean" style={{ marginBottom: '16px' }}>
        <div className="card-title-box">
          <div className="card-icon-pill" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <TrafficCone size={22} />
          </div>
          <div>
            <h2 className="card-title-text" style={{ fontSize: '1.5rem' }}>
              Road Assistance
            </h2>
            <div className="card-subtitle-text">
              Pedestrian environment awareness and transit object notifications
            </div>
          </div>
        </div>
      </div>

      <div className="safety-disclaimer-banner" role="note">
        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Safety Notice:</strong> SenseWay provides informational environmental cues only
          and will never state that it is safe to cross. Always listen for oncoming traffic, observe
          physical pedestrian signals, or seek human assistance when crossing streets.
        </div>
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
          <span style={{ fontWeight: 700, color: 'var(--primary-purple)' }}>
            Loading Road Vision Model...
          </span>
        </div>
      )}

      {cameraError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: '0.9rem',
            marginBottom: '20px',
          }}
          role="alert"
        >
          {cameraError}
        </div>
      )}

      <section className="camera-preview-wrapper" aria-label="Road Assistance Camera Viewport">
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
            <Car size={60} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
              Road Assistant Standby
            </p>
            <p style={{ fontSize: '0.9rem', color: '#A5A1B8', marginTop: '6px' }}>
              Start camera to detect vehicles, traffic lights, and pedestrians
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
            <button onClick={handleSpeakObservations} className="btn-primary">
              <Volume2 size={18} />
              <span>SPEAK OBSERVATIONS</span>
            </button>
            {isSpeaking && (
              <button onClick={stopSpeaking} className="btn-danger">
                <Square size={16} />
                <span>STOP SPEECH</span>
              </button>
            )}
          </>
        ) : (
          <button onClick={startCamera} className="btn-primary" disabled={isModelLoading}>
            <Camera size={18} />
            <span>START ROAD CAMERA</span>
          </button>
        )}
      </div>

      <section className="sense-card" style={{ marginTop: '24px' }} aria-label="Road Observations">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <TrafficCone size={20} />
            </div>
            <div>
              <h3 className="card-title-text">Environmental Observations</h3>
              <div className="card-subtitle-text">
                Live cautionary feedback ({activeObservations.length} active)
              </div>
            </div>
          </div>
        </div>

        {activeObservations.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {cameraActive
              ? 'No road objects or vehicles currently detected.'
              : 'Start camera to see live road observations.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeObservations.map((obs, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--soft-lavender)',
                  border: '1.5px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                <span>{obs}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default RoadAssistancePage;
