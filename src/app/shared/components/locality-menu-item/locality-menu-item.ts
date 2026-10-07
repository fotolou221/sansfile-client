import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalityService } from '../../services/locality.service';

/**
 * Ligne « Ma localité » des profils client et coiffeur : affiche la localité du compte et ouvre la
 * page de changement (la localité d'un coiffeur rattaché suit celle de son salon).
 */
@Component({
  selector: 'app-locality-menu-item',
  template: `
    <button type="button" class="profile-page__menu-item" (click)="open()">
      <span class="profile-page__menu-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </span>
      <span class="profile-page__menu-label">
        Ma localité
        <span class="locality-menu-item__value">{{ value() }}</span>
      </span>
      <span class="profile-page__menu-chevron" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </button>
  `,
  styleUrl: '../../../features/client/profile/client-profile-page.scss',
  styles: `
    :host {
      display: block;
    }

    .locality-menu-item__value {
      display: block;
      margin-top: 2px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary, #64748b);
    }
  `,
})
export class LocalityMenuItem implements OnInit {
  private readonly localityService = inject(LocalityService);
  private readonly router = inject(Router);

  protected readonly value = computed(() => {
    const account = this.localityService.account();
    if (account?.source === 'SALON') return `${account.localityName} (localité du salon)`;
    if (account?.requestedLocality) return `${account.requestedLocality} (pas encore ouverte)`;
    return this.localityService.accountLocalityName() ?? 'À choisir';
  });

  ngOnInit(): void {
    void this.localityService.loadAccount();
  }

  protected open(): void {
    void this.router.navigate(['/ma-localite'], {
      queryParams: { changer: 1, redirect: this.router.url },
    });
  }
}
