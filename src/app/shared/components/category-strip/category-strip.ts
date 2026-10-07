import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductCategory } from '../../models/product';

/**
 * Catégories de la boutique en liste horizontale défilante (image ronde + nom). Un appui choisit la
 * catégorie, un second appui la retire.
 */
@Component({
  selector: 'app-category-strip',
  template: `
    <div class="category-strip" role="group" aria-label="Catégories">
      @for (cat of categories; track cat.id) {
        <button
          type="button"
          class="category-strip__item"
          [class.category-strip__item--active]="selected === cat.id"
          [attr.aria-pressed]="selected === cat.id"
          (click)="toggle.emit(cat.id)"
          [title]="cat.name"
        >
          <div class="category-strip__thumb">
            <img [src]="cat.image" [alt]="cat.name" loading="lazy" />
          </div>
          <span class="category-strip__name">{{ cat.name }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .category-strip {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-top: 10px;
      overscroll-behavior-x: contain;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      -ms-overflow-style: none;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .category-strip__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;
      flex-shrink: 0;
      width: 68px;
      max-width: 68px;
    }

    .category-strip__thumb {
      display: grid;
      width: 58px;
      height: 58px;
      place-items: center;
      border-radius: 50%;
      overflow: hidden;
      border: 2.5px solid transparent;
      background: var(--bg-secondary, #f1f5f9);
      transition:
        border-color 0.15s ease,
        transform 0.15s ease;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .category-strip__item--active & {
        border-color: var(--primary, #1e5af0);
        transform: scale(1.06);
        box-shadow: 0 4px 12px rgba(30, 90, 240, 0.25);
      }

      .category-strip__item:hover & {
        border-color: rgba(30, 90, 240, 0.5);
      }
    }

    .category-strip__name {
      color: var(--text-secondary, #64748b);
      font-size: 0.6875rem;
      font-weight: 600;
      width: 100%;
      max-width: 68px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
      display: block;
      line-height: 1.2;

      .category-strip__item--active & {
        color: var(--primary, #1e5af0);
        font-weight: 800;
      }
    }
  `,
})
export class CategoryStrip {
  @Input() categories: readonly ProductCategory[] = [];
  /** Identifiant de la catégorie choisie (null : toutes). */
  @Input() selected: string | null = null;
  @Output() readonly toggle = new EventEmitter<string>();
}
