import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/weather/weather').then((page) => page.Weather) },
  { path: '**', redirectTo: '' },
];
