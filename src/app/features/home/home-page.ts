import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="home-screen">
      <header class="home-header">
        <a class="brand-lockup" routerLink="/onboarding" aria-label="SansFile onboarding">
          <img src="icons/sansfile-icon.png" alt="" />
          <div>
            <strong>SansFile</strong>
            <span>Moins d'attente. Plus de temps.</span>
          </div>
        </a>
      </header>

      <section class="home-hero">
        <span>Bienvenue</span>
        <h1>Votre PWA SansFile est bien lancee.</h1>
        <p>Design system bleu, jaune action, Poppins.</p>
        <a routerLink="/onboarding">Voir onboarding</a>
      </section>
    </main>
  `,
})
export class HomePage {}
