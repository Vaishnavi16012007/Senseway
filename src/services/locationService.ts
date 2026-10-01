import type { HumanLocation, NearbyPlace, PlaceCategory } from '../types';

// Haversine formula to compute accurate distance between two coordinates in meters
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m away`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km away`;
}

// Categorize OpenStreetMap amenity/shop types into SenseWay categories
function categorizeOsmType(type: string, shopType?: string): { category: PlaceCategory; icon: string } {
  const t = (type || '').toLowerCase();
  const s = (shopType || '').toLowerCase();

  if (['hospital', 'clinic', 'pharmacy', 'doctors', 'dentist'].includes(t)) {
    return { category: 'HEALTH', icon: 'hospital' };
  }
  if (['bus_station', 'bus_stop', 'railway_station', 'subway_entrance', 'taxi', 'ferry_terminal'].includes(t)) {
    return { category: 'TRANSPORT', icon: 'bus' };
  }
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'bakery', 'pub', 'bar'].includes(t)) {
    return { category: 'FOOD', icon: 'utensils' };
  }
  if (['school', 'college', 'university', 'kindergarten', 'library'].includes(t)) {
    return { category: 'EDUCATION', icon: 'graduation-cap' };
  }
  if (['police', 'post_office', 'townhall', 'fire_station', 'courthouse', 'embassy'].includes(t)) {
    return { category: 'PUBLIC SERVICES', icon: 'shield-alert' };
  }
  if (['bank', 'atm', 'fuel', 'charging_station', 'marketplace'].includes(t) || s) {
    return { category: 'ESSENTIALS', icon: 'store' };
  }

  return { category: 'ESSENTIALS', icon: 'map-pin' };
}

export interface LocationResult {
  humanLocation: HumanLocation;
  internalCoords: { latitude: number; longitude: number };
}

// Reverse Geocode coordinates to human-readable address only
export async function getHumanReadableLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'SenseWayAccessibilityApp/1.0',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Reverse geocoding network response error');
          }

          const data = await response.json();
          const addr = data.address || {};

          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            'Nearby Locality';

          const suburb = addr.suburb || addr.neighbourhood || addr.residential || '';
          const road = addr.road || addr.street || '';
          const state = addr.state || addr.state_district || '';
          const country = addr.country || '';

          const primaryName = suburb || road || city;
          const secondaryContext = [city, state, country].filter(Boolean).join(', ');
          const fullAddress = [road, suburb, city, state, country].filter(Boolean).join(', ');

          resolve({
            humanLocation: {
              city,
              district: addr.state_district || addr.county || '',
              state,
              country,
              fullAddress: fullAddress || data.display_name || 'Current Location',
              placeName: primaryName ? `${primaryName}, ${secondaryContext}` : secondaryContext,
              road,
              suburb,
            },
            internalCoords: { latitude, longitude },
          });
        } catch (fetchErr) {
          console.warn('Nominatim reverse geocode error:', fetchErr);
          resolve({
            humanLocation: {
              city: 'Detected Area',
              district: '',
              state: 'Regional Location',
              country: '',
              fullAddress: 'Your Current Area (Network Location Active)',
              placeName: 'Your Current Location Area',
            },
            internalCoords: { latitude, longitude },
          });
        }
      },
      (err) => {
        let msg = 'Unable to determine location.';
        if (err.code === 1) msg = 'Location permission was denied. Please allow location access in your browser.';
        else if (err.code === 2) msg = 'Location is unavailable. Please check your GPS or internet connection.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  });
}

// Fetch REAL nearby places using Overpass API
export async function getRealNearbyPlaces(
  lat: number,
  lon: number,
  radiusMeters: number = 2500
): Promise<NearbyPlace[]> {
  try {
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node(around:${radiusMeters},${lat},${lon})["amenity"];
        node(around:${radiusMeters},${lat},${lon})["shop"];
        node(around:${radiusMeters},${lat},${lon})["tourism"];
        node(around:${radiusMeters},${lat},${lon})["highway"="bus_stop"];
      );
      out center 40;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass status ${response.status}`);
    }

    const json = await response.json();
    const elements: any[] = json.elements || [];

    const parsedPlaces: NearbyPlace[] = [];
    const seenNames = new Set<string>();

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];

      if (!name || seenNames.has(name.toLowerCase())) {
        continue;
      }
      seenNames.add(name.toLowerCase());

      const placeLat = el.lat ?? el.center?.lat;
      const placeLon = el.lon ?? el.center?.lon;

      if (!placeLat || !placeLon) continue;

      const dist = calculateDistanceInMeters(lat, lon, placeLat, placeLon);
      const { category, icon } = categorizeOsmType(tags.amenity, tags.shop);

      const typeLabel = tags.amenity
        ? tags.amenity.replace(/_/g, ' ')
        : tags.shop
        ? `${tags.shop.replace(/_/g, ' ')} store`
        : tags.tourism || 'Place of interest';

      parsedPlaces.push({
        id: `osm_${el.id}`,
        name: name,
        category,
        type: typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1),
        distance: dist,
        distanceFormatted: formatDistance(dist),
        address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', '),
        iconName: icon,
      });
    }

    parsedPlaces.sort((a, b) => a.distance - b.distance);
    return parsedPlaces.slice(0, 30);
  } catch (error) {
    console.warn('Overpass lookup failed, trying Nominatim POI search fallback:', error);
    
    try {
      const backupRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=amenity&bounded=1&viewbox=${lon - 0.03},${lat + 0.03},${lon + 0.03},${lat - 0.03}&limit=15`,
        {
          headers: { 'User-Agent': 'SenseWayAccessibilityApp/1.0' },
        }
      );
      if (backupRes.ok) {
        const items = await backupRes.json();
        return items
          .filter((it: any) => it.name)
          .map((it: any) => {
            const dist = calculateDistanceInMeters(lat, lon, parseFloat(it.lat), parseFloat(it.lon));
            const { category, icon } = categorizeOsmType(it.type);
            return {
              id: `nom_${it.place_id}`,
              name: it.name,
              category,
              type: (it.type || 'Point of Interest').replace(/_/g, ' '),
              distance: dist,
              distanceFormatted: formatDistance(dist),
              iconName: icon,
            };
          })
          .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance);
      }
    } catch {
      // Offline fallback
    }

    return [];
  }
}
