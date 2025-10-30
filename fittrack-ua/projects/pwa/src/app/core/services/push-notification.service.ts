import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type PushErrorCode =
  | 'unsupported'
  | 'permission-blocked'
  | 'configuration'
  | 'subscription-failed';

export class PushNotificationError extends Error {
  override readonly name = 'PushNotificationError';

  constructor(
    readonly code: PushErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
  }
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(private readonly swPush: SwPush) {}

  private get vapidKey(): string | undefined {
    return environment.vapidPublicKey?.trim();
  }

  /**
   * Checks whether the current runtime can register push notifications.
   */
  isSupported(): boolean {
    return (
      this.swPush.isEnabled &&
      typeof Notification !== 'undefined' &&
      typeof PushManager !== 'undefined'
    );
  }

  /**
   * Attempts to subscribe the current client to push notifications.
   * Throws a {@link PushNotificationError} when the subscription cannot be created.
   */
  async subscribe(): Promise<PushSubscription> {
    if (!this.isSupported()) {
      throw new PushNotificationError(
        'unsupported',
        'Push повідомлення не підтримуються у цьому середовищі.'
      );
    }

    const vapidKey = this.vapidKey;

    if (!vapidKey) {
      throw new PushNotificationError(
        'configuration',
        'Публічний VAPID-ключ не налаштовано. Зверніться до адміністратора.'
      );
    }

    if (Notification.permission === 'denied') {
      throw new PushNotificationError(
        'permission-blocked',
        'Доступ до push повідомлень заборонено у налаштуваннях браузера.'
      );
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new PushNotificationError(
          'permission-blocked',
          'Для активації push повідомлень надайте відповідний дозвіл у браузері.'
        );
      }
    }

    const existing = await firstValueFrom(this.swPush.subscription);

    if (existing) {
      return existing;
    }

    try {
      return await this.swPush.requestSubscription({
        serverPublicKey: vapidKey
      });
    } catch (error) {
      throw new PushNotificationError(
        'subscription-failed',
        'Не вдалося оформити підписку на push повідомлення. Повторіть спробу пізніше.',
        { cause: error }
      );
    }
  }

  describeError(error: unknown): string {
    if (error instanceof PushNotificationError) {
      return error.message;
    }

    return 'Сталася невідома помилка під час активації push повідомлень.';
  }
}
