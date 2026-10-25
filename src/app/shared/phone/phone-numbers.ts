/** Pays proposé à la connexion par SMS. */
export interface PhoneCountry {
  iso: string;
  name: string;
  /** Indicatif sans « + ». */
  dial: string;
  flag: string;
  /** Exemple de numéro national, sans indicatif. */
  example: string;
  /** Le 0 de tête du numéro national disparaît à l'international (France : 06… → +33 6…). */
  trunkZero?: boolean;
}

/**
 * Pays ouverts à la connexion par SMS : le Sénégal d'abord, puis pays voisins et diaspora.
 * Doit rester identique à PhoneNumbers.ALLOWED_COUNTRY_CODES (sansfile-backend) : le serveur refuse les autres.
 */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: 'SN', name: 'Sénégal', dial: '221', flag: '🇸🇳', example: '77 000 00 00' },
  { iso: 'GM', name: 'Gambie', dial: '220', flag: '🇬🇲', example: '300 00 00' },
  { iso: 'MR', name: 'Mauritanie', dial: '222', flag: '🇲🇷', example: '22 00 00 00' },
  { iso: 'ML', name: 'Mali', dial: '223', flag: '🇲🇱', example: '70 00 00 00' },
  { iso: 'GN', name: 'Guinée', dial: '224', flag: '🇬🇳', example: '620 00 00 00' },
  { iso: 'CI', name: 'Côte d’Ivoire', dial: '225', flag: '🇨🇮', example: '07 00 00 00 00' },
  { iso: 'BF', name: 'Burkina Faso', dial: '226', flag: '🇧🇫', example: '70 00 00 00' },
  { iso: 'NE', name: 'Niger', dial: '227', flag: '🇳🇪', example: '90 00 00 00' },
  { iso: 'TG', name: 'Togo', dial: '228', flag: '🇹🇬', example: '90 00 00 00' },
  { iso: 'BJ', name: 'Bénin', dial: '229', flag: '🇧🇯', example: '01 90 00 00 00' },
  { iso: 'CV', name: 'Cap-Vert', dial: '238', flag: '🇨🇻', example: '991 00 00' },
  { iso: 'GW', name: 'Guinée-Bissau', dial: '245', flag: '🇬🇼', example: '955 000 000' },
  { iso: 'CM', name: 'Cameroun', dial: '237', flag: '🇨🇲', example: '6 70 00 00 00' },
  { iso: 'GA', name: 'Gabon', dial: '241', flag: '🇬🇦', example: '06 00 00 00' },
  { iso: 'CG', name: 'Congo', dial: '242', flag: '🇨🇬', example: '06 000 00 00' },
  {
    iso: 'CD',
    name: 'RD Congo',
    dial: '243',
    flag: '🇨🇩',
    example: '81 000 00 00',
    trunkZero: true,
  },
  { iso: 'MA', name: 'Maroc', dial: '212', flag: '🇲🇦', example: '6 00 00 00 00', trunkZero: true },
  {
    iso: 'DZ',
    name: 'Algérie',
    dial: '213',
    flag: '🇩🇿',
    example: '5 51 23 45 67',
    trunkZero: true,
  },
  { iso: 'TN', name: 'Tunisie', dial: '216', flag: '🇹🇳', example: '20 000 000' },
  { iso: 'FR', name: 'France', dial: '33', flag: '🇫🇷', example: '6 12 34 56 78', trunkZero: true },
  { iso: 'BE', name: 'Belgique', dial: '32', flag: '🇧🇪', example: '470 12 34 56', trunkZero: true },
  { iso: 'CH', name: 'Suisse', dial: '41', flag: '🇨🇭', example: '78 123 45 67', trunkZero: true },
  { iso: 'LU', name: 'Luxembourg', dial: '352', flag: '🇱🇺', example: '621 123 456' },
  { iso: 'ES', name: 'Espagne', dial: '34', flag: '🇪🇸', example: '612 34 56 78' },
  { iso: 'IT', name: 'Italie', dial: '39', flag: '🇮🇹', example: '312 345 6789' },
  {
    iso: 'DE',
    name: 'Allemagne',
    dial: '49',
    flag: '🇩🇪',
    example: '1512 3456789',
    trunkZero: true,
  },
  {
    iso: 'GB',
    name: 'Royaume-Uni',
    dial: '44',
    flag: '🇬🇧',
    example: '7400 123456',
    trunkZero: true,
  },
  { iso: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹', example: '912 345 678' },
  { iso: 'US', name: 'États-Unis / Canada', dial: '1', flag: '🇺🇸', example: '201 555 0123' },
];

