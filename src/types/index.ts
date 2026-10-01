export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  accessibilityNeed: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccessibilitySettings {
  voiceFeedback: boolean;
  speechRate: number;
  speechPitch: number;
  voiceLanguage: string;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  darkMode: boolean;
  reduceMotion: boolean;
  objectAnnouncements: boolean;
  detectionSensitivity: number;
  emergencyNumber: string;
}

export interface HumanLocation {
  city: string;
  district: string;
  state: string;
  country: string;
  fullAddress: string;
  placeName: string;
  road?: string;
  suburb?: string;
}

export type PlaceCategory = 
  | 'ALL'
  | 'HEALTH'
  | 'TRANSPORT'
  | 'ESSENTIALS'
  | 'FOOD'
  | 'EDUCATION'
  | 'PUBLIC SERVICES';

export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  type: string;
  distance: number; // in meters
  distanceFormatted: string; // e.g., "180 m away", "1.2 km away"
  address?: string;
  iconName: string;
}

export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  timestamp?: number;
}

export interface SceneObservation {
  summary: string;
  objects: { name: string; count: number; position: string }[];
  environmentType: 'indoor' | 'outdoor' | 'transit' | 'unknown';
  safetyNote?: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR';
