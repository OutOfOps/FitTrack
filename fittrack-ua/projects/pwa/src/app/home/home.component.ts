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
  readonly highlights = [
    'Прогрес тренувань у реальному часі',
    'Офлайн режим з автоматичною синхронізацією',
    'Інтеграція з хмарними сервісами та пристроями'
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
