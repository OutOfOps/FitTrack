import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'about'
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.component').then((m) => m.AboutComponent)
  },
  {
    path: 'water',
    loadComponent: () =>
      import('./water-tracker/water-page/water-page.component').then((m) => m.WaterPageComponent)
  },
  {
    path: 'food',
    loadComponent: () =>
      import('./food-diary/food-page/food-page.component').then((m) => m.FoodPageComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent)
  },
  {
    path: 'settings/reminders',
    loadComponent: () =>
      import('./settings-reminders/settings-reminders.component').then(
        (m) => m.SettingsRemindersComponent
      )
  },
  {
    path: 'settings/food-catalog',
    loadComponent: () =>
      import('./settings-food-catalog/settings-food-catalog.component').then(
        (m) => m.SettingsFoodCatalogComponent
      )
  },
  {
    path: '**',
    redirectTo: 'about',
    pathMatch: 'full'
  }
];
