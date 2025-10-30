import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { computed, signal } from '@angular/core';
import { ReminderSchedulerService, ReminderSchedule } from '@fittrack/ui';
import { SettingsRemindersComponent } from './settings-reminders.component';

class ReminderSchedulerServiceStub {
  private readonly schedulesState = signal<ReminderSchedule[]>([]);
  readonly schedules = computed(() => this.schedulesState());
  readonly permission = computed(() => 'default' as NotificationPermission);
  readonly requestPermission = jasmine
    .createSpy('requestPermission')
    .and.callFake(async () => 'granted' as NotificationPermission);
  readonly saveSchedule = jasmine
    .createSpy('saveSchedule')
    .and.callFake(async (schedule: Omit<ReminderSchedule, 'id' | 'createdAt'>) => {
      const created: ReminderSchedule = {
        ...schedule,
        id: 'test-id',
        createdAt: Date.now()
      };
      this.schedulesState.set([...this.schedulesState(), created]);
      return created;
    });
  readonly toggleSchedule = jasmine
    .createSpy('toggleSchedule')
    .and.callFake(async (id: string, enabled: boolean) => {
      const next = this.schedulesState().map((item) =>
        item.id === id ? { ...item, enabled } : item
      );
      this.schedulesState.set(next);
    });
  readonly deleteSchedule = jasmine
    .createSpy('deleteSchedule')
    .and.callFake(async (id: string) => {
      this.schedulesState.set(this.schedulesState().filter((item) => item.id !== id));
    });

  isSupported(): boolean {
    return true;
  }

  listSchedules(): Promise<ReminderSchedule[]> {
    return Promise.resolve(this.schedulesState());
  }
}

describe('SettingsRemindersComponent', () => {
  let fixture: ComponentFixture<SettingsRemindersComponent>;
  let component: SettingsRemindersComponent;
  let scheduler: ReminderSchedulerServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsRemindersComponent],
      providers: [
        provideAnimations(),
        { provide: ReminderSchedulerService, useClass: ReminderSchedulerServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsRemindersComponent);
    component = fixture.componentInstance;
    scheduler = TestBed.inject(ReminderSchedulerService) as unknown as ReminderSchedulerServiceStub;
    fixture.detectChanges();
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('saves new reminder via service', async () => {
    component.form.controls.label.setValue('Вечірнє кардіо');
    component.form.controls.time.setValue('20:15');
    component.form.controls.weekdays.setValue([1, 3, 5]);

    await component.submit();

    expect(scheduler.saveSchedule).toHaveBeenCalled();
    expect(scheduler.schedules().length).toBe(1);
  });

  it('toggles existing reminder state', async () => {
    scheduler.saveSchedule({ label: 'Тест', time: '10:00', enabled: true, weekdays: [1] });
    fixture.detectChanges();

    await component.toggle(scheduler.schedules()[0], false);
    expect(scheduler.toggleSchedule).toHaveBeenCalled();
  });

  it('removes reminder', async () => {
    scheduler.saveSchedule({ label: 'A', time: '08:00', enabled: true, weekdays: [1] });
    fixture.detectChanges();

    await component.remove(scheduler.schedules()[0]);
    expect(scheduler.deleteSchedule).toHaveBeenCalled();
    expect(scheduler.schedules().length).toBe(0);
  });
});
