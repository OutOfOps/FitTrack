import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormControl,
  FormGroup
} from '@angular/forms';
import { ReminderSchedulerService, ReminderSchedule, UiToolkitModule } from '@fittrack/ui';

interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

type ReminderFormGroup = FormGroup<{
  label: FormControl<string>;
  time: FormControl<string>;
  weekdays: FormControl<number[]>;
}>;

@Component({
  selector: 'app-settings-reminders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiToolkitModule],
  templateUrl: './settings-reminders.component.html',
  styleUrls: ['./settings-reminders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsRemindersComponent {
  private readonly scheduler = inject(ReminderSchedulerService);
  private readonly fb = inject(FormBuilder);
  private readonly statusState = signal<StatusMessage | null>(null);
  readonly form: ReminderFormGroup = this.createForm();
  readonly schedules = this.scheduler.schedules;
  readonly permission = this.scheduler.permission;
  readonly isSupported = this.scheduler.isSupported();
  readonly statusMessage = computed(() => this.statusState());
  readonly processing = signal(false);
  readonly weekdayOptions = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 0, label: 'Нд' }
  ];

  readonly permissionDescription = computed(() => {
    const permission = this.permission();
    switch (permission) {
      case 'granted':
        return 'Дозвіл на показ сповіщень надано.';
      case 'denied':
        return 'Браузер заблокував показ сповіщень. Оновіть налаштування браузера, щоб дозволити нагадування.';
      default:
        return 'Надайте дозвіл на показ сповіщень, щоб отримувати нагадування.';
    }
  });
  trackById(_index: number, schedule: ReminderSchedule): string {
    return schedule.id;
  }

  formatWeekdays(schedule: ReminderSchedule): string {
    const names = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    if (!schedule.weekdays.length) {
      return 'Щодня';
    }

    return schedule.weekdays
      .slice()
      .sort()
      .map((value) => names[value])
      .join(', ');
  }

  isWeekdaySelected(day: number): boolean {
    const selected = new Set(this.form.controls.weekdays.value);
    return selected.has(day);
  }

  toggleWeekday(day: number, checked: boolean): void {
    const control = this.form.controls.weekdays;
    const current = new Set(control.value);
    if (checked) {
      current.add(day);
    } else {
      current.delete(day);
    }

    control.setValue(Array.from(current).sort());
    control.markAsDirty();
  }

  async requestPermission(): Promise<void> {
    if (!this.isSupported) {
      return;
    }

    this.processing.set(true);
    try {
      const permission = await this.scheduler.requestPermission();
      if (permission === 'granted') {
        this.statusState.set({ type: 'success', text: 'Нагадування активовано.' });
      } else {
        this.statusState.set({
          type: 'error',
          text: 'Доступ до сповіщень не надано. Налаштуйте браузер для дозволу.'
        });
      }
    } catch (error) {
      console.error('Не вдалося отримати дозвіл на нагадування', error);
      this.statusState.set({
        type: 'error',
        text: 'Сталася помилка під час запиту дозволу на показ сповіщень.'
      });
    } finally {
      this.processing.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.form.controls.weekdays.value.length) {
      this.statusState.set({
        type: 'error',
        text: 'Оберіть принаймні один день тижня для нагадування.'
      });
      return;
    }

    this.processing.set(true);
    try {
      await this.scheduler.saveSchedule({
        label: this.form.controls.label.value,
        time: this.form.controls.time.value,
        enabled: true,
        weekdays: this.form.controls.weekdays.value
      });
      this.statusState.set({ type: 'success', text: 'Нагадування збережено.' });
      this.form.reset({ label: '', time: '07:30', weekdays: [1, 3, 5] });
    } catch (error) {
      console.error('Не вдалося зберегти нагадування', error);
      this.statusState.set({
        type: 'error',
        text: 'Сталася помилка під час збереження нагадування. Спробуйте ще раз.'
      });
    } finally {
      this.processing.set(false);
    }
  }

  async toggle(schedule: ReminderSchedule, enabled: boolean): Promise<void> {
    await this.scheduler.toggleSchedule(schedule.id, enabled);
  }

  async remove(schedule: ReminderSchedule): Promise<void> {
    await this.scheduler.deleteSchedule(schedule.id);
    this.statusState.set({ type: 'success', text: 'Нагадування видалено.' });
  }

  private createForm(): ReminderFormGroup {
    return this.fb.nonNullable.group({
      label: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(80)]
      }),
      time: this.fb.nonNullable.control('07:30', { validators: [Validators.required] }),
      weekdays: this.fb.nonNullable.control<number[]>([1, 3, 5])
    });
  }
}
