<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthModal from '../components/AuthModal.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const showAuth = ref(false);
const isDev = import.meta.env.DEV;

function openAuth() {
  showAuth.value = true;
}

function loginDemo() {
  auth.loginDemo();
  router.push('/app/notes');
}

function onAuthSuccess() {
  router.push('/app/notes');
}
</script>

<template>
  <main class="page">
    <header class="header">
      <div class="brand">Notea</div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openAuth">Войти / Регистрация</button>
        <button v-if="isDev" class="btn btn-ghost" @click="loginDemo">Демо-вход</button>
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
        <button class="btn btn-primary" @click="openAuth">Начать бесплатно</button>
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
