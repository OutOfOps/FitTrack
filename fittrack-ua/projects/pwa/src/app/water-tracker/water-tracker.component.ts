import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FitButtonComponent } from '@fittrack/ui';
import { DataCoreService, WaterEntry } from '@fittrack/data-core';
import { DataContextService } from '../core/services/data-context.service';
import { AppStatusService } from '../core/services/app-status.service';

interface WaterEntryView {
  id: string;
  volumeMl: number;
  note?: string;
  recordedAt: Date;
  createdAt: Date;
}

@Component({
  selector: 'app-water-tracker',
  standalone: true,
  templateUrl: './water-tracker.component.html',
  styleUrls: ['./water-tracker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    FitButtonComponent
  ]
})
export class WaterTrackerComponent {
  private readonly dataCore = inject(DataCoreService);
  private readonly dataContext = inject(DataContextService);
  private readonly status = inject(AppStatusService);
  private readonly fb = inject(FormBuilder);

  readonly today = new Date();
  readonly selectedDay = signal(this.toDayString(this.today));
  readonly isOnline = this.status.isOnline;
  readonly isOffline = this.status.isOffline;
  readonly lastBackup = this.status.lastBackup;

  readonly waterEntries = signal<WaterEntryView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly totalVolume = computed(() =>
    this.waterEntries().reduce((total, entry) => total + entry.volumeMl, 0)
  );

  readonly entryForm = this.fb.nonNullable.group({
    volumeMl: [250, [Validators.required, Validators.min(50), Validators.max(5000)]],
    note: ['']
  });

  private readonly refreshToken = signal(0);

  constructor() {
    effect(() => {
      const day = this.selectedDay();
      const token = this.refreshToken();
      void this.loadEntries(day, token);
    });
  }

  changeDay(offset: number): void {
    const current = new Date(this.selectedDay());
    current.setDate(current.getDate() + offset);
    this.selectedDay.set(this.toDayString(current));
  }

  async addWaterEntry(): Promise<void> {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const context = await this.dataContext.ensureContext();
    const { volumeMl, note } = this.entryForm.getRawValue();
    const entry: WaterEntry = {
      volumeMl,
      note: note || undefined,
      recordedAt: Date.now()
    };

    await this.dataCore.saveWater(this.selectedDay(), entry, {
      key: context.key,
      keyVersion: context.keyVersion
    });

    this.entryForm.reset({ volumeMl: 250, note: '' });
    this.refresh();
  }

  private async loadEntries(day: string, _token: number): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const keyring = await this.dataContext.keyring();
      const entries = await this.dataCore.listByDay(day, keyring);
      const waterEntries = entries
        .filter((entry) => entry.type === 'water')
        .map((entry) => {
          const data = entry.data as WaterEntry;
          return {
            id: entry.id,
            volumeMl: data.volumeMl,
            note: data.note,
            recordedAt: new Date(data.recordedAt),
            createdAt: new Date(entry.createdAt)
          } satisfies WaterEntryView;
        })
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

      this.waterEntries.set(waterEntries);
    } catch (error) {
      console.error('Не вдалося завантажити записи про воду', error);
      this.errorMessage.set('Не вдалося завантажити записи. Перевірте підключення до мережі.');
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
}
