import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    // Téléphone réglé en mode sombre
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
    document.body.classList.remove('dark-theme');
  });

  it('uses light mode by default, even when the phone is in dark mode', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('keeps « Système » when the user chose it', () => {
    localStorage.setItem('sansfile-app-theme', 'system');
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
