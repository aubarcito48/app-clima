import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'sobre-nosotros',
    loadComponent: () => import('./pages/site/about-page/about-page').then((page) => page.AboutPage),
  },
  { path: '', loadComponent: () => import('./pages/weather/weather').then((page) => page.Weather) },
  { path: '**', redirectTo: '' },
];
