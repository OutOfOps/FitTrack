import { ChangeDetectionStrategy, Component, effect, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { FitButtonComponent } from '@fittrack/ui';
import { DataCoreService, FoodEntry } from '@fittrack/data-core';
import { DataContextService } from '../core/services/data-context.service';
import { AppStatusService } from '../core/services/app-status.service';
import { FoodCatalogService } from '../core/services/food-catalog.service';

interface FoodEntryView {
  id: string;
  label: string;
  calories: number;
  recordedAt: Date;
  createdAt: Date;
  catalogItemId?: string;
  vitamins: Array<{ code: string; amount: number }>;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

@Component({
  selector: 'app-food-diary',
  standalone: true,
  templateUrl: './food-diary.component.html',
  styleUrls: ['./food-diary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSelectModule,
    FitButtonComponent
  ]
})
export class FoodDiaryComponent {
  private readonly dataCore = inject(DataCoreService);
  private readonly dataContext = inject(DataContextService);
  private readonly status = inject(AppStatusService);
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(FoodCatalogService);

  readonly selectedDay = signal(this.toDayString(new Date()));
  readonly isOnline = this.status.isOnline;
  readonly lastBackup = this.status.lastBackup;

  readonly entries = signal<FoodEntryView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly importState = signal<ImportResult | null>(null);
  readonly selectedVitamins = signal<Array<{ code: string; amount: number }>>([]);
  readonly totalCalories = computed(() =>
    this.entries().reduce((total, entry) => total + entry.calories, 0)
  );
  readonly calorieTarget = 2200;
  readonly progressPercentage = computed(() =>
    Math.min(100, Math.round((this.totalCalories() / this.calorieTarget) * 100))
  );
  readonly catalogItems = this.catalog.items;

  readonly entryForm: FormGroup<{
    catalogItemId: FormControl<string | null>;
    label: FormControl<string>;
    calories: FormControl<number>;
  }> = this.fb.group({
    catalogItemId: this.fb.control<string | null>(null),
    label: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    calories: this.fb.nonNullable.control(350, [Validators.required, Validators.min(0)])
  });

  private readonly refreshToken = signal(0);

  constructor() {
    effect(() => {
      const day = this.selectedDay();
      const token = this.refreshToken();
      void this.loadEntries(day, token);
    });

    effect(() => {
      const id = this.entryForm.controls.catalogItemId.value;
      const items = this.catalogItems();
      if (!id) {
        this.selectedVitamins.set([]);
        return;
      }

      const item = items.find((entry) => entry.id === id);
      if (!item) {
        this.selectedVitamins.set([]);
        return;
      }

      this.selectedVitamins.set(this.mapVitamins(item.vitamins));
    });
  }

  changeDay(offset: number): void {
    const current = new Date(this.selectedDay());
    current.setDate(current.getDate() + offset);
    this.selectedDay.set(this.toDayString(current));
  }

  applyCatalogItem(id: string | null): void {
    if (!id) {
      return;
    }

    const items = this.catalogItems();
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    this.entryForm.controls.label.setValue(item.name);
    this.entryForm.controls.calories.setValue(item.calories);
  }

  async addFoodEntry(): Promise<void> {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const context = await this.dataContext.ensureContext();
    const { label, calories, catalogItemId } = this.entryForm.getRawValue();
    const vitamins = this.selectedVitamins().reduce<Record<string, number>>((acc, vitamin) => {
      acc[vitamin.code] = vitamin.amount;
      return acc;
    }, {});
    const entry: FoodEntry = {
      label,
      calories,
      recordedAt: Date.now(),
      catalogItemId: catalogItemId ?? undefined,
      vitamins: Object.keys(vitamins).length > 0 ? vitamins : undefined
    };

    await this.dataCore.saveFood(this.selectedDay(), entry, {
      key: context.key,
      keyVersion: context.keyVersion
    });

    this.entryForm.reset({ catalogItemId: null, label: '', calories: 350 });
    this.selectedVitamins.set([]);
    this.refresh();
  }

  async handleImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const [file] = Array.from(input.files ?? []);
    input.value = '';

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const { entries, errors, backupAt } = this.parseImportPayload(payload);

      if (entries.length === 0) {
        this.importState.set({ imported: 0, failed: errors.length, errors });
        return;
      }

      const context = await this.dataContext.ensureContext();

      let imported = 0;
      const failures: string[] = [];

      for (const item of entries) {
        try {
          await this.dataCore.saveFood(item.day, item.entry, {
            key: context.key,
            keyVersion: context.keyVersion
          });
          imported += 1;
        } catch (error) {
          console.error('Не вдалося імпортувати запис харчування', error);
          failures.push(`${item.entry.label} (${item.day})`);
        }
      }

      this.status.updateLastBackup(backupAt ?? Date.now());
      this.importState.set({
        imported,
        failed: failures.length + errors.length,
        errors: [...errors, ...failures]
      });

      this.refresh();
    } catch (error) {
      console.error('Некоректний файл імпорту', error);
      this.importState.set({ imported: 0, failed: 1, errors: ['Некоректний файл JSON'] });
    }
  }

  private parseImportPayload(payload: unknown): {
    entries: Array<{ day: string; entry: FoodEntry }>;
    errors: string[];
    backupAt?: number;
  } {
    const errors: string[] = [];
    const entries: Array<{ day: string; entry: FoodEntry }> = [];
    let backupAt: number | undefined;

    const rawEntries: unknown = Array.isArray(payload)
      ? payload
      : typeof payload === 'object' && payload !== null
        ? (payload as { entries?: unknown; backupAt?: unknown }).entries ?? []
        : [];

    if (typeof payload === 'object' && payload !== null && 'backupAt' in payload) {
      const value = (payload as { backupAt?: unknown }).backupAt;
      if (typeof value === 'number') {
        backupAt = value;
      } else if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
          backupAt = parsed;
        }
      }
    }

    if (!Array.isArray(rawEntries)) {
      return { entries, errors: ['Поле entries має бути масивом'], backupAt };
    }

    rawEntries.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`Запис #${index + 1} має бути обʼєктом`);
        return;
      }

      const record = item as Record<string, unknown>;
      const label = record['label'];
      const calories = record['calories'];
      const recordedAt = record['recordedAt'] ?? record['timestamp'];
      const day = record['day'];
      const vitamins = record['vitamins'];
      const catalogItemId = record['catalogItemId'];

      if (typeof label !== 'string' || label.trim().length < 2) {
        errors.push(`Запис #${index + 1}: поле label відсутнє або закоротке`);
        return;
      }

      if (typeof calories !== 'number' || Number.isNaN(calories)) {
        errors.push(`Запис #${index + 1}: поле calories має бути числом`);
        return;
      }

      let timestamp = Date.now();
      if (typeof recordedAt === 'number') {
        timestamp = recordedAt;
      } else if (typeof recordedAt === 'string') {
        const parsed = Date.parse(recordedAt);
        if (!Number.isNaN(parsed)) {
          timestamp = parsed;
        }
      }

      let dayString: string;
      if (typeof day === 'string' && day.length > 0) {
        dayString = day;
      } else {
        dayString = this.toDayString(new Date(timestamp));
      }

      entries.push({
        day: dayString,
        entry: {
          label: label.trim(),
          calories,
          recordedAt: timestamp,
          catalogItemId:
            typeof catalogItemId === 'string' && catalogItemId.length > 0 ? catalogItemId : undefined,
          vitamins:
            typeof vitamins === 'object' && vitamins !== null
              ? this.normalizeVitamins(vitamins as Record<string, unknown>)
              : undefined
        }
      });
    });

    return { entries, errors, backupAt };
  }

  private async loadEntries(day: string, _token: number): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const keyring = await this.dataContext.keyring();
      const entries = await this.dataCore.listByDay(day, keyring);
      const foodEntries = entries
        .filter((entry) => entry.type === 'food')
        .map((entry) => {
          const data = entry.data as FoodEntry;
          return {
            id: entry.id,
            label: data.label,
            calories: data.calories,
            recordedAt: new Date(data.recordedAt),
            createdAt: new Date(entry.createdAt),
            catalogItemId: data.catalogItemId,
            vitamins: this.mapVitamins(data.vitamins)
          } satisfies FoodEntryView;
        })
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

      this.entries.set(foodEntries);
    } catch (error) {
      console.error('Не вдалося завантажити записи харчування', error);
      this.errorMessage.set('Не вдалося завантажити записи харчування. Спробуйте пізніше.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private refresh(): void {
    this.refreshToken.update((value) => value + 1);
  }

  private toDayString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private mapVitamins(vitamins: Record<string, number> | undefined): Array<{ code: string; amount: number }> {
    if (!vitamins) {
      return [];
    }

    return Object.entries(vitamins)
      .map(([code, amount]) => ({ code, amount }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  private normalizeVitamins(source: Record<string, unknown>): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(source)) {
      const code = key.trim();
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
}
