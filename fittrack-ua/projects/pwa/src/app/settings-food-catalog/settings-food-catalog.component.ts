import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  FoodCatalogService,
  FoodCatalogItem,
  FoodCatalogCategory,
  NewFoodCatalogItem
} from '../core/services/food-catalog.service';
import { FitButtonComponent } from '@fittrack/ui';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type VitaminFormGroup = FormGroup<{
  code: FormControl<string>;
  amount: FormControl<number>;
}>;

@Component({
  selector: 'app-settings-food-catalog',
  standalone: true,
  templateUrl: './settings-food-catalog.component.html',
  styleUrls: ['./settings-food-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FitButtonComponent,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ]
})
export class SettingsFoodCatalogComponent {
  private readonly catalog = inject(FoodCatalogService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly statusSignal = signal<string | null>(null);

  readonly categories: Array<{ value: FoodCatalogCategory; label: string }> = [
    { value: 'dish', label: 'Страва' },
    { value: 'product', label: 'Продукт' },
    { value: 'vegetable', label: 'Овоч' }
  ];
  readonly categoryLabelMap = new Map<FoodCatalogCategory, string>(
    this.categories.map((category) => [category.value, category.label])
  );

  readonly form = this.createForm();
  readonly statusMessage = computed(() => this.statusSignal());
  readonly items = this.catalog.items;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.resetStatus();
    });
  }

  get vitamins(): FormArray<VitaminFormGroup> {
    return this.form.controls.vitamins;
  }

  trackById(_index: number, item: FoodCatalogItem): string {
    return item.id;
  }

  addVitaminField(): void {
    const group = this.fb.group({
      code: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(8)]
      }),
      amount: this.fb.nonNullable.control(0, {
        validators: [Validators.required, Validators.min(0)]
      })
    }) as VitaminFormGroup;
    this.vitamins.push(group);
  }

  removeVitaminField(index: number): void {
    this.vitamins.removeAt(index);
  }

  resetStatus(): void {
    this.statusSignal.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.statusSignal.set('Будь ласка, заповніть усі обовʼязкові поля.');
      return;
    }

    const payload = this.buildPayloadFromForm();
    this.catalog.addItem(payload);
    this.form.reset({ name: '', category: 'product', calories: 100 });
    this.vitamins.clear();
    this.statusSignal.set('Продукт додано до каталогу.');
  }

  remove(item: FoodCatalogItem): void {
    this.catalog.removeItem(item.id);
    this.statusSignal.set(`«${item.name}» видалено з каталогу.`);
  }

  private buildPayloadFromForm(): NewFoodCatalogItem {
    const { name, category, calories } = this.form.getRawValue();
    const vitamins: Record<string, number> = {};

    this.vitamins.controls.forEach((control) => {
      const code = control.controls.code.value.trim().toUpperCase();
      const amount = control.controls.amount.value;
      if (!code || Number.isNaN(amount)) {
        return;
      }

      vitamins[code] = amount;
    });

    return {
      name: name.trim(),
      category,
      calories,
      vitamins
    };
  }

  private createForm(): FormGroup<{
    name: FormControl<string>;
    category: FormControl<FoodCatalogCategory>;
    calories: FormControl<number>;
    vitamins: FormArray<VitaminFormGroup>;
  }> {
    return this.fb.group({
      name: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)]
      }),
      category: this.fb.nonNullable.control<FoodCatalogCategory>('product', {
        validators: [Validators.required]
      }),
      calories: this.fb.nonNullable.control(100, {
        validators: [Validators.required, Validators.min(0)]
      }),
      vitamins: this.fb.array<VitaminFormGroup>([])
    });
  }
}
