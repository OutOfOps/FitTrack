import { Injectable } from '@angular/core';

export interface CloudConnector<TConfig = Record<string, unknown>> {
  readonly id: string;
  readonly displayName: string;
  connect(config: TConfig): Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class CloudConnectorsRegistry {
  private readonly connectors = new Map<string, CloudConnector>();

  register(connector: CloudConnector): void {
    this.connectors.set(connector.id, connector);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }

  list(): CloudConnector[] {
    return Array.from(this.connectors.values());
  }

  async connect(id: string, config: Record<string, unknown> = {}): Promise<boolean> {
    const connector = this.connectors.get(id);
    if (!connector) {
      return false;
    }

    return connector.connect(config);
  }
}
