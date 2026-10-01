import { Component } from '@angular/core';

@Component({
  selector: 'app-splash-loader',
  template: `
    <div class="splash-loader" role="progressbar" aria-label="Chargement de SansFile">
      <span class="splash-loader__bar"></span>
    </div>
  `,
  styleUrl: './splash-loader.scss',
})
export class SplashLoader {}
