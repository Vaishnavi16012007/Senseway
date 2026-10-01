import React, { useState, useEffect } from 'react';
import {
  MapPin,
  RefreshCw,
  Volume2,
  Hospital,
  Bus,
  Store,
  Utensils,
  GraduationCap,
  ShieldAlert,
  Compass,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { getHumanReadableLocation, getRealNearbyPlaces } from '../services/locationService';
import type { LocationResult } from '../services/locationService';
import type { HumanLocation, NearbyPlace, PlaceCategory } from '../types';

export const LocationPage: React.FC = () => {
  const { speak, isSpeaking } = useAccessibility();

  const [locationData, setLocationData] = useState<HumanLocation | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>('ALL');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const categories: PlaceCategory[] = [
    'ALL',
    'HEALTH',
    'TRANSPORT',
    'ESSENTIALS',
    'FOOD',
    'EDUCATION',
    'PUBLIC SERVICES',
  ];

  const fetchLocationAndPlaces = async () => {
    setIsLoadingLocation(true);
    setErrorMessage('');

    try {
      const result: LocationResult = await getHumanReadableLocation();
      setLocationData(result.humanLocation);
      setIsLoadingLocation(false);

      const intro = `You are currently in ${result.humanLocation.city}, ${result.humanLocation.state}.`;
      speak(intro);

      setIsLoadingPlaces(true);
      const nearby = await getRealNearbyPlaces(
        result.internalCoords.latitude,
        result.internalCoords.longitude
      );
      setPlaces(nearby);
      setIsLoadingPlaces(false);

      if (nearby.length > 0) {
        const top3 = nearby.slice(0, 3).map((p) => `${p.name}, ${p.distanceFormatted}`).join('; ');
        speak(`Nearby places include: ${top3}.`);
      } else {
        speak("I couldn't retrieve nearby places right now. Please try again.");
      }
    } catch (err: any) {
      setIsLoadingLocation(false);
      setIsLoadingPlaces(false);
      const msg = err.message || 'Unable to retrieve location. Please check browser permissions.';
      setErrorMessage(msg);
      speak(msg);
    }
  };

  useEffect(() => {
    fetchLocationAndPlaces();
  }, []);

  const handleAnnounceAll = () => {
    if (!locationData) return;
    const filtered =
      selectedCategory === 'ALL'
        ? places
        : places.filter((p) => p.category === selectedCategory);

    if (filtered.length === 0) {
      speak(
        `You are currently in ${locationData.city}, ${locationData.state}. No places found for ${selectedCategory.toLowerCase()}.`
      );
      return;
    }

    const placesSummary = filtered
      .slice(0, 4)
      .map((p) => `${p.name}, ${p.distanceFormatted}`)
      .join('. ');

    speak(
      `You are in ${locationData.city}, ${locationData.state}. In ${selectedCategory.toLowerCase()}, I found: ${placesSummary}.`
    );
  };

  const getCategoryIcon = (cat: PlaceCategory) => {
    switch (cat) {
      case 'HEALTH':
        return Hospital;
      case 'TRANSPORT':
        return Bus;
      case 'FOOD':
        return Utensils;
      case 'EDUCATION':
        return GraduationCap;
      case 'PUBLIC SERVICES':
        return ShieldAlert;
      case 'ESSENTIALS':
      default:
        return Store;
    }
  };

  const filteredPlaces =
    selectedCategory === 'ALL'
      ? places
      : places.filter((p) => p.category === selectedCategory);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      <section className="location-hero-card" aria-label="Current Human Readable Location">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="location-tag">
              <MapPin size={16} />
              <span>📍 YOU ARE HERE</span>
            </div>

            {isLoadingLocation ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
                <Loader2 size={24} className="animate-spin" color="#C4B5FD" />
                <span style={{ fontSize: '1.2rem', color: '#E2D9F3' }}>
                  Resolving readable address...
                </span>
              </div>
            ) : locationData ? (
              <div>
                <h2 className="readable-place-headline">{locationData.city}</h2>
                <p className="readable-address-sub">
                  {[locationData.suburb || locationData.road, locationData.district, locationData.state, locationData.country]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    fontSize: '0.88rem',
                    color: '#FFFFFF',
                  }}
                >
                  <Compass size={15} color="#C4B5FD" />
                  <span>{locationData.fullAddress}</span>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="readable-place-headline">Location Unavailable</h2>
                <p className="readable-address-sub">{errorMessage}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleAnnounceAll}
              disabled={isLoadingLocation || !locationData}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.88rem' }}
              title="Speak Location and Nearby Places"
            >
              <Volume2 size={16} />
              <span>{isSpeaking ? 'SPEAKING...' : 'ANNOUNCE PLACES'}</span>
            </button>

            <button
              onClick={fetchLocationAndPlaces}
              disabled={isLoadingLocation || isLoadingPlaces}
              className="btn-secondary"
              style={{
                padding: '10px 16px',
                fontSize: '0.88rem',
                color: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
              }}
              title="Refresh Location"
            >
              <RefreshCw size={16} className={isLoadingLocation || isLoadingPlaces ? 'animate-spin' : ''} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
              fontSize: '0.9rem',
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
      </section>

      <div className="category-filter-chips" role="tablist" aria-label="Nearby Place Categories">
        {categories.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={selectedCategory === cat}
            className={`cat-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat);
              const count =
                cat === 'ALL'
                  ? places.length
                  : places.filter((p) => p.category === cat).length;
              speak(`${cat}. ${count} places found.`);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <section aria-label="Real Nearby Places">
        <div className="card-header-clean">
          <div className="card-title-box">
            <div className="card-icon-pill">
              <Store size={20} />
            </div>
            <div>
              <h3 className="card-title-text">
                Nearby Places ({filteredPlaces.length})
              </h3>
              <div className="card-subtitle-text">
                Real places around you with distance ranking
              </div>
            </div>
          </div>
        </div>

        {isLoadingPlaces ? (
          <div
            className="sense-card"
            style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}
          >
            <Loader2 size={36} className="animate-spin" color="var(--primary-purple)" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
              Retrieving verified real places around your coordinates...
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              Querying OpenStreetMap infrastructure nodes
            </p>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div
            className="sense-card"
            style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}
          >
            <Store size={40} style={{ opacity: 0.4, margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.05rem' }}>
              No nearby places found for "{selectedCategory}".
            </p>
            <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>
              Try selecting "ALL" or refreshing your location.
            </p>
          </div>
        ) : (
          <div className="nearby-list-grid">
            {filteredPlaces.map((place) => {
              const Icon = getCategoryIcon(place.category);
              return (
                <div
                  key={place.id}
                  className="nearby-place-card"
                  onClick={() => speak(`${place.name}. ${place.type}, ${place.distanceFormatted}.`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    speak(`${place.name}. ${place.type}, ${place.distanceFormatted}.`)
                  }
                  title="Click to speak place details"
                >
                  <div className="place-icon-box">
                    <Icon size={22} />
                  </div>

                  <div className="place-info-body">
                    <h4 className="place-name">{place.name}</h4>
                    <div className="place-type-meta">
                      {place.type} • {place.category}
                    </div>
                    {place.address && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {place.address}
                      </div>
                    )}
                  </div>

                  <div className="place-distance-badge">
                    {place.distanceFormatted}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default LocationPage;
