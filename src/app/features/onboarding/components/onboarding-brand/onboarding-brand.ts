import { Component } from '@angular/core';

@Component({
  selector: 'app-onboarding-brand',
  template: `
    <section class="onboarding-brand" aria-label="SansFile">
      <img
        class="onboarding-brand__logo"
        src="images/sansfile-logo-white.png"
        alt="Logo SansFile"
      />
    </section>
  `,
  styleUrl: './onboarding-brand.scss',
})
export class OnboardingBrand {}
