import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UpdatePrompt } from './update-prompt';
import { PwaService } from '../../services/pwa.service';

describe('UpdatePrompt', () => {
  let pwa: PwaService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdatePrompt],
      providers: [provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();
    pwa = TestBed.inject(PwaService);
    router = TestBed.inject(Router);
  });

  async function renderAt(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(UpdatePrompt);
    await router.navigateByUrl(url);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the prompt inside the application when a new version is ready', async () => {
    pwa.updateAvailable.set(true);
    const el = await renderAt('/client/home');

    expect(el.textContent).toContain('Nouvelle version disponible');
    expect(el.textContent).toContain('Mettre à jour');
    expect(el.textContent).toContain('Plus tard');
  });

  it('stays hidden when no new version is ready', async () => {
    const el = await renderAt('/client/home');

    expect(el.querySelector('.update-prompt')).toBeNull();
  });

  it.each(['/', '/vitrine', '/vitrine?ref=qr'])('never shows on the vitrine (%s)', async (url) => {
    pwa.updateAvailable.set(true);
    const el = await renderAt(url);

    expect(el.querySelector('.update-prompt')).toBeNull();
  });

  it('closes on « Plus tard »', async () => {
    pwa.updateAvailable.set(true);
    const fixture = TestBed.createComponent(UpdatePrompt);
    await router.navigateByUrl('/coiffeur/home');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.update-prompt__btn--secondary')!
      .click();
    fixture.detectChanges();

    expect(pwa.updateDismissed()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.update-prompt')).toBeNull();
  });

  it('applies the update on « Mettre à jour »', async () => {
    const applyUpdate = vi.spyOn(pwa, 'applyUpdate').mockResolvedValue();
    pwa.updateAvailable.set(true);
    const el = await renderAt('/admin/dashboard');

    el.querySelector<HTMLButtonElement>('.update-prompt__btn--primary')!.click();

    expect(applyUpdate).toHaveBeenCalled();
  });
});
