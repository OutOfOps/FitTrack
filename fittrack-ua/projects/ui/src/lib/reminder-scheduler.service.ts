import { Injectable, computed, signal } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface ReminderSchedule {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  weekdays: number[];
  createdAt: number;
}

class ReminderSchedulerDatabase extends Dexie {
  readonly schedules!: Table<ReminderSchedule, string>;

  constructor() {
    super('fittrack-reminders');
    this.version(1).stores({
      schedules: 'id, createdAt, enabled'
    });
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

@Injectable({ providedIn: 'root' })
export class ReminderSchedulerService {
  private readonly db = new ReminderSchedulerDatabase();
  private readonly schedulesState = signal<ReminderSchedule[]>([]);
  private readonly permissionState = signal<NotificationPermission>(this.readPermission());
  private readonly ready: Promise<void>;

  readonly schedules = computed(() => this.schedulesState());
  readonly permission = computed(() => this.permissionState());

  constructor() {
    this.ready = this.refreshSchedules();
    void this.ready.then(() => this.registerReminderSync());
  }

  isSupported(): boolean {
    return typeof Notification !== 'undefined' && typeof navigator !== 'undefined';
  }

  getPermission(): NotificationPermission {
    return this.permissionState();
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      this.permissionState.set('denied');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      this.permissionState.set('granted');
      return 'granted';
    }

    const result = await Notification.requestPermission();
    this.permissionState.set(result);
    return result;
  }

  async listSchedules(): Promise<ReminderSchedule[]> {
    await this.ready;
    return this.schedulesState().slice();
  }

  async saveSchedule(partial: Omit<ReminderSchedule, 'id' | 'createdAt'> & { id?: string }): Promise<ReminderSchedule> {
    await this.ready;
    const id = partial.id ?? generateId();
    const existing = partial.id ? await this.db.schedules.get(id) : undefined;
    const createdAt = existing?.createdAt ?? Date.now();
    const weekdays = Array.from(new Set(partial.weekdays)).sort();
    const schedule: ReminderSchedule = {
      id,
      label: partial.label.trim(),
      time: partial.time,
      enabled: partial.enabled,
      weekdays,
      createdAt
    };

    await this.db.schedules.put(schedule);
    await this.refreshSchedules();
    await this.registerReminderSync();
    return schedule;
  }

  async toggleSchedule(id: string, enabled: boolean): Promise<void> {
    await this.ready;
    const existing = await this.db.schedules.get(id);
    if (!existing) {
      return;
    }

    await this.db.schedules.update(id, { enabled });
    await this.refreshSchedules();
    await this.registerReminderSync();
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.ready;
    await this.db.schedules.delete(id);
    await this.refreshSchedules();
    await this.registerReminderSync();
  }

  private readPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }

    return Notification.permission;
  }

  private async refreshSchedules(): Promise<void> {
    const all = await this.db.schedules.orderBy('createdAt').toArray();
    this.schedulesState.set(all);
    this.pushUpdateToServiceWorker(all).catch((error) => {
      console.warn('Не вдалося передати оновлені нагадування Service Worker', error);
    });
  }

  private async pushUpdateToServiceWorker(schedules: ReminderSchedule[]): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      return;
    }

    controller.postMessage({
      type: 'reminders:update',
      payload: { schedules }
    });
  }

  private async registerReminderSync(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker) {
      return;
    }

    try {
      const registration = await serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('fittrack-reminders');
      }
    } catch (error) {
      console.warn('Не вдалося зареєструвати синхронізацію нагадувань', error);
    }
  }
}
