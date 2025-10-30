import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const LAST_BACKUP_STORAGE_KEY = 'fittrack:last-backup';

@Injectable({ providedIn: 'root' })
export class AppStatusService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly onlineState = signal(this.readInitialOnlineState());
  private readonly lastBackupTimestamp = signal<number | null>(this.readStoredBackupTimestamp());

  constructor() {
    if (typeof window !== 'undefined') {
      merge(
        fromEvent(window, 'online').pipe(map(() => true)),
        fromEvent(window, 'offline').pipe(map(() => false))
      )
        .pipe(startWith(this.readInitialOnlineState()), takeUntilDestroyed(this.destroyRef))
        .subscribe((isOnline) => this.onlineState.set(isOnline));
    } else {
      this.onlineState.set(false);
    }
  }

  readonly isOnline = computed(() => this.onlineState());
  readonly isOffline = computed(() => !this.onlineState());
  readonly lastBackup = computed(() => this.lastBackupTimestamp());

  updateLastBackup(timestamp: number = Date.now()): void {
    this.lastBackupTimestamp.set(timestamp);
    this.persistBackupTimestamp(timestamp);
  }

  private readInitialOnlineState(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  private readStoredBackupTimestamp(): number | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
      return stored ? Number.parseInt(stored, 10) : null;
    } catch (error) {
      console.warn('Не вдалося прочитати дату останнього бекапу', error);
      return null;
    }
  }

  private persistBackupTimestamp(timestamp: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(LAST_BACKUP_STORAGE_KEY, String(timestamp));
    } catch (error) {
      console.warn('Не вдалося зберегти дату останнього бекапу', error);
    }
  }
}
