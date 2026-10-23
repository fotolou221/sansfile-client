import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VitrinePage } from './vitrine-page';
import { PwaService } from '../../shared/services/pwa.service';
import { PublicStats } from './services/vitrine-stats.service';

const stats = (totalSalons: number, activeUsers: number): PublicStats => ({
  activeUsers,
  activeUsersFormatted: String(activeUsers),
  totalSalons,
  totalSalonsFormatted: String(totalSalons),
  satisfactionRate: 98,
  satisfactionRateFormatted: '98%',
  serviceAvailability: '24/7',
  totalTicketsServed: 1500,
});

describe('VitrinePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitrinePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), PwaService],
    }).compileComponents();
  });

  it('should create the vitrine component', () => {
    const fixture = TestBed.createComponent(VitrinePage);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render the hero title and call to action', () => {
    const fixture = TestBed.createComponent(VitrinePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.vitrine-hero__title')?.textContent ?? '';
    expect(title).toContain('Moins d’attente');
    expect(title).toContain('Plus de temps');
    expect(compiled.querySelector('.vitrine-hero__title-highlight')?.textContent).toContain(
      'temps',
    );
    expect(compiled.querySelector('.vitrine-hero a[href="/auth/login"]')).not.toBeNull();
  });

  it('should invite hairdressers to register their salon from the hero', () => {
    const fixture = TestBed.createComponent(VitrinePage);
    fixture.detectChanges();

    const invite = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.vitrine-hero__salon',
    );
    expect(invite?.textContent).toContain('Inscrivez votre salon');
    expect(invite?.href).toContain('https://wa.me/');
  });

  it('should toggle FAQ accordion items', () => {
    const fixture = TestBed.createComponent(VitrinePage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component['faqs']()[0].isOpen).toBe(true);
    component['toggleFaq'](0);
    expect(component['faqs']()[0].isOpen).toBe(false);
  });

  it('should only show real figures once the platform has a significant volume', () => {
    const fixture = TestBed.createComponent(VitrinePage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((req) => req.flush(null));

    component['stats'].set(stats(1, 3));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.vitrine-figures')).toBeNull();

    component['stats'].set(stats(42, 2500));
    fixture.detectChanges();
    const figures = (fixture.nativeElement as HTMLElement).querySelector('.vitrine-figures');
    expect(figures?.textContent).toContain('42');
    expect(figures?.textContent).toContain('1 500');
  });
});
