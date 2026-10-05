import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AgentSalonForm } from '../../models/agent';
import { AgentAuthService } from '../../services/agent-auth.service';
import { AgentDataService } from '../../services/agent-data.service';

type PhotoField = 'avatarUrl' | 'coverUrl';

/**
 * Inscription d'un salon sur le terrain (ou correction de sa fiche). Le numéro du propriétaire
 * devient l'identifiant de son compte coiffeur : il n'est plus modifiable par l'agent ensuite.
 */
@Component({
  selector: 'app-agent-salon-form-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="agent-page">
      <a [routerLink]="editId() ? ['/agent/salons', editId()] : '/agent'" class="agent-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour
      </a>

      <div>
        <h1 class="agent-title">{{ editId() ? 'Corriger la fiche' : 'Inscrire un salon' }}</h1>
        <p class="agent-subtitle">
          @if (editId()) {
            Le téléphone et le propriétaire ne se modifient pas ici : contactez l'administration.
          } @else {
            Le salon est créé fermé : le coiffeur l'ouvrira depuis son espace, en se connectant avec
            son numéro.
          }
        </p>
      </div>

      @if (error()) {
        <div class="agent-alert agent-alert--danger" role="alert">{{ error() }}</div>
      }

      @if (loadingSalon()) {
        <div class="agent-skeleton"></div>
        <div class="agent-skeleton"></div>
      } @else {
        <form class="agent-form" (ngSubmit)="submit()" novalidate>
          <section class="agent-card">
            <h2 class="agent-card__title">Le salon</h2>
            <div class="agent-field" [class.agent-field--invalid]="touched() && !form.name.trim()">
              <label for="salon-name">Nom du salon *</label>
              <input
                id="salon-name"
                name="name"
                [(ngModel)]="form.name"
                maxlength="100"
                placeholder="Ex : Barber King Médina"
                required
              />
            </div>
            <div class="agent-form-row">
              <div
                class="agent-field"
                [class.agent-field--invalid]="touched() && !form.district.trim()"
              >
                <label for="salon-district">Quartier *</label>
                <input
                  id="salon-district"
                  name="district"
                  [(ngModel)]="form.district"
                  maxlength="100"
                  placeholder="Ex : Médina"
                  required
                />
              </div>
              <div
                class="agent-field"
                [class.agent-field--invalid]="touched() && !form.location.trim()"
              >
                <label for="salon-location">Ville / commune *</label>
                <input
                  id="salon-location"
                  name="location"
                  [(ngModel)]="form.location"
                  maxlength="255"
                  placeholder="Ex : Dakar"
                  required
                />
              </div>
            </div>
            <div class="agent-field">
              <label for="salon-address">Adresse ou repère</label>
              <input
                id="salon-address"
                name="address"
                [(ngModel)]="form.address"
                maxlength="255"
                placeholder="Ex : Rue 11 x 22, face à la pharmacie"
              />
            </div>
            <div class="agent-field">
              <label for="salon-hours">Horaires d'ouverture</label>
              <input
                id="salon-hours"
                name="openingHours"
                [(ngModel)]="form.openingHours"
                maxlength="100"
                placeholder="Ex : Lun–Sam 9h–21h"
              />
            </div>
          </section>

          <section class="agent-card">
            <h2 class="agent-card__title">Le propriétaire</h2>
            <div
              class="agent-field"
              [class.agent-field--invalid]="touched() && !form.ownerName.trim()"
            >
              <label for="owner-name">Nom du propriétaire *</label>
              <input
                id="owner-name"
                name="ownerName"
                [(ngModel)]="form.ownerName"
                [disabled]="!!editId()"
                maxlength="100"
                placeholder="Ex : Ibrahima Fall"
                autocomplete="off"
                required
              />
            </div>
            <div class="agent-field" [class.agent-field--invalid]="touched() && !phoneValid()">
              <label for="owner-phone">Téléphone du propriétaire *</label>
              <input
                id="owner-phone"
                name="phone"
                type="tel"
                inputmode="tel"
                [ngModel]="form.phone"
                (ngModelChange)="onPhoneChange($event)"
                [disabled]="!!editId()"
                placeholder="77 123 45 67"
                autocomplete="off"
                required
              />
              @if (touched() && !phoneValid() && !editId()) {
                <span class="agent-field__error"
                  >Numéro sénégalais à 9 chiffres (ex. 77 123 45 67).</span
                >
              } @else {
                <span class="agent-field__hint">
                  Le coiffeur se connectera à SansFile avec ce numéro (code reçu par SMS).
                </span>
              }
            </div>
          </section>

          <section class="agent-card">
            <h2 class="agent-card__title">Position</h2>
            @if (form.latitude !== null && form.longitude !== null) {
              <div class="position">
                <span> 📍 {{ form.latitude.toFixed(5) }}, {{ form.longitude.toFixed(5) }} </span>
                <a
                  [href]="'https://www.google.com/maps?q=' + form.latitude + ',' + form.longitude"
                  target="_blank"
                  rel="noopener"
                  >Voir sur la carte</a
                >
              </div>
            } @else {
              <p class="agent-subtitle">
                Placez-vous devant le salon : sa position aidera les clients à le trouver.
              </p>
            }
            @if (geoError()) {
              <span class="agent-field__error">{{ geoError() }}</span>
            }
            <button
              type="button"
              class="agent-btn agent-btn--outline agent-btn--block"
              (click)="locate()"
              [disabled]="locating()"
            >
              {{
                locating()
                  ? 'Localisation…'
                  : form.latitude !== null
                    ? 'Mettre à jour la position'
                    : 'Utiliser ma position actuelle'
              }}
            </button>
          </section>

          <section class="agent-card">
            <h2 class="agent-card__title">Photos</h2>
            <div class="photos">
              @for (photo of photoSlots; track photo.field) {
                <label class="photo" [class.photo--filled]="form[photo.field]">
                  @if (form[photo.field]) {
                    <img [src]="form[photo.field]" [alt]="photo.label" />
                  } @else {
                    <span class="photo__placeholder">
                      {{ uploading() === photo.field ? 'Envoi…' : '+ ' + photo.label }}
                    </span>
                  }
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    (change)="onPhoto($event, photo.field)"
                    [disabled]="uploading() !== null"
                  />
                </label>
              }
            </div>
            <span class="agent-field__hint"
              >JPEG, PNG ou WebP. Touchez une photo pour la remplacer.</span
            >
          </section>

          <button
            type="submit"
            class="agent-btn agent-btn--primary agent-btn--block"
            [disabled]="saving() || uploading() !== null"
          >
            {{
              saving()
                ? 'Enregistrement…'
                : editId()
                  ? 'Enregistrer les corrections'
                  : 'Inscrire le salon'
            }}
          </button>
        </form>
      }
    </div>
  `,
  styleUrls: ['../../agent-ui.scss'],
  styles: `
    .position {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--text-primary, #0f172a);

      a {
        font-weight: 700;
        color: var(--primary, #1e5af0);
      }
    }

    .photos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .photo {
      position: relative;
      aspect-ratio: 4 / 3;
      border-radius: 14px;
      border: 1px dashed var(--border-color, #e2e8f0);
      overflow: hidden;
      display: grid;
      place-items: center;
      cursor: pointer;
      background: var(--bg-page, #ffffff);

      &--filled {
        border-style: solid;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
    }

    .photo__placeholder {
      padding: 8px;
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--primary, #1e5af0);
    }
  `,
})
export class AgentSalonFormPage implements OnInit {
  private readonly data = inject(AgentDataService);
  private readonly auth = inject(AgentAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly photoSlots: { field: PhotoField; label: string }[] = [
    { field: 'avatarUrl', label: 'Logo / photo' },
    { field: 'coverUrl', label: 'Façade' },
  ];

  protected form: AgentSalonForm = {
    name: '',
    ownerName: '',
    phone: '',
    district: '',
    location: 'Dakar',
    address: '',
    openingHours: '',
    latitude: null,
    longitude: null,
    avatarUrl: null,
    coverUrl: null,
  };

  protected readonly editId = signal<number | null>(null);
  protected readonly loadingSalon = signal(false);
  protected readonly saving = signal(false);
  protected readonly touched = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly locating = signal(false);
  protected readonly geoError = signal<string | null>(null);
  protected readonly uploading = signal<PhotoField | null>(null);
  private readonly phoneDigits = signal('');

  protected readonly phoneValid = computed(() => {
    if (this.editId()) return true;
    const digits = this.phoneDigits();
    return /^7\d{8}$/.test(digits) || /^2217\d{8}$/.test(digits);
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.editId.set(id);
    this.loadingSalon.set(true);
    try {
      const salon = await firstValueFrom(this.data.salon(id));
      if (salon.createdByAgentId !== this.auth.profile()?.id) {
        this.error.set("Ce salon n'a pas été inscrit par vous : vous ne pouvez pas le modifier.");
      }
      this.form = {
        name: salon.name ?? '',
        ownerName: salon.ownerName ?? '',
        phone: salon.phone ?? '',
        district: salon.district ?? '',
        location: salon.location ?? '',
        address: salon.address ?? '',
        openingHours: salon.openingHours ?? '',
        latitude: salon.latitude ?? null,
        longitude: salon.longitude ?? null,
        avatarUrl: salon.avatarUrl ?? null,
        coverUrl: salon.coverUrl ?? null,
      };
    } catch (err) {
      this.error.set(this.auth.errorMessage(err, 'Salon introuvable.'));
    } finally {
      this.loadingSalon.set(false);
    }
  }

  protected onPhoneChange(value: string): void {
    this.form.phone = value;
    this.phoneDigits.set(value.replace(/\D/g, ''));
  }

  protected locate(): void {
    if (!('geolocation' in navigator)) {
      this.geoError.set("La localisation n'est pas disponible sur cet appareil.");
      return;
    }
    this.locating.set(true);
    this.geoError.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.latitude = Number(pos.coords.latitude.toFixed(6));
        this.form.longitude = Number(pos.coords.longitude.toFixed(6));
        this.locating.set(false);
      },
      (err) => {
        this.locating.set(false);
        this.geoError.set(
          err.code === err.PERMISSION_DENIED
            ? 'Autorisez la localisation pour SansFile dans les réglages du navigateur.'
            : 'Position introuvable. Réessayez à l’extérieur ou dans quelques secondes.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  protected async onPhoto(event: Event, field: PhotoField): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(field);
    this.error.set(null);
    try {
      this.form[field] = await this.data.uploadPhoto(file);
    } catch (err) {
      if (!this.auth.handleApiError(err)) {
        this.error.set(this.auth.errorMessage(err, "La photo n'a pas pu être envoyée."));
      }
    } finally {
      this.uploading.set(null);
    }
  }

  protected async submit(): Promise<void> {
    this.touched.set(true);
    const required = [this.form.name, this.form.district, this.form.location, this.form.ownerName];
    if (required.some((v) => !v.trim()) || !this.phoneValid()) {
      this.error.set('Complétez les champs obligatoires (*).');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const id = this.editId();
      const salon = id
        ? await firstValueFrom(this.data.updateSalon(id, this.form))
        : await this.data.createSalon(this.form);
      void this.router.navigate(['/agent/salons', salon.id], {
        queryParams: id ? { modifie: 1 } : { nouveau: 1 },
      });
    } catch (err) {
      if (!this.auth.handleApiError(err)) {
        this.error.set(this.auth.errorMessage(err, "Le salon n'a pas pu être enregistré."));
      }
    } finally {
      this.saving.set(false);
    }
  }
}
