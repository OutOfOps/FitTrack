import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  readonly settingsItems = [
    {
      icon: 'schedule',
      title: 'Нагадування',
      description: 'Створіть персональні сповіщення про тренування, воду або харчування.',
      link: '/settings/reminders'
    },
    {
      icon: 'restaurant',
      title: 'Каталог харчування',
      description: 'Редагуйте перелік страв та продуктів, щоб швидко додавати їх у щоденник.',
      link: '/settings/food-catalog'
    }
  ];
}
