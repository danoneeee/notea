<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listTeas } from '../services/tea';
import { useAuthStore } from '../stores/auth';

type Tea = {
  id: string;
  name: string;
  province: string;
  variant: string;
};

const router = useRouter();
const auth = useAuthStore();

const teas = ref<Tea[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    teas.value = await listTeas();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
});

function goToLanding() {
  router.push('/');
}

function goToNewNote() {
  router.push('/notes/new');
}

function logout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <main class="page">
    <header class="header">
      <div class="brand">Notea</div>
      <div class="actions">
        <span class="welcome">{{ auth.state.userName }}</span>
        <button class="btn btn-primary" @click="goToNewNote">Новая заметка</button>
        <button class="btn btn-ghost" @click="goToLanding">Лендинг</button>
        <button class="btn btn-ghost" @click="logout">Выйти</button>
      </div>
    </header>

    <section class="content">
      <h1>Главная</h1>
      <p class="subtitle">Твои сохраненные чайные заметки и коллекция.</p>

      <p v-if="loading">Загружаем...</p>
      <p v-else-if="error" class="status status-error">{{ error }}</p>
      <ul v-else class="list">
        <li v-for="t in teas" :key="t.id">
          <strong>{{ t.name }}</strong> ({{ t.province }}) — {{ t.variant }}
        </li>
      </ul>

      <p v-if="!loading && !error && teas.length === 0" class="empty">Пока нет записей по чаям.</p>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: #182018;
  background: #f7fbf5;
}

.header {
  max-width: 1080px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-size: 24px;
  font-weight: 800;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome {
  color: #3f5e43;
  font-size: 14px;
}

.content {
  max-width: 1080px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #dfe9db;
  border-radius: 16px;
  padding: 24px;
}

.subtitle {
  color: #4a624c;
}

.list {
  margin: 12px 0 0;
  padding-left: 20px;
  line-height: 1.7;
}

.empty {
  color: #607963;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
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

.status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
}

.status-error {
  background: #fdecee;
  color: #992b3f;
  border: 1px solid #f4c4cc;
}
</style>
