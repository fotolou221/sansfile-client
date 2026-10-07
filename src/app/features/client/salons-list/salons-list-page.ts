import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientLayout } from '../../../shared/components/client-layout/client-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SearchBar } from '../../../shared/components/search-bar/search-bar';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { SalonService } from '../../../shared/services/salon.service';
import { FavoritesService } from '../../../shared/services/favorites.service';
import { LocalityService } from '../../../shared/services/locality.service';
import { LocalityPickerSheet } from '../../../shared/components/locality-picker/locality-picker-sheet';
import { Salon } from '../../../shared/models/salon';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

@Component({
  selector: 'app-salons-list-page',
  imports: [
    RouterLink,
    ClientLayout,
    PageHeader,
    SearchBar,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadge,
    LocalityPickerSheet,
  ],
  template: `
    <app-client-layout activeNav="home">
      <!-- Fixed Sticky Page Header -->
      <div slot="header" class="salons-header-sticky">
        <app-page-header title="Tous les salons" backRoute="/client/home" />
      </div>

      <div class="salons-page">
        <!-- Intro Hero Section -->
        <section class="salons-page__hero">
          <h1 class="salons-page__hero-title">
            {{
              localityService.viewingAll()
                ? 'Tous nos salons'
                : 'Salons à ' + localityService.viewedLabel()
            }}
          </h1>
          <button
            type="button"
            class="salons-page__locality-btn"
            (click)="localityService.openPicker()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Changer de localité</span>
          </button>
        </section>

        <!-- Search Bar -->
        <section class="salons-page__search-section">
          <app-search-bar
            [value]="searchQuery()"
            (valueChange)="onSearchChange($event)"
            placeholder="Rechercher un salon (toutes localités)…"
          />
        </section>

        @if (salonService.loading()) {
          <div class="salons-page__skeleton-wrap">
            <app-skeleton-loader type="salon" [count]="4" />
          </div>
        } @else if (salonService.error()) {
          <app-error-state
            [message]="salonService.error()!"
            (retry)="salonService.loadSalons(true)"
          />
        } @else {
          @if (filteredSalons().length === 0) {
            @if (searchQuery()) {
              <app-empty-state
                icon="search"
                title="Aucun salon trouvé"
                description="Essayez une autre recherche pour découvrir nos salons partenaires."
                actionLabel="Effacer la recherche"
                (action)="clearSearch()"
              />
            } @else if (!localityService.viewingAll()) {
              <app-empty-state
                icon="search"
                [title]="'Pas encore de salon à ' + localityService.viewedLabel()"
                description="Les salons de cette localité arrivent bientôt. En attendant, découvrez ceux des autres localités."
                actionLabel="Voir toutes les localités"
                (action)="localityService.setViewed('all')"
              />
            } @else {
              <app-empty-state
                icon="search"
                title="Aucun salon pour le moment"
                description="Les salons partenaires de SansFile apparaîtront dès leur ouverture."
              />
            }
          } @else {
            <!-- Section 1: Salons recommandés (Horizontaux) -->
            @if (featuredSalons().length > 0) {
              <section class="salons-page__featured-section">
                <div class="salons-page__section-header">
                  <div class="salons-page__title-group">
                    <h2 class="salons-page__section-title">Salons recommandés</h2>
                  </div>
                  <span class="salons-page__section-pill">{{ featuredSalons().length }}</span>
                </div>

                <div class="salons-page__horizontal-scroll">
                  @for (salon of featuredSalons(); track salon.id) {
                    <a [routerLink]="['/client/salons', salon.id]" class="horizontal-card">
                      <div class="horizontal-card__cover-wrap">
                        <img
                          [src]="salon.coverUrl || defaultCover"
                          [alt]="salon.name"
                          class="horizontal-card__cover"
                          (error)="onCoverError($event)"
                          loading="lazy"
                        />
                        <div class="horizontal-card__overlay"></div>
                        <div class="horizontal-card__status">
                          <app-status-badge [status]="salon.status" />
                        </div>
                        <button
                          type="button"
                          class="horizontal-card__fav-btn"
                          [class.horizontal-card__fav-btn--active]="isFav(salon.id)"
                          (click)="onToggleFavorite($event, salon)"
                          [attr.aria-label]="
                            isFav(salon.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'
                          "
                        >
                          <svg
                            viewBox="0 0 24 24"
                            [attr.fill]="isFav(salon.id) ? '#ef4444' : 'none'"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path
                              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                            />
                          </svg>
                        </button>
                      </div>

                      <div class="horizontal-card__details">
                        <div class="horizontal-card__avatar-row">
                          <img
                            [src]="salon.avatarUrl || defaultAvatar"
                            [alt]="salon.name"
                            class="horizontal-card__avatar"
                            (error)="onAvatarError($event)"
                          />
                          <div class="horizontal-card__meta">
                            <h3 class="horizontal-card__title">{{ salon.name }}</h3>
                            <span class="horizontal-card__location">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{{ locationLabel(salon) }}</span>
                            </span>
                          </div>
                        </div>

                        <div class="horizontal-card__footer">
                          <span class="horizontal-card__queue">
                            <strong>{{ salon.peopleWaiting }}</strong> en attente
                          </span>
                          <span class="horizontal-card__arrow">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </a>
                  }
                </div>
              </section>
            }

            <!-- Section 2: Grille 2 par ligne -->
            <section class="salons-page__grid-section">
              <div class="salons-page__section-header">
                <div class="salons-page__title-group">
                  <h2 class="salons-page__section-title">
                    {{ searchQuery() ? 'Résultats trouvés' : 'Tous les salons' }}
                  </h2>
                </div>
                <span class="salons-page__section-pill"
                  >{{ filteredSalons().length }} disponibles</span
                >
              </div>

              <div class="salons-page__grid">
                @for (salon of filteredSalons(); track salon.id) {
                  <a [routerLink]="['/client/salons', salon.id]" class="grid-card">
                    <div class="grid-card__cover-wrap">
                      <img
                        [src]="salon.coverUrl || salon.avatarUrl || defaultCover"
                        [alt]="salon.name"
                        class="grid-card__cover"
                        (error)="onCoverError($event)"
                        loading="lazy"
                      />
                      <div class="grid-card__overlay"></div>

                      <!-- Status Dot -->
                      <div class="grid-card__top-bar">
                        <span
                          class="grid-card__status-tag"
                          [class.grid-card__status-tag--open]="salon.status === 'open'"
                        >
                          <span class="grid-card__status-dot"></span>
                          <span>{{ salon.status === 'open' ? 'Ouvert' : 'Fermé' }}</span>
                        </span>

                        <button
                          type="button"
                          class="grid-card__fav-btn"
                          [class.grid-card__fav-btn--active]="isFav(salon.id)"
                          (click)="onToggleFavorite($event, salon)"
                          [attr.aria-label]="
                            isFav(salon.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'
                          "
                        >
                          <svg
                            viewBox="0 0 24 24"
                            [attr.fill]="isFav(salon.id) ? '#ef4444' : 'none'"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path
                              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                            />
                          </svg>
                        </button>
                      </div>

                      <!-- Overlapping Avatar -->
                      <div class="grid-card__avatar-wrap">
                        <img
                          [src]="salon.avatarUrl || defaultAvatar"
                          [alt]="salon.name"
                          class="grid-card__avatar"
                          (error)="onAvatarError($event)"
                        />
                      </div>
                    </div>

                    <div class="grid-card__body">
                      <h3 class="grid-card__title">{{ salon.name }}</h3>

                      <span class="grid-card__location">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{{ locationLabel(salon) }}</span>
                      </span>

                      <div class="grid-card__queue-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        <span
                          ><strong>{{ salon.peopleWaiting }}</strong> en file</span
                        >
                      </div>
                    </div>
                  </a>
                }
              </div>
            </section>
          }
        }
      </div>
    </app-client-layout>

    <app-locality-picker-sheet />
  `,
  styleUrl: './salons-list-page.scss',
})
export class SalonsListPage {
  protected readonly salonService = inject(SalonService);
  protected readonly localityService = inject(LocalityService);
  private readonly favoritesService = inject(FavoritesService);

