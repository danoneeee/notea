<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hydrateNotesFromRemote } from '../services/notes';
import { hydrateSetupsFromRemote } from '../services/setups';
import { hydrateTeawareFromRemote } from '../services/teaware';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const tabs = [
  { name: 'app-notes', label: 'Заметки', to: '/app/notes' },
  { name: 'app-analytics', label: 'Аналитика', to: '/app/analytics' },
  { name: 'app-profile', label: 'Профиль', to: '/app/profile' },
  { name: 'app-vessels', label: 'Посуда', to: '/app/vessels' },
];

const activeTab = computed(() => {
  const name = String(route.name || '');
  if (name === 'app-new-note' || name === 'app-note-detail' || name === 'edit-note') return 'app-notes';
  return name;
});

function logout() {
  auth.logout();
  router.push('/');
}

function goHome() {
  router.push({ name: 'app-notes' });
}

onMounted(() => {
  void (async () => {
    await Promise.allSettled([hydrateTeawareFromRemote(), hydrateSetupsFromRemote()]);
    await hydrateNotesFromRemote();
  })();
});
</script>

<template>
  <main class="page">
    <header class="header">
      <div class="header-top">
        <button class="brand" @click="goHome">Notea</button>
        <div class="brand-tagline">личные заметки о чае</div>
        <div class="actions">
          <span class="welcome">Привет, {{ auth.state.userName }}</span>
          <button class="btn btn-ghost" @click="logout">Выйти</button>
        </div>
      </div>
      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="tab"
          :class="{ active: activeTab === tab.name }"
          @click="router.push(tab.to)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <router-view />
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  background: #f7fbf5;
  color: #182018;
}

.header {
  max-width: 1200px;
  margin: 0 auto 16px;
  background: #fff;
  border: 1px solid #deead8;
  border-radius: 16px;
  padding: 10px 14px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand {
  border: 0;
  background: transparent;
  font-size: 22px;
  font-weight: 800;
  cursor: pointer;
}

.brand-tagline {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6a806e;
  margin-top: 2px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  border-top: 1px solid #e4efe0;
  padding-top: 4px;
}

.tab {
  border: 0;
  border-radius: 0;
  padding: 7px 10px 9px;
  background: transparent;
  color: #4a6a52;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid transparent;
  transition: color 0.16s ease, border-bottom-color 0.16s ease, background-color 0.16s ease;
}

.tab.active {
  color: #215632;
  border-bottom-color: #2f7b3d;
  background-color: rgba(47, 123, 61, 0.04);
}

.tab:not(.active):hover {
  color: #2f7b3d;
  border-bottom-color: rgba(47, 123, 61, 0.4);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.welcome {
  font-size: 13px;
  color: #436248;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #2f7b3d;
  color: #fff;
}

.btn-ghost {
  background: #eaf5e6;
  color: #1f4d28;
}

@media (max-width: 980px) {
  .header {
    gap: 8px;
  }

  .header-top {
    flex-wrap: wrap;
  }
}
</style>
