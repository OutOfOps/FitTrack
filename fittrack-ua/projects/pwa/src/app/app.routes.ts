import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent)
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
    redirectTo: '',
    pathMatch: 'full'
  }
];
