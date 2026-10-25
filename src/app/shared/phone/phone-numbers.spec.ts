import {
  PHONE_COUNTRIES,
  SENEGAL,
  buildE164,
  countryOfPhone,
  formatInternational,
  formatNational,
  isNationalNumberValid,
  toE164,
} from './phone-numbers';

const country = (iso: string) => PHONE_COUNTRIES.find((c) => c.iso === iso)!;

describe('phone-numbers', () => {
  it('keeps Senegal as the default, with 9-digit mobiles', () => {
    expect(SENEGAL.dial).toBe('221');
    expect(formatNational(SENEGAL, '771234567')).toBe('77 123 45 67');
    expect(isNationalNumberValid(SENEGAL, '77 123 45 67')).toBe(true);
    expect(isNationalNumberValid(SENEGAL, '33 800 12 34')).toBe(false);
    expect(buildE164(SENEGAL, '77 123 45 67')).toBe('+221771234567');
    expect(buildE164(SENEGAL, '+221 77 123 45 67')).toBe('+221771234567');
  });

  it('shows the number as typed, the national 0 being removed only when sending', () => {
    expect(formatNational(country('FR'), '06 12 34 56 78')).toBe('06 12 34 56 78');
    expect(formatNational(country('FR'), '0612345678')).toBe('0612345678');
    expect(formatNational(country('FR'), '+33612345678')).toBe('6 12 34 56 78');
    expect(isNationalNumberValid(country('FR'), '06 12 34 56 78')).toBe(true);
  });

  it('drops the national 0 only where it disappears internationally', () => {
    expect(buildE164(country('FR'), '06 12 34 56 78')).toBe('+33612345678');
    expect(buildE164(country('CI'), '07 01 02 03 04')).toBe('+2250701020304');
    expect(buildE164(country('BJ'), '01 90 12 34 56')).toBe('+2290190123456');
  });

  it('removes a country code pasted in international form only', () => {
    expect(buildE164(country('FR'), '+33 6 12 34 56 78')).toBe('+33612345678');
    expect(buildE164(country('FR'), '0033 6 12 34 56 78')).toBe('+33612345678');
    // Un mobile italien commence par 3… : « 39 » tapé sans + n'est pas l'indicatif
    expect(buildE164(country('IT'), '393 123 4567')).toBe('+393931234567');
  });

  it('normalizes and displays international numbers', () => {
    expect(toE164('77 123 45 67')).toBe('+221771234567');
    expect(toE164('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(toE164('12')).toBeNull();
    expect(countryOfPhone('+212612345678')?.iso).toBe('MA');
    expect(formatInternational('+221771234567')).toBe('+221 77 123 45 67');
    expect(formatInternational('+33612345678')).toBe('+33 6 12 34 56 78');
  });
});
