import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/weather/WeatherPage.vue') },
    { path: '/sobre-nosotros', component: () => import('./pages/site/AboutPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, _from, saved) { return saved ?? (to.hash ? { el: to.hash } : { top: 0 }); },
});
