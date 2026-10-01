import type { Detection, SceneObservation } from '../types';

export function analyzeScene(
  detections: Detection[],
  videoWidth: number = 640,
  _videoHeight: number = 480
): SceneObservation {
  if (!detections || detections.length === 0) {
    return {
      summary: 'No distinct objects detected in the current view. Try panning the camera slowly.',
      objects: [],
      environmentType: 'unknown',
    };
  }

  const counts: Record<string, { count: number; positions: string[] }> = {};

  const outdoorClasses = new Set([
    'car', 'bus', 'truck', 'traffic light', 'stop sign', 'bicycle', 'motorcycle', 'fire hydrant'
  ]);
  const indoorClasses = new Set([
    'chair', 'couch', 'tv', 'laptop', 'mouse', 'keyboard', 'cell phone', 'microwave', 'oven', 'refrigerator', 'book', 'clock', 'vase', 'bed', 'dining table'
  ]);

  let outdoorScore = 0;
  let indoorScore = 0;

  detections.forEach((det) => {
    const cls = det.class.toLowerCase();
    if (outdoorClasses.has(cls)) outdoorScore++;
    if (indoorClasses.has(cls)) indoorScore++;

    const [x, , width] = det.bbox;
    const centerX = x + width / 2;

    let pos = 'in the center';
    if (centerX < videoWidth * 0.35) {
      pos = 'on the left';
    } else if (centerX > videoWidth * 0.65) {
      pos = 'on the right';
    }

    if (!counts[cls]) {
      counts[cls] = { count: 0, positions: [] };
    }
    counts[cls].count += 1;
    if (!counts[cls].positions.includes(pos)) {
      counts[cls].positions.push(pos);
    }
  });

  const environmentType: 'indoor' | 'outdoor' | 'transit' | 'unknown' =
    outdoorScore > indoorScore ? 'outdoor' : indoorScore > 0 ? 'indoor' : 'unknown';

  const objectList = Object.entries(counts).map(([name, data]) => ({
    name,
    count: data.count,
    position: data.positions.join(' and '),
  }));

  const phrases: string[] = [];

  if (environmentType === 'outdoor') {
    phrases.push('You appear to be outdoors or near a roadway.');
  } else if (environmentType === 'indoor') {
    phrases.push('You appear to be indoors.');
  }

  const primaryObjects = objectList.slice(0, 4).map((obj) => {
    const plural = obj.count > 1 ? `${obj.count} ${obj.name}s` : `a ${obj.name}`;
    return `${plural} ${obj.position}`;
  });

  if (primaryObjects.length > 0) {
    phrases.push(`Visible items include ${primaryObjects.join(', ')}.`);
  }

  let safetyNote: string | undefined;
  if (counts['car'] || counts['bus'] || counts['truck'] || counts['motorcycle']) {
    safetyNote = 'Vehicle motion detected in vicinity. Exercise caution around pathways.';
  } else if (counts['traffic light']) {
    safetyNote = 'Traffic signal detected ahead.';
  }

  return {
    summary: phrases.join(' '),
    objects: objectList,
    environmentType,
    safetyNote,
  };
}
