import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, ValidatorFn } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { UiToolkitModule } from '@fittrack/ui';
import { AppStatusService } from '../core/services/app-status.service';

interface VitaminRange {
  id: string;
  label: string;
  min: number;
  max: number;
  unit: string;
}

interface VitaminStatus {
  range: VitaminRange;
  value: number;
  status: 'optimal' | 'deficit' | 'excess';
}

@Component({
  selector: 'app-vitamin-balance',
  standalone: true,
  templateUrl: './vitamin-balance.component.html',
  styleUrls: ['./vitamin-balance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatDividerModule,
    NgxEchartsDirective,
    UiToolkitModule
  ],
  providers: [provideEcharts()]
})
export class VitaminBalanceComponent {
  private readonly fb = inject(FormBuilder);
  private readonly status = inject(AppStatusService);

  readonly isOnline = this.status.isOnline;
  readonly lastBackup = this.status.lastBackup;

  readonly vitaminRanges: VitaminRange[] = [
    { id: 'vitaminA', label: 'Вітамін A', min: 700, max: 900, unit: 'мкг' },
    { id: 'vitaminC', label: 'Вітамін C', min: 75, max: 120, unit: 'мг' },
    { id: 'vitaminD', label: 'Вітамін D3', min: 15, max: 100, unit: 'мкг' },
    { id: 'vitaminB6', label: 'Вітамін B6', min: 1.3, max: 10, unit: 'мг' },
    { id: 'vitaminB12', label: 'Вітамін B12', min: 2.4, max: 6, unit: 'мкг' },
    { id: 'vitaminE', label: 'Вітамін E', min: 15, max: 1000, unit: 'мг' }
  ];

  readonly vitaminForm = this.fb.nonNullable.group({
    vitaminA: this.fb.nonNullable.control(
      this.getRange('vitaminA').min,
      this.createValidators(this.getRange('vitaminA'))
    ),
    vitaminC: this.fb.nonNullable.control(
      this.getRange('vitaminC').min,
      this.createValidators(this.getRange('vitaminC'))
    ),
    vitaminD: this.fb.nonNullable.control(
      this.getRange('vitaminD').min,
      this.createValidators(this.getRange('vitaminD'))
    ),
    vitaminB6: this.fb.nonNullable.control(
      this.getRange('vitaminB6').min,
      this.createValidators(this.getRange('vitaminB6'))
    ),
    vitaminB12: this.fb.nonNullable.control(
      this.getRange('vitaminB12').min,
      this.createValidators(this.getRange('vitaminB12'))
    ),
    vitaminE: this.fb.nonNullable.control(
      this.getRange('vitaminE').min,
      this.createValidators(this.getRange('vitaminE'))
    )
  });

  readonly jsonInput = this.fb.nonNullable.control('');
  readonly validationErrors = signal<string[]>([]);
  readonly vitaminStatuses = computed<VitaminStatus[]>(() =>
    this.vitaminRanges.map((range) => {
      const control = this.vitaminForm.get(range.id);
      const value = Number(control?.value ?? 0);
      if (value < range.min) {
        return { range, value, status: 'deficit' as const };
      }
      if (value > range.max) {
        return { range, value, status: 'excess' as const };
      }
      return { range, value, status: 'optimal' as const };
    })
  );
  readonly issues = computed(() => this.vitaminStatuses().filter((item) => item.status !== 'optimal'));
  readonly chartOptions = computed<EChartsOption>(() => {
    const indicator = this.vitaminRanges.map((range) => ({
      name: `${range.label} (${range.unit})`,
      max: range.max * 1.2
    }));

    const values = this.vitaminStatuses().map((status) => status.value);

    return {
      tooltip: { trigger: 'item' },
      radar: {
        indicator,
        axisName: { color: '#0d47a1', fontWeight: 600 },
        splitArea: {
          areaStyle: {
            color: ['rgba(66,165,245,0.15)', 'rgba(21,101,192,0.1)']
          }
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: 'Споживання',
              areaStyle: { color: 'rgba(30,136,229,0.35)' },
              lineStyle: { color: '#1e88e5' }
            }
          ]
        }
      ]
    } satisfies EChartsOption;
  });

  applyJson(): void {
    const raw = this.jsonInput.value?.trim();
    if (!raw) {
      this.validationErrors.set(['Вставте JSON з показниками вітамінів']);
      return;
    }

    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const errors: string[] = [];

      this.vitaminRanges.forEach((range) => {
        const value = data[range.id];
        if (typeof value !== 'number') {
          errors.push(`${range.label}: значення має бути числом`);
          return;
        }

        if (value < 0) {
          errors.push(`${range.label}: значення не може бути відʼємним`);
          return;
        }

        this.vitaminForm.get(range.id)?.setValue(value);
      });

      this.validationErrors.set(errors);
    } catch (error) {
      console.error('Помилка розбору JSON з вітамінами', error);
      this.validationErrors.set(['Некоректний JSON. Перевірте формат.']);
    }
  }

  resetToRecommended(): void {
    this.vitaminRanges.forEach((range) => {
      this.vitaminForm.get(range.id)?.setValue(range.min);
    });
    this.validationErrors.set([]);
  }

  private createValidators(range: VitaminRange): ValidatorFn[] {
    return [
      Validators.required,
      Validators.min(0),
      (control) => {
        const value = control.value;
        if (value == null || Number.isNaN(value)) {
          return { vitamin: true };
        }
        if (value < range.min) {
          return { vitaminMin: { required: range.min } };
        }
        if (value > range.max) {
          return { vitaminMax: { allowed: range.max } };
        }
        return null;
      }
    ];
  }

  private getRange(id: VitaminRange['id']): VitaminRange {
    const range = this.vitaminRanges.find((item) => item.id === id);
    if (!range) {
      throw new Error(`Невідомий вітамін: ${id}`);
    }
    return range;
  }
}
