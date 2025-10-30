import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { ReminderSchedulerService, ReminderSchedule } from './reminder-scheduler.service';

describe('ReminderSchedulerService', () => {
  let service: ReminderSchedulerService;
  const originalNotification = globalThis.Notification;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'Notification', {
      value: {
        permission: 'default' as NotificationPermission,
        async requestPermission(this: { permission: NotificationPermission }) {
          this.permission = 'granted';
          return this.permission;
        }
      },
      configurable: true,
      writable: true
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: undefined
      },
      configurable: true,
      writable: true
    });

    service = new ReminderSchedulerService();
  });

  afterEach(async () => {
    await Dexie.delete('fittrack-reminders');
    if (originalNotification) {
      Object.defineProperty(globalThis, 'Notification', {
        value: originalNotification,
        configurable: true,
        writable: true
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { Notification?: unknown }).Notification;
    }
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  });

  it('requests notification permission when supported', async () => {
    const permission = await service.requestPermission();
    expect(permission).toBe('granted');
    expect(service.permission()).toBe('granted');
  });

  it('falls back to denied permission when notifications unsupported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { Notification?: unknown }).Notification;
    const unsupported = new ReminderSchedulerService();
    const permission = await unsupported.requestPermission();
    expect(permission).toBe('denied');
    expect(unsupported.permission()).toBe('denied');
  });

  it('persists schedules in indexeddb', async () => {
    const schedule = await service.saveSchedule({
      label: 'Ранкове тренування',
      time: '07:30',
      enabled: true,
      weekdays: [1, 3, 5]
    });

    const stored = await service.listSchedules();
    expect(stored.length).toBe(1);
    expect(stored[0].label).toBe('Ранкове тренування');
    expect(stored[0].weekdays).toEqual([1, 3, 5]);
    expect(schedule.id).toBe(stored[0].id);
  });

  it('updates schedule state when toggled', async () => {
    const schedule = await service.saveSchedule({
      label: 'Вечірня розтяжка',
      time: '21:00',
      enabled: true,
      weekdays: [0, 6]
    });

    await service.toggleSchedule(schedule.id, false);
    const stored = await service.listSchedules();
    expect(stored[0].enabled).toBeFalse();
  });

  it('removes schedule by identifier', async () => {
    const created: ReminderSchedule[] = [];
    created.push(
      await service.saveSchedule({ label: 'A', time: '09:00', enabled: true, weekdays: [1] })
    );
    created.push(
      await service.saveSchedule({ label: 'B', time: '10:00', enabled: true, weekdays: [2] })
    );

    await service.deleteSchedule(created[0].id);
    const stored = await service.listSchedules();
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe(created[1].id);
  });
});
