import { Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlatformSettingsService } from '../../shared/services/platform-settings.service';

/**
 * Conditions d'utilisation, politique de confidentialité et mentions légales, sur une seule page
 * (ancres #conditions, #confidentialite, #mentions-legales). Ouverte pendant la maintenance et sur ordinateur.
 */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  template: `
    <div class="legal">
      <header class="legal-top">
        <div class="legal-container">
          <a routerLink="/" class="legal-top__logo" aria-label="SansFile, accueil">
            <img
              src="images/sansfile-logo-horizontal-white.png"
              alt="SansFile"
              width="1232"
              height="232"
            />
          </a>
          <h1 class="legal-top__title">Informations légales</h1>
          <span class="legal-top__date">Dernière mise à jour : 24 octobre 2026</span>
          <nav class="legal-top__nav" aria-label="Sections">
            @for (section of sections; track section.id) {
              <a [routerLink]="[]" [fragment]="section.id">{{ section.label }}</a>
            }
          </nav>
        </div>
      </header>

      <main class="legal-container legal-body">
        <!-- ══════════════ CONDITIONS D'UTILISATION ══════════════ -->
        <section id="conditions" class="legal-section">
          <h2>Conditions d’utilisation</h2>

          <h3>Le service</h3>
          <p>
            SansFile permet de prendre un ticket virtuel dans un salon de coiffure ou chez un
            barbier partenaire, de suivre la file d’attente en direct et d’être prévenu par SMS
            quand son tour approche. SansFile propose aussi une boutique de produits de coiffure,
            selon les localités. En utilisant SansFile, vous acceptez les présentes conditions.
          </p>

          <h3>Votre compte</h3>
          <p>
            La connexion se fait avec votre numéro de téléphone et un code reçu par SMS. Vous êtes
            responsable de l’exactitude de votre numéro. Si vous enregistrez des proches (enfants,
            parents, amis), vous le faites avec leur accord.
          </p>

          <h3>Les tickets</h3>
          <p>
            Un ticket n’est pas un rendez-vous à heure fixe : le temps d’attente affiché est une
            estimation. Chaque salon gère sa propre file ; si vous n’êtes pas présent à votre tour,
            le salon peut passer au client suivant. Si vous ne venez plus, annulez votre ticket pour
            libérer votre place.
          </p>

          <h3>La boutique</h3>
          <p>
            Les produits, les prix et la livraison dépendent de votre localité. Une commande est
            confirmée après un échange avec SansFile par WhatsApp ou par téléphone. Un acompte,
            indiqué avant la commande, est demandé à la confirmation ; le reste est réglé au livreur
            à la livraison.
          </p>

          <h3>Gratuité</h3>
          <p>
            SansFile est gratuit pour les clients, en dehors des produits achetés dans la boutique.
          </p>

          <h3>Bon usage</h3>
          <p>
            Il est interdit de prendre des tickets fictifs, d’utiliser le numéro d’une autre
            personne sans son accord ou de chercher à perturber le service. En cas d’abus, SansFile
            peut suspendre le compte concerné.
          </p>

          <h3>Responsabilité</h3>
          <p>
            SansFile met en relation les clients et les salons : les prestations de coiffure
            relèvent de la responsabilité de chaque salon. Le service peut être interrompu,
            notamment pendant une maintenance ; SansFile fait son possible pour limiter ces
            interruptions.
          </p>

          <h3>Évolution des conditions</h3>
          <p>
            Ces conditions peuvent évoluer ; la date de mise à jour figure en haut de cette page.
            Elles sont soumises au droit sénégalais.
          </p>
        </section>

        <!-- ══════════════ CONFIDENTIALITÉ ══════════════ -->
        <section id="confidentialite" class="legal-section">
          <h2>Politique de confidentialité</h2>

          <h3>Les données que nous utilisons</h3>
          <ul>
            <li>
              <span class="legal-strong">Votre compte</span> : numéro de téléphone, nom et photo de
              profil si vous les renseignez, localité choisie.
            </li>
            <li>
              <span class="legal-strong">Vos proches</span> : nom, lien de parenté et, si vous
              l’indiquez, numéro de téléphone.
            </li>
            <li><span class="legal-strong">Vos tickets</span> : salon, date, numéro et statut.</li>
            <li>
              <span class="legal-strong">Vos commandes</span> : articles, adresse de livraison et,
              seulement si vous l’autorisez, votre position pour la livraison.
            </li>
            <li>
              <span class="legal-strong">Les salons</span> : informations et photos fournies par le
              salon ou par nos agents de terrain.
            </li>
            <li>
              <span class="legal-strong">La sécurité</span> : adresse IP et historique de connexion,
              pour bloquer les abus.
            </li>
          </ul>

          <h3>Pourquoi</h3>
          <p>
            Uniquement pour faire fonctionner SansFile : gérer vos tickets, vous prévenir par SMS,
            livrer vos commandes, répondre à vos demandes et protéger le service. Vos données ne
            sont ni vendues ni utilisées pour de la publicité.
          </p>

          <h3>Qui y a accès</h3>
          <ul>
            <li>Le salon choisi voit le nom et le numéro de téléphone associés à votre ticket.</li>
            <li>
              Pour une commande, le partenaire et le livreur de votre localité peuvent recevoir
              votre nom, votre numéro et l’adresse de livraison.
            </li>
            <li>
              Nos prestataires techniques : SendText (envoi des SMS), Hostinger (hébergement du
              serveur), Cloudinary (stockage des images) et Google Fonts (polices du site, qui
              reçoit votre adresse IP).
            </li>
          </ul>

          <h3>Sur votre téléphone</h3>
          <p>
            L’application garde votre session ouverte jusqu’à 60 jours et retient vos préférences
            (comme le thème clair ou sombre). Elle n’utilise pas de cookies publicitaires.
          </p>

          <h3>Durée de conservation</h3>
          <p>
            Vos données sont conservées tant que vous utilisez votre compte. Vous pouvez en demander
            la suppression à tout moment.
          </p>

          <h3>Vos droits</h3>
          <p>
            Conformément à la loi n° 2008-12 du 25 janvier 2008 sur la protection des données à
            caractère personnel, vous pouvez accéder à vos données, les faire corriger, vous opposer
            à leur utilisation ou en demander la suppression en écrivant à
            <a [href]="'mailto:' + platform.contactEmail()">{{ platform.contactEmail() }}</a> ou au
            <a [href]="'tel:+' + platform.contactPhoneDigits()">{{ platform.contactPhone() }}</a
            >. Vous pouvez aussi saisir la Commission de protection des données personnelles (CDP).
          </p>
        </section>

        <!-- ══════════════ MENTIONS LÉGALES ══════════════ -->
        <section id="mentions-legales" class="legal-section">
          <h2>Mentions légales</h2>

          <h3>Éditeur</h3>
          <p>
            SansFile — Dakar, Sénégal.<br />
            E-mail :
            <a [href]="'mailto:' + platform.contactEmail()">{{ platform.contactEmail() }}</a
            ><br />
            Téléphone :
            <a [href]="'tel:+' + platform.contactPhoneDigits()">{{ platform.contactPhone() }}</a>
          </p>

          <h3>Hébergement</h3>
          <p>
            Serveur : Hostinger International Ltd. (hostinger.com).<br />
            Images : Cloudinary (cloudinary.com).
          </p>

          <h3>Propriété</h3>
          <p>
            Le nom SansFile, le logo et les contenus du site appartiennent à SansFile. Les photos
            d’illustration de la page d’accueil proviennent d’Unsplash (licence libre).
          </p>
        </section>

        <a routerLink="/" class="legal-back">← Retour à l’accueil</a>
      </main>
    </div>
  `,
  styleUrl: './legal-page.scss',
})
export class LegalPage {
  protected readonly platform = inject(PlatformSettingsService);
  private readonly route = inject(ActivatedRoute);

  protected readonly sections = [
    { id: 'conditions', label: 'Conditions' },
    { id: 'confidentialite', label: 'Confidentialité' },
    { id: 'mentions-legales', label: 'Mentions légales' },
  ];

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Le routeur n'active pas le défilement vers les ancres : on va nous-mêmes à la section demandée
    afterNextRender(() => {
      const subscription = this.route.fragment.subscribe((fragment) => {
        if (fragment) {
          document.getElementById(fragment)?.scrollIntoView({ block: 'start' });
        }
      });
      destroyRef.onDestroy(() => subscription.unsubscribe());
    });
  }
}
