import { distanceKm, formatDistance, isValidPoint } from './geo';

const RUFISQUE = { latitude: 14.7167, longitude: -17.2667 };
const PIKINE = { latitude: 14.7546, longitude: -17.3962 };

describe('geo', () => {
  it('measures the distance between two points', () => {
    expect(distanceKm(RUFISQUE, RUFISQUE)).toBe(0);
    // Rufisque – Pikine : environ 14 km à vol d'oiseau
    expect(distanceKm(RUFISQUE, PIKINE)).toBeGreaterThan(13);
    expect(distanceKm(RUFISQUE, PIKINE)).toBeLessThan(15);
  });

  it('formats distances for people', () => {
    expect(formatDistance(0.01)).toBe('à 50 m');
    expect(formatDistance(0.34)).toBe('à 350 m');
    expect(formatDistance(2.44)).toBe('à 2,4 km');
    expect(formatDistance(18.4)).toBe('à 18 km');
  });

  it('rejects missing or impossible positions', () => {
    expect(isValidPoint(14.7, -17.4)).toBe(true);
    expect(isValidPoint(0, 0)).toBe(false);
    expect(isValidPoint(null, -17.4)).toBe(false);
    expect(isValidPoint(95, -17.4)).toBe(false);
    expect(isValidPoint(Number.NaN, -17.4)).toBe(false);
  });
});
