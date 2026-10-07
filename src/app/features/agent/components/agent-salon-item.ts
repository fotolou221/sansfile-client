import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgentSalon } from '../models/agent';

/** Ligne de salon (accueil, liste) : photo, nom, quartier, propriétaire, statut. */
@Component({
  selector: 'app-agent-salon-item',
  imports: [RouterLink],
  template: `
    <a class="agent-salon-item" [routerLink]="['/agent/salons', salon().id]">
      @if (salon().avatarUrl || salon().coverUrl) {
        <img
          class="agent-salon-item__thumb"
          [src]="salon().avatarUrl || salon().coverUrl"
          [alt]="salon().name"
          loading="lazy"
        />
      } @else {
        <span class="agent-salon-item__thumb" aria-hidden="true">{{ initials() }}</span>
      }
      <span class="agent-salon-item__body">
        <strong>{{ salon().name }}</strong>
        <span
          >{{ salon().localityName ? salon().localityName + ' — ' : '' }}{{ salon().district }} ·
          {{ salon().ownerName || 'Propriétaire' }}</span
        >
        @if (salon().createdDate) {
          <span>Inscrit le {{ formatDate(salon().createdDate!) }}</span>
        }
      </span>
      <span
        class="agent-chip"
        [class.agent-chip--open]="salon().status === 'OPEN'"
        [class.agent-chip--closed]="salon().status !== 'OPEN'"
      >
        {{ salon().status === 'OPEN' ? 'Ouvert' : 'Fermé' }}
      </span>
    </a>
  `,
  styleUrls: ['../agent-ui.scss'],
  styles: `
    :host {
      display: block;
    }
  `,
})
export class AgentSalonItem {
  readonly salon = input.required<AgentSalon>();

  protected initials(): string {
    return (this.salon().name || 'S')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
