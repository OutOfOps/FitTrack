import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushNotificationService } from '../core/services/push-notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly statusMessage = signal<string | null>(null);
  private readonly statusType = signal<'idle' | 'success' | 'error'>('idle');
  readonly isProcessing = signal(false);
  readonly highlights = [
    'Прогрес тренувань у реальному часі',
    'Офлайн режим з автоматичною синхронізацією',
    'Інтеграція з хмарними сервісами та пристроями'
  ];
  readonly isPushSupported = this.pushNotifications.isSupported();
  readonly bannerType = computed(() => this.statusType());
  readonly bannerMessage = computed(() => this.statusMessage());

  constructor(private readonly pushNotifications: PushNotificationService) {}

  async enableNotifications(): Promise<void> {
    if (this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    this.statusType.set('idle');
    this.statusMessage.set(null);

    try {
      await this.pushNotifications.subscribe();
      this.statusType.set('success');
      this.statusMessage.set('Push сповіщення активовані. Дякуємо!');
    } catch (error) {
      this.statusType.set('error');
      this.statusMessage.set(this.pushNotifications.describeError(error));
    } finally {
      this.isProcessing.set(false);
    }
  }
}
