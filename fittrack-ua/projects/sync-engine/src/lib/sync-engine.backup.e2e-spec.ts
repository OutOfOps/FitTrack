import { SyncEngine } from './sync-engine.service';

describe('SyncEngine backup smoke test', () => {
  let originalNavigator: Navigator | undefined;

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

  it('completes queued backup jobs via service worker message flow', async () => {
    let messageHandler: ((event: MessageEvent) => void) | undefined;
    const postMessage = jasmine.createSpy('postMessage');
    const register = jasmine.createSpy('register').and.returnValue(Promise.resolve());

    const controller = {
      postMessage
    } as unknown as ServiceWorker;

    const serviceWorker: Partial<ServiceWorkerContainer> = {
      controller,
      ready: Promise.resolve({
        sync: { register } as unknown as SyncManager
      } as ServiceWorkerRegistration),
      addEventListener: jasmine.createSpy('addEventListener').and.callFake(
        (type: string, handler: EventListenerOrEventListenerObject) => {
          if (type === 'message') {
            messageHandler = handler as (event: MessageEvent) => void;
          }
        }
      )
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker } as Navigator,
      configurable: true,
      writable: true
    });

    const engine = new SyncEngine();
    let executed = false;

    const jobId = await engine.runBackup({ foo: 'bar' }, async () => {
      executed = true;
    });

    expect(register).toHaveBeenCalledWith('fittrack-backup');
    expect(postMessage).toHaveBeenCalledWith({
      type: 'sync-engine:queue',
      payload: jasmine.objectContaining({ tag: 'fittrack-backup' })
    });

    expect(messageHandler).toBeDefined();

    messageHandler?.({
      data: {
        type: 'sync-engine:trigger',
        payload: {
          tag: 'fittrack-backup',
          jobs: [{ id: jobId, payload: { foo: 'bar' } }]
        }
      }
    } as MessageEvent);

    await Promise.resolve();
    await Promise.resolve();

    expect(executed).toBeTrue();

    const completionCall = postMessage.calls
      .all()
      .map((call) => call.args[0])
      .find((payload) => payload?.type === 'sync-engine:complete');

    expect(completionCall).toEqual({
      type: 'sync-engine:complete',
      payload: {
        tag: 'fittrack-backup',
        jobId
      }
    });
  });
});
