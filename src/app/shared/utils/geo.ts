/** Position GPS en degrés décimaux. */
export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/** Position exploitable : nombres finis, dans leurs bornes, et pas 0,0 (valeur par défaut d'une position absente). */
export function isValidPoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/** Distance à vol d'oiseau en kilomètres (formule de haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** « à 350 m », « à 2,4 km », « à 18 km ». */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `à ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  }
  if (km < 10) {
    return `à ${km.toFixed(1).replace('.', ',')} km`;
  }
  return `à ${Math.round(km)} km`;
}