export const SENEGAL = PHONE_COUNTRIES[0];

const BY_LONGEST_DIAL = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** Pays d'un numéro international (+221…), d'après l'indicatif le plus long qui correspond. */
export function countryOfPhone(e164: string): PhoneCountry | null {
  const digits = e164.startsWith('+') ? e164.slice(1) : e164;
  return BY_LONGEST_DIAL.find((c) => digits.startsWith(c.dial)) ?? null;
}

/**
 * Numéro au format international +XXXXXXXX, ou null s'il est inexploitable.
 * Sans indicatif, un numéro à 9 chiffres est sénégalais (comme côté serveur).
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  let e164: string;
  if (trimmed.startsWith('+')) e164 = `+${digits}`;
  else if (digits.startsWith('00')) e164 = `+${digits.slice(2)}`;
  else if (digits.length === 9) e164 = `+${SENEGAL.dial}${digits}`;
  else if (digits.startsWith(SENEGAL.dial) && digits.length === 12) e164 = `+${digits}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/** Numéro complet à partir du pays choisi et du numéro saisi (le 0 national de tête est retiré). */
export function buildE164(country: PhoneCountry, national: string): string {
  return `+${country.dial}${nationalDigits(country, national)}`;
}

/**
 * Chiffres du numéro national saisi, longueur bornée. Un numéro collé au format international (+33…, 0033…)
 * perd son indicatif ; le 0 de tête n'est retiré que dans les pays où il disparaît à l'international.
 */
export function nationalDigits(
  country: PhoneCountry,
  value: string,
  keepTrunkZero = false,
): string {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') || digits.startsWith('00')) {
    digits = digits.replace(/^00/, '');
    if (digits.startsWith(country.dial)) digits = digits.slice(country.dial.length);
  } else if (
    country.dial === SENEGAL.dial &&
    digits.length > 9 &&
    digits.startsWith(SENEGAL.dial)
  ) {
    digits = digits.slice(SENEGAL.dial.length);
  }
  if (country.dial === SENEGAL.dial) return digits.slice(0, 9);
  if (country.trunkZero && !keepTrunkZero) digits = digits.replace(/^0+/, '');
  return digits.slice(0, 15 - country.dial.length + (keepTrunkZero && country.trunkZero ? 1 : 0));
}

/** Le numéro national saisi est-il complet ? Sénégal : mobile à 9 chiffres ; ailleurs : 6 chiffres au moins. */
export function isNationalNumberValid(country: PhoneCountry, national: string): boolean {
  const digits = nationalDigits(country, national);
  if (country.dial === SENEGAL.dial) return /^7[05678]\d{7}$/.test(digits);
  return digits.length >= 6;
}

/**
 * Saisie lisible. Sénégal : 77 123 45 67. Ailleurs, le numéro reste tel que tapé (06 12 34 56 78 en France,
 * le 0 n'est retiré qu'à l'envoi) ; un numéro collé au format international perd son indicatif.
 */
export function formatNational(country: PhoneCountry, national: string): string {
  if (country.dial === SENEGAL.dial) {
    const d = nationalDigits(country, national);
    return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
  }
  const trimmed = national.trim();
  if (trimmed.startsWith('+') || trimmed.replace(/\D/g, '').startsWith('00')) {
    return groupPairs(nationalDigits(country, national, true));
  }
  // Saisie libre : chiffres et espaces simples, longueur bornée
  const max = 15 - country.dial.length + (country.trunkZero ? 1 : 0);
  let out = '';
  let count = 0;
  for (const ch of national) {
    if (/\d/.test(ch)) {
      if (count >= max) break;
      out += ch;
      count++;
    } else if (ch === ' ' && out && !out.endsWith(' ')) {
      out += ' ';
    }
  }
  return out;
}

/** 6 12 34 56 78 ou 06 12 34 56 78 : un chiffre seul en tête quand le nombre est impair. */
function groupPairs(digits: string): string {
  const pairs = (s: string) => s.replace(/(\d{2})(?=\d)/g, '$1 ');
  return digits.length % 2 ? `${digits[0]} ${pairs(digits.slice(1))}`.trim() : pairs(digits);
}

/** Affichage d'un numéro international : +221 77 123 45 67, +33 6 12 34 56 78… */
export function formatInternational(e164: string): string {
  const country = countryOfPhone(e164);
  if (!country) return e164;
  const national = e164.replace(/\D/g, '').slice(country.dial.length);
  const grouped =
    country.dial === SENEGAL.dial ? formatNational(country, national) : groupPairs(national);
  return `+${country.dial} ${grouped}`;
}
