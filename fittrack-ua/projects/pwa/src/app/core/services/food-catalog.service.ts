import { Injectable, computed, signal } from '@angular/core';

export type FoodCatalogCategory = 'dish' | 'product' | 'vegetable';

export interface FoodCatalogItem {
  id: string;
  name: string;
  category: FoodCatalogCategory;
  calories: number;
  vitamins: Record<string, number>;
}

export type NewFoodCatalogItem = Omit<FoodCatalogItem, 'id'>;

const STORAGE_KEY = 'fittrack-food-catalog';

const DEFAULT_UKRAINIAN_FOOD_CATALOG: ReadonlyArray<NewFoodCatalogItem> = [
  {
    name: 'Гречка (варена)',
    category: 'product',
    calories: 110,
    vitamins: { B1: 0.1, B2: 0.05, B6: 0.3, PP: 3.0 }
  },
  {
    name: 'Овсянка (вівсяна каша)',
    category: 'product',
    calories: 120,
    vitamins: { B1: 0.4, B2: 0.15, B6: 0.1, E: 0.7 }
  },
  {
    name: 'Яблуко',
    category: 'product',
    calories: 47,
    vitamins: { C: 10, A: 0.005, B1: 0.02, B2: 0.03 }
  },
  {
    name: 'Банан',
    category: 'product',
    calories: 89,
    vitamins: { C: 8.7, B6: 0.37, B9: 0.02 }
  },
  {
    name: 'Волоський горіх',
    category: 'product',
    calories: 654,
    vitamins: { E: 0.7, B6: 0.54, B1: 0.34 }
  },
  {
    name: 'Фундук',
    category: 'product',
    calories: 628,
    vitamins: { E: 15, B1: 0.6, B6: 0.3 }
  },
  {
    name: 'Мигдаль',
    category: 'product',
    calories: 579,
    vitamins: { E: 25.6, B2: 1.1, B3: 3.6 }
  },
  {
    name: 'Борщ український',
    category: 'dish',
    calories: 70,
    vitamins: { A: 0.3, C: 12, B9: 0.015 }
  },
  {
    name: 'Куряче філе (варене)',
    category: 'dish',
    calories: 165,
    vitamins: { B3: 14, B6: 0.6, B12: 0.003 }
  },
  {
    name: 'Творог нежирний',
    category: 'product',
    calories: 98,
    vitamins: { B2: 0.3, B5: 0.9, B12: 0.0014 }
  },
  {
    name: 'Яйце куряче',
    category: 'product',
    calories: 155,
    vitamins: { A: 0.16, D: 0.002, B12: 0.0011, B2: 0.45 }
  },
  {
    name: 'Морква свіжа',
    category: 'vegetable',
    calories: 41,
    vitamins: { A: 8.3, K: 0.013, C: 5.9 }
  }
];

function generateId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues === 'function') {
      return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
    }
  }

  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function sanitizeVitamins(source: Record<string, unknown>): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [codeRaw, value] of Object.entries(source)) {
    const code = codeRaw.trim();
    if (!code) {
      continue;
    }

    const amount = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(amount)) {
      continue;
    }

    normalized[code] = amount;
  }

  return normalized;
}

@Injectable({ providedIn: 'root' })
export class FoodCatalogService {
  private readonly itemsSignal = signal<FoodCatalogItem[]>([]);

  readonly items = computed(() => this.itemsSignal());

  constructor() {
    this.restoreFromStorage();
  }

  addItem(payload: NewFoodCatalogItem): void {
    const item: FoodCatalogItem = {
      ...payload,
      id: generateId()
    };

    this.itemsSignal.update((current) => {
      const next = [...current, item];
      this.persist(next);
      return next;
    });
  }

  updateItem(id: string, changes: Partial<NewFoodCatalogItem>): void {
    this.itemsSignal.update((current) => {
      const next = current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
              vitamins: changes.vitamins ?? item.vitamins
            }
          : item
      );
      this.persist(next);
      return next;
    });
  }

  removeItem(id: string): void {
    this.itemsSignal.update((current) => {
      const next = current.filter((item) => item.id !== id);
      this.persist(next);
      return next;
    });
  }

  private restoreFromStorage(): void {
    if (typeof window === 'undefined') {
      this.itemsSignal.set(DEFAULT_UKRAINIAN_FOOD_CATALOG.map((item) => ({ ...item, id: generateId() })));
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = DEFAULT_UKRAINIAN_FOOD_CATALOG.map((item) => ({ ...item, id: generateId() }));
        this.itemsSignal.set(defaults);
        this.persist(defaults);
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('Catalog payload is not an array');
      }

      const sanitized: FoodCatalogItem[] = [];
      for (const record of parsed) {
        if (typeof record !== 'object' || record === null) {
          continue;
        }

        const entry = record as Partial<FoodCatalogItem>;
        if (!entry.id || !entry.name || !entry.category) {
          continue;
        }

        sanitized.push({
          id: entry.id,
          name: entry.name,
          category: entry.category,
          calories: Number(entry.calories ?? 0),
          vitamins:
            typeof entry.vitamins === 'object' && entry.vitamins !== null
              ? sanitizeVitamins(entry.vitamins as Record<string, unknown>)
              : {}
        });
      }

      if (!sanitized.length) {
        const defaults = DEFAULT_UKRAINIAN_FOOD_CATALOG.map((item) => ({ ...item, id: generateId() }));
        this.itemsSignal.set(defaults);
        this.persist(defaults);
        return;
      }

      this.itemsSignal.set(sanitized);
    } catch (error) {
      console.error('Не вдалося прочитати каталог продуктів', error);
      const defaults = DEFAULT_UKRAINIAN_FOOD_CATALOG.map((item) => ({ ...item, id: generateId() }));
      this.itemsSignal.set(defaults);
      this.persist(defaults);
    }
  }

  private persist(items: FoodCatalogItem[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Не вдалося зберегти каталог продуктів', error);
    }
  }
}
