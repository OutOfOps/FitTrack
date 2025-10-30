import { Injectable, computed, signal } from '@angular/core';

export interface SyncJob<T = unknown> {
  id: string;
  payload: T;
  lastRun?: Date;
}

export type SyncOperation = 'backup' | 'restore';

export type SyncPhase = 'idle' | 'pending-sync' | 'running' | 'conflict' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  operation?: SyncOperation;
  jobId?: string;
  error?: unknown;
}

export type SyncHandler<T = unknown> = (job: SyncJob<T>) => Promise<void>;

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

export class SyncConflictError extends Error {
  override readonly name = 'SyncConflictError';
}

@Injectable({ providedIn: 'root' })
export class SyncEngine {
  private readonly jobs = new Map<string, { operation: SyncOperation; job: SyncJob }>();
  private readonly handlers = new Map<string, SyncHandler>();
  private readonly state = signal<SyncStatus>({ phase: 'idle' });
  private readonly conflictJobId = signal<string | null>(null);
  private readonly lastError = signal<unknown | null>(null);

  readonly status = computed(() => this.state());
  readonly error = computed(() => this.lastError());

  constructor() {
    this.bindServiceWorkerMessages();
  }

  async runBackup<T>(payload: T, handler: SyncHandler<T>): Promise<string> {
    return this.scheduleJob('backup', payload, handler);
  }

  async runRestore<T>(payload: T, handler: SyncHandler<T>): Promise<string> {
    return this.scheduleJob('restore', payload, handler);
  }

  async resolveConflict(resolver: () => Promise<void>): Promise<void> {
    const jobId = this.conflictJobId();
    if (!jobId) {
      return;
    }

    const entry = this.jobs.get(jobId);
    if (!entry) {
      this.conflictJobId.set(null);
      this.state.set({ phase: 'idle' });
      return;
    }

    try {
      await resolver();
      this.state.set({ phase: 'idle', operation: entry.operation, jobId });
      this.conflictJobId.set(null);
      await this.executeJob(jobId);
    } catch (error) {
      this.lastError.set(error);
      this.state.set({ phase: 'error', operation: entry.operation, jobId, error });
      throw error;
    }
  }

  private async scheduleJob<T>(
    operation: SyncOperation,
    payload: T,
    handler: SyncHandler<T>
  ): Promise<string> {
    const job: SyncJob<T> = {
      id: generateId(),
      payload,
      lastRun: new Date()
    };

    this.jobs.set(job.id, { operation, job });
    this.handlers.set(job.id, handler as SyncHandler);

    const scheduled = await this.tryRegisterBackgroundSync(operation, job);
    if (scheduled) {
      this.state.set({ phase: 'pending-sync', operation, jobId: job.id });
      return job.id;
    }

    await this.executeJob(job.id);
    return job.id;
  }

  private async executeJob(jobId: string): Promise<void> {
    const entry = this.jobs.get(jobId);
    const handler = this.handlers.get(jobId);
    if (!entry || !handler) {
      return;
    }

    const { operation, job } = entry;
    this.state.set({ phase: 'running', operation, jobId });
    this.conflictJobId.set(null);

    try {
      await handler(job);
      this.jobs.delete(jobId);
      this.handlers.delete(jobId);
      this.lastError.set(null);
      this.state.set({ phase: 'idle' });
      await this.notifyCompletion(operation, job);
    } catch (error) {
      if (error instanceof SyncConflictError) {
        this.conflictJobId.set(jobId);
        this.state.set({ phase: 'conflict', operation, jobId });
      } else {
        this.lastError.set(error);
        this.state.set({ phase: 'error', operation, jobId, error });
      }
      throw error;
    }
  }

  private async tryRegisterBackgroundSync(
    operation: SyncOperation,
    job: SyncJob
  ): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker?.controller) {
      return false;
    }

    try {
      const registration = await serviceWorker.ready;
      const sync = registration.sync;
      if (!sync || typeof sync.register !== 'function') {
        return false;
      }

      serviceWorker.controller.postMessage({
        type: 'sync-engine:queue',
        payload: {
          tag: this.tagForOperation(operation),
          job
        }
      });

      await sync.register(this.tagForOperation(operation));
      return true;
    } catch (error) {
      console.warn('Не вдалося зареєструвати завдання синхронізації', error);
      return false;
    }
  }

  private async notifyCompletion(operation: SyncOperation, job: SyncJob): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const controller = navigator.serviceWorker?.controller;
    controller?.postMessage({
      type: 'sync-engine:complete',
      payload: {
        tag: this.tagForOperation(operation),
        jobId: job.id
      }
    });
  }

  private bindServiceWorkerMessages(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker) {
      return;
    }

    serviceWorker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'sync-engine:trigger') {
        return;
      }

      const { tag, jobs } = data.payload || {};
      if (!tag || !Array.isArray(jobs)) {
        return;
      }

      const operation = this.operationFromTag(tag);
      if (!operation) {
        return;
      }

      for (const incoming of jobs as SyncJob[]) {
        if (!incoming?.id) {
          continue;
        }

        const existing = this.jobs.get(incoming.id);
        if (!existing) {
          this.jobs.set(incoming.id, { operation, job: incoming });
        }

        void this.executeJob(incoming.id);
      }
    });
  }

  private tagForOperation(operation: SyncOperation): string {
    return operation === 'backup' ? 'fittrack-backup' : 'fittrack-restore';
  }

  private operationFromTag(tag: string): SyncOperation | null {
    switch (tag) {
      case 'fittrack-backup':
        return 'backup';
      case 'fittrack-restore':
        return 'restore';
      default:
        return null;
    }
  }
}