  readonly defaultAvatar = 'images/salons/king-barber-avatar.png';
  readonly defaultCover = 'images/salons/king-barber-cover.png';

  protected readonly searchQuery = signal<string>('');

  /** Salons de la localité regardée ; une recherche porte sur toutes les localités. */
  protected readonly filteredSalons = computed(() => {
    const q = normalize(this.searchQuery());
    const list = this.salonService.salons();
    if (!q) return this.salonService.inViewedLocality(list);
    return list.filter((s) =>
      [s.name, s.location, s.district, this.salonService.localityNameOf(s)].some((v) =>
        normalize(v ?? '').includes(q),
      ),
    );
  });

  constructor() {
    void this.localityService.loadLocalities();
  }

  /** « Rufisque · Médina » : localité du salon, puis son quartier. */
  protected locationLabel(salon: Salon): string {
    const locality = this.salonService.localityNameOf(salon);
    const district = salon.district || salon.location;
    if (locality && district && normalize(locality) !== normalize(district)) {
      return `${locality} · ${district}`;
    }
    return locality || district || '';
  }

  // Featured salons: open first or top ranked
  protected readonly featuredSalons = computed(() => {
    const all = this.filteredSalons();
    if (all.length <= 2) return all;
    // Highlight first 5 salons
    return all.slice(0, 5);
  });

  protected onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected isFav(salonId: string): boolean {
    return this.favoritesService.isFavorite(salonId);
  }

  protected onToggleFavorite(event: Event, salon: Salon): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggleFavorite(salon);
  }

  protected onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.defaultAvatar) {
      img.src = this.defaultAvatar;
    }
  }

  protected onCoverError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.defaultCover) {
      img.src = this.defaultCover;
    }
  }
}
