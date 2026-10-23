import { Component, input } from '@angular/core';

export type VitrineIconName =
  | 'arrow-right'
  | 'back'
  | 'bag'
  | 'bell'
  | 'check'
  | 'chevron-down'
  | 'download'
  | 'heart'
  | 'mail'
  | 'message'
  | 'phone'
  | 'scissors'
  | 'sms'
  | 'ticket'
  | 'users'
  | 'whatsapp'
  | 'wrench'
  | 'x'
  | 'x-circle';

/** Icônes au trait de la vitrine (tracés Lucide), à la taille et à la couleur du texte parent. */
@Component({
  selector: 'app-vitrine-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.fill]="name() === 'whatsapp' ? 'currentColor' : 'none'"
      [attr.stroke]="name() === 'whatsapp' ? 'none' : 'currentColor'"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('arrow-right') {
          <svg:path d="M5 12h14" />
          <svg:path d="m12 5 7 7-7 7" />
        }
        @case ('back') {
          <svg:path d="m12 19-7-7 7-7" />
          <svg:path d="M19 12H5" />
        }
        @case ('bag') {
          <svg:path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <svg:path d="M3 6h18" />
          <svg:path d="M16 10a4 4 0 0 1-8 0" />
        }
        @case ('bell') {
          <svg:path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <svg:path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        }
        @case ('check') {
          <svg:path d="M20 6 9 17l-5-5" />
        }
        @case ('chevron-down') {
          <svg:path d="m6 9 6 6 6-6" />
        }
        @case ('download') {
          <svg:path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <svg:path d="m7 10 5 5 5-5" />
          <svg:path d="M12 15V3" />
        }
        @case ('heart') {
          <svg:path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          />
        }
        @case ('mail') {
          <svg:rect x="2" y="4" width="20" height="16" rx="2" />
          <svg:path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        }
        @case ('message') {
          <svg:path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        }
        @case ('phone') {
          <svg:path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          />
        }
        @case ('scissors') {
          <svg:circle cx="6" cy="6" r="3" />
          <svg:path d="M8.12 8.12 12 12" />
          <svg:path d="M20 4 8.12 15.88" />
          <svg:circle cx="6" cy="18" r="3" />
          <svg:path d="M14.8 14.8 20 20" />
        }
        @case ('sms') {
          <svg:path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z" />
        }
        @case ('ticket') {
          <svg:path
            d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
          />
          <svg:path d="M13 5v2" />
          <svg:path d="M13 17v2" />
          <svg:path d="M13 11v2" />
        }
        @case ('users') {
          <svg:path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <svg:circle cx="9" cy="7" r="4" />
          <svg:path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <svg:path d="M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('whatsapp') {
          <svg:path
            d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41"
          />
        }
        @case ('wrench') {
          <svg:path
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
          />
        }
        @case ('x') {
          <svg:path d="M18 6 6 18" />
          <svg:path d="m6 6 12 12" />
        }
        @case ('x-circle') {
          <svg:circle cx="12" cy="12" r="10" />
          <svg:path d="m15 9-6 6" />
          <svg:path d="m9 9 6 6" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: 1em;
      height: 1em;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class VitrineIcon {
  readonly name = input.required<VitrineIconName>();
}
