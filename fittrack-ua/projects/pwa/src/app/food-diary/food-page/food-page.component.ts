import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FoodDiaryComponent } from '../food-diary.component';
import { VitaminBalanceComponent } from '../../vitamin-balance/vitamin-balance.component';

@Component({
  selector: 'app-food-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, FoodDiaryComponent, VitaminBalanceComponent],
  templateUrl: './food-page.component.html',
  styleUrls: ['./food-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FoodPageComponent {
  readonly nutritionHighlights = [
    {
      icon: 'restaurant_menu',
      title: 'Власні страви',
      description: 'Додавайте українські рецепти та продукти з деталями про калорійність і мікронутрієнти.'
    },
    {
      icon: 'insights',
      title: 'Щоденний аналіз',
      description: 'Оцінюйте баланс білків, жирів та вуглеводів, щоб коригувати раціон у режимі реального часу.'
    },
    {
      icon: 'spa',
      title: 'Вітамінний контроль',
      description: 'Відстежуйте надходження вітамінів та мінералів і запобігайте дефіциту ключових елементів.'
    }
  ];
}
