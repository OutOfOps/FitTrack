import { SyncEngine, SyncConflictError } from './sync-engine.service';

describe('SyncEngine', () => {
  let originalNavigator: Navigator | undefined;
  let engine: SyncEngine;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
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

  function createNavigatorStub(options: { controller?: boolean; sync?: boolean } = {}) {
    let messageHandler: ((event: MessageEvent) => void) | undefined;
    const postMessage = jasmine.createSpy('postMessage');
    const register = jasmine.createSpy('register').and.returnValue(Promise.resolve());
    const serviceWorker: Partial<ServiceWorkerContainer> = {
      controller: options.controller === false ? null : ({} as ServiceWorker),
      ready: Promise.resolve({
        sync: options.sync === false ? undefined : ({ register } as unknown as SyncManager)
      } as ServiceWorkerRegistration),
      addEventListener: jasmine.createSpy('addEventListener').and.callFake(
        (type: string, handler: EventListenerOrEventListenerObject) => {
          if (type === 'message') {
            messageHandler = handler as (event: MessageEvent) => void;
          }
        }
      )
    };

    if (serviceWorker.controller) {
      (serviceWorker.controller as ServiceWorker).postMessage = postMessage;
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker } as Navigator,
      configurable: true,
      writable: true
    });

    return { postMessage, register, getMessageHandler: () => messageHandler };
  }

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('executes backup immediately when background sync unavailable', async () => {
    createNavigatorStub({ controller: false });
    engine = new SyncEngine();

    let executed = false;
    await engine.runBackup('payload', async (job) => {
      executed = true;
      expect(job.payload).toBe('payload');
    });

    expect(executed).toBeTrue();
    expect(engine.status().phase).toBe('idle');
  });

  it('defers backup execution until service worker triggers sync', async () => {
    const { postMessage, register, getMessageHandler } = createNavigatorStub({ controller: true, sync: true });
    engine = new SyncEngine();

    let calls = 0;
    const jobId = await engine.runBackup({ foo: 'bar' }, async () => {
      calls += 1;
    });

    expect(register).toHaveBeenCalledWith('fittrack-backup');
    expect(postMessage).toHaveBeenCalledWith({
      type: 'sync-engine:queue',
      payload: {
        tag: 'fittrack-backup',
        job: jasmine.objectContaining({ id: jobId })
      }
    });
    expect(calls).toBe(0);
    expect(engine.status().phase).toBe('pending-sync');

    const handler = getMessageHandler();
    expect(handler).toBeDefined();

    handler?.({
      data: {
        type: 'sync-engine:trigger',
        payload: {
          tag: 'fittrack-backup',
          jobs: [{ id: jobId, payload: { foo: 'bar' } }]
        }
      }
    } as MessageEvent);

    await flushMicrotasks();

    expect(calls).toBe(1);
    expect(engine.status().phase).toBe('idle');
  });

  it('retries conflicting jobs after resolver succeeds', async () => {
    createNavigatorStub({ controller: false });
    engine = new SyncEngine();

    let shouldFail = true;
    let executions = 0;

    await engine.runBackup({ foo: 'bar' }, async () => {
      executions += 1;
      if (shouldFail) {
        shouldFail = false;
        throw new SyncConflictError('conflict');
      }
    });

    expect(engine.status().phase).toBe('conflict');

    await engine.resolveConflict(async () => Promise.resolve());
    await flushMicrotasks();

    expect(executions).toBe(2);
    expect(engine.status().phase).toBe('idle');
  });

  it('registers restore jobs with dedicated tag', async () => {
    const { postMessage, register } = createNavigatorStub({ controller: true, sync: true });
    engine = new SyncEngine();

    await engine.runRestore({ id: 42 }, async () => Promise.resolve());

    expect(register).toHaveBeenCalledWith('fittrack-restore');
    expect(postMessage).toHaveBeenCalledWith({
      type: 'sync-engine:queue',
      payload: jasmine.objectContaining({ tag: 'fittrack-restore' })
    });
  });
});
