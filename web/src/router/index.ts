import { createRouter, createWebHistory } from 'vue-router';
import AnalyticsPage from '../pages/AnalyticsPage.vue';
import AppShellPage from '../pages/AppShellPage.vue';
import FeedPage from '../pages/FeedPage.vue';
import LandingPage from '../pages/LandingPage.vue';
import NewNotePage from '../pages/NewNotePage.vue';
import NotesPage from '../pages/NotesPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import VesselsPage from '../pages/VesselsPage.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingPage,
    },
    {
      path: '/app',
      component: AppShellPage,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/app/notes' },
        { path: 'notes', name: 'app-notes', component: NotesPage },
        { path: 'vessels', name: 'app-vessels', component: VesselsPage },
        { path: 'analytics', name: 'app-analytics', component: AnalyticsPage },
        { path: 'profile', name: 'app-profile', component: ProfilePage },
        { path: 'feed', name: 'app-feed', component: FeedPage },
      ],
    },
    {
      path: '/notes/new',
      name: 'new-note',
      component: NewNotePage,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.initialize();

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return { name: 'landing' };
  }

  if (to.name === 'landing' && auth.isAuthenticated.value) {
    return { name: 'app-notes' };
  }

  return true;
});

export default router;
