import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { ReplaySubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PushNotificationError, PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let swPushSpy: jasmine.SpyObj<SwPush>;
  let requestPermissionSpy: jasmine.Spy;
  let subscription$: ReplaySubject<PushSubscription | null>;

  beforeEach(() => {
    (globalThis as unknown as { PushManager?: object }).PushManager = function PushManager() {} as unknown as PushManager;
    requestPermissionSpy = jasmine
      .createSpy('requestPermission')
      .and.callFake(async () => {
        (globalThis as { Notification: Notification }).Notification.permission = 'granted';
        return 'granted';
      });
    subscription$ = new ReplaySubject<PushSubscription | null>(1);
    subscription$.next(null);
    (globalThis as { Notification: Notification }).Notification = {
      permission: 'default',
      requestPermission: requestPermissionSpy
    } as unknown as Notification;

    swPushSpy = jasmine.createSpyObj<SwPush>('SwPush', ['requestSubscription'], {
      isEnabled: true,
      subscription: subscription$.asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        PushNotificationService,
        { provide: SwPush, useValue: swPushSpy }
      ]
    });

    service = TestBed.inject(PushNotificationService);
  });

  it('should report support when service worker push is enabled', () => {
    expect(service.isSupported()).toBeTrue();
  });

  it('should throw configuration error when VAPID key is missing', async () => {
    const originalVapidKey = environment.vapidPublicKey;
    (environment as { vapidPublicKey?: string }).vapidPublicKey = '';

    await expectAsync(service.subscribe()).toBeRejectedWithError(
      PushNotificationError,
      /VAPID/
    );

    (environment as { vapidPublicKey?: string }).vapidPublicKey = originalVapidKey;
  });

  it('should throw when push is not supported', async () => {
    swPushSpy.isEnabled = false;

    await expectAsync(service.subscribe()).toBeRejectedWithError(
      PushNotificationError,
      /не підтримуються/
    );
  });

  it('should request permission when needed', async () => {
    swPushSpy.requestSubscription.and.resolveTo({} as PushSubscription);

    await service.subscribe();

    expect(requestPermissionSpy).toHaveBeenCalled();
  });

  it('should resolve with subscription when successful', async () => {
    const subscription = {} as PushSubscription;
    swPushSpy.requestSubscription.and.resolveTo(subscription);

    await expectAsync(service.subscribe()).toBeResolvedTo(subscription);
  });

  it('should reuse existing subscription', async () => {
    const subscription = {} as PushSubscription;
    subscription$.next(subscription);

    await expectAsync(service.subscribe()).toBeResolvedTo(subscription);
    expect(swPushSpy.requestSubscription).not.toHaveBeenCalled();
  });

  it('should wrap subscription errors', async () => {
    const failure = new Error('boom');
    swPushSpy.requestSubscription.and.rejectWith(failure);

    await expectAsync(service.subscribe()).toBeRejectedWithError(
      PushNotificationError,
      /Не вдалося/
    );
  });
});
