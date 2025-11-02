import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { WaterTrackerComponent } from '../water-tracker.component';

@Component({
  selector: 'app-water-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, WaterTrackerComponent],
  templateUrl: './water-page.component.html',
  styleUrls: ['./water-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaterPageComponent {
  readonly hydrationTips = [
    {
      icon: 'schedule',
      title: 'Плануйте споживання',
      description: 'Розподіляйте денну норму води рівномірно протягом дня та налаштуйте нагадування.'
    },
    {
      icon: 'sports_gymnastics',
      title: 'Пийте перед тренуваннями',
      description: 'Поповнюйте запаси рідини за 30 хвилин до активності та після завершення занять.'
    },
    {
      icon: 'local_drink',
      title: 'Обирайте якість',
      description: 'Віддавайте перевагу чистій воді та трав’яним напоям без доданого цукру.'
    }
  ];
}
