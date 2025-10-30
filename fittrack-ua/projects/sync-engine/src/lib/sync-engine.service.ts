import { Injectable } from '@angular/core';

export interface SyncJob<T = unknown> {
  id: string;
  payload: T;
  lastRun?: Date;
}

@Injectable({ providedIn: 'root' })
export class SyncEngine {
  private readonly queue: SyncJob[] = [];

  schedule<T>(job: SyncJob<T>): void {
    const existingIndex = this.queue.findIndex((item) => item.id === job.id);
    if (existingIndex !== -1) {
      this.queue[existingIndex] = { ...job, lastRun: new Date() };
      return;
    }

    this.queue.push({ ...job, lastRun: new Date() });
  }

  drain(): SyncJob[] {
    return this.queue.splice(0);
  }

  peek(): readonly SyncJob[] {
    return this.queue;
  }
}
