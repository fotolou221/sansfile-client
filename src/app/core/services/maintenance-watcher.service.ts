import { effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';
import { isOpenDuringMaintenance, maintenanceUrl } from '../guards/maintenance.guard';

/**
 * Bascule en direct : si l'admin active la maintenance pendant qu'un client ou un coiffeur
 * utilise l'application, il est aussitôt envoyé sur la page de maintenance
 * (le garde de navigation ne couvre que les changements de page).
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceWatcher {
  private readonly router = inject(Router);
  private readonly settings = inject(PlatformSettingsService);
  private readonly currentUrl = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));

    effect(() => {
      const url = this.currentUrl();
      if (url === null || !this.settings.loaded() || !this.settings.maintenanceMode()) return;
      if (!isOpenDuringMaintenance(url)) {
        void this.router.navigateByUrl(maintenanceUrl(this.router, url), { replaceUrl: true });
      }
    });
  }
}
