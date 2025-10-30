import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataCoreService {
  private readonly storage = new Map<string, unknown>();

  upsert<T>(key: string, payload: T): void {
    this.storage.set(key, structuredClone(payload));
  }

  read<T>(key: string): T | undefined {
    return structuredClone(this.storage.get(key) as T | undefined);
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  clear(key?: string): void {
    if (key) {
      this.storage.delete(key);
      return;
    }

    this.storage.clear();
  }
}
