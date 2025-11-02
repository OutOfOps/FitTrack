import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PushNotificationService } from '../core/services/push-notification.service';
import { FitButtonComponent } from '@fittrack/ui';
import { WaterTrackerComponent } from '../water-tracker/water-tracker.component';
import { FoodDiaryComponent } from '../food-diary/food-diary.component';
import { VitaminBalanceComponent } from '../vitamin-balance/vitamin-balance.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    FitButtonComponent,
    WaterTrackerComponent,
    FoodDiaryComponent,
    VitaminBalanceComponent,
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  @ViewChild('dashboardsSection') private dashboardsSection?: ElementRef<HTMLElement>;
  private readonly statusMessage = signal<string | null>(null);
  private readonly statusType = signal<'idle' | 'success' | 'error'>('idle');
  readonly isProcessing = signal(false);
  readonly heroFocus = [
    { icon: 'water_drop', label: 'Гідратація' },
    { icon: 'local_dining', label: 'Харчування' },
    { icon: 'self_improvement', label: 'Відновлення' }
  ];

  readonly highlights = [
    {
      icon: 'insights',
      title: 'Аналітика прогресу',
      description: 'Відстежуйте тренування у режимі реального часу та плануйте наступні кроки.'
    },
    {
      icon: 'cloud_sync',
      title: 'Автономність',
      description: 'Працюйте офлайн з автоматичною синхронізацією, щойно з’явиться інтернет.'
    },
    {
      icon: 'hub',
      title: 'Інтеграції',
      description: 'Підключайте трекери, ваги та хмарні сервіси без складних налаштувань.'
    }
  ];
  readonly isPushSupported = this.pushNotifications.isSupported();
  readonly bannerType = computed(() => this.statusType());
  readonly bannerMessage = computed(() => this.statusMessage());

  constructor(private readonly pushNotifications: PushNotificationService) {}

  scrollToDashboards(): void {
    const target = this.dashboardsSection?.nativeElement;

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
