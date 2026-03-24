<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AuthModal from '../components/AuthModal.vue';
import { useAuthStore } from '../stores/auth';
import { listTeas } from '../services/tea';

const router = useRouter();
const auth = useAuthStore();
const showAuth = ref(false);
const teas = ref<Array<{ id: string; name: string; province: string; variant: string }>>([]);
const teasLoading = ref(false);
const teasError = ref<string | null>(null);

const isAuthenticated = computed(() => auth.isAuthenticated.value);

function openAuth() {
  showAuth.value = true;
}

function onAuthSuccess() {
  loadTeas();
}

function goToNewNote() {
  router.push('/notes/new');
}

function logout() {
  auth.logout();
  teas.value = [];
  teasError.value = null;
}

async function loadTeas() {
  if (!isAuthenticated.value) {
    return;
  }
  teasLoading.value = true;
  teasError.value = null;
  try {
    teas.value = await listTeas();
  } catch (e: unknown) {
    teasError.value = e instanceof Error ? e.message : String(e);
  } finally {
    teasLoading.value = false;
  }
}

onMounted(() => {
  loadTeas();
});

watch(isAuthenticated, (next) => {
  if (next) {
    loadTeas();
  }
});
</script>

<template>
  <main class="page">
    <header class="header">
      <div class="brand">Notea</div>
      <div class="header-actions">
        <template v-if="!isAuthenticated">
          <button class="btn btn-primary" @click="openAuth">Войти / Регистрация</button>
        </template>
        <template v-else>
          <span class="welcome">Привет, {{ auth.state.userName }}</span>
          <button class="btn btn-primary" @click="goToNewNote">Новая заметка</button>
          <button class="btn btn-ghost" @click="logout">Выйти</button>
        </template>
      </div>
    </header>

    <section class="hero">
      <p class="hero-kicker">Чайные заметки без лишнего шума</p>
      <h1>Организуй свою чайную коллекцию в одном месте</h1>
      <p class="hero-text">
        Notea помогает сохранять дегустации, любимые сорта и личные наблюдения, чтобы каждая чашка была
        осознанной.
      </p>
      <div class="hero-actions">
        <button v-if="!isAuthenticated" class="btn btn-primary" @click="openAuth">Начать бесплатно</button>
        <button v-else class="btn btn-primary" @click="goToNewNote">Создать заметку</button>
      </div>
    </section>

    <section class="features">
      <article class="feature-card">
        <h2>Структура заметок</h2>
        <p>Разделяй записи по сортам, регионам и методам заваривания.</p>
      </article>
      <article class="feature-card">
        <h2>Быстрый доступ</h2>
        <p>Сразу видишь историю дегустаций и возвращаешься к лучшим находкам.</p>
      </article>
      <article class="feature-card">
        <h2>Личное пространство</h2>
        <p>Твои данные и твои предпочтения, доступные после авторизации.</p>
      </article>
    </section>

    <section v-if="isAuthenticated" class="content">
      <h2>Мои заметки и коллекция</h2>
      <p class="subtitle">Все в одном месте: от списка чаев до создания новой заметки.</p>
      <p v-if="teasLoading">Загружаем...</p>
      <p v-else-if="teasError" class="status status-error">{{ teasError }}</p>
      <ul v-else class="list">
        <li v-for="t in teas" :key="t.id">
          <strong>{{ t.name }}</strong> ({{ t.province }}) — {{ t.variant }}
        </li>
      </ul>
      <p v-if="!teasLoading && !teasError && teas.length === 0" class="empty">Пока нет записей по чаям.</p>
    </section>

    <AuthModal v-model="showAuth" @success="onAuthSuccess" />
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: #182018;
  background: radial-gradient(circle at top right, #f0f7eb 0%, #fbfdf8 45%, #ffffff 100%);
}

.header {
  max-width: 1080px;
  margin: 0 auto 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.welcome {
  color: #39523a;
  font-size: 14px;
}

.hero {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #deead8;
  box-shadow: 0 16px 36px rgba(37, 70, 39, 0.08);
}

.hero-kicker {
  margin: 0;
  color: #4b7350;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 700;
}

.hero h1 {
  margin: 12px 0;
  font-size: 42px;
  line-height: 1.2;
}

.hero-text {
  margin: 0 0 24px;
  max-width: 680px;
  color: #405541;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.features {
  max-width: 1080px;
  margin: 24px auto 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.feature-card {
  background: #ffffff;
  border: 1px solid #deead8;
  border-radius: 16px;
  padding: 20px;
}

.feature-card h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.feature-card p {
  margin: 0;
  color: #4a624c;
}

.content {
  max-width: 1080px;
  margin: 24px auto 0;
  background: #fff;
  border: 1px solid #deead8;
  border-radius: 16px;
  padding: 20px;
}

.subtitle {
  margin: 0 0 8px;
  color: #4b6350;
}

.list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.7;
}

.empty {
  color: #607963;
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
  color: white;
}

.btn-ghost {
  background: #eaf5e6;
  color: #1f4d28;
}
</style>
