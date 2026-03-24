<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

type AuthTab = 'login' | 'register';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const { login, register, state } = useAuthStore();

const activeTab = ref<AuthTab>('login');
const error = ref<string | null>(null);

const loginEmail = ref('');
const loginPassword = ref('');

const registerName = ref('');
const registerEmail = ref('');
const registerPassword = ref('');

function close() {
  emit('update:modelValue', false);
  error.value = null;
}

async function onLogin() {
  error.value = null;
  try {
    await login(loginEmail.value, loginPassword.value);
    emit('success');
    close();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function onRegister() {
  error.value = null;
  try {
    await register(registerName.value, registerEmail.value, registerPassword.value);
    emit('success');
    close();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div v-if="props.modelValue" class="auth-backdrop" @click.self="close">
    <section class="auth-modal">
      <div class="auth-tabs">
        <button class="auth-tab" :class="{ 'auth-tab-active': activeTab === 'login' }" @click="activeTab = 'login'">
          Вход
        </button>
        <button
          class="auth-tab"
          :class="{ 'auth-tab-active': activeTab === 'register' }"
          @click="activeTab = 'register'"
        >
          Регистрация
        </button>
      </div>

      <form v-if="activeTab === 'login'" class="auth-form" @submit.prevent="onLogin">
        <label>
          Email
          <input v-model="loginEmail" type="email" required autocomplete="email" />
        </label>
        <label>
          Пароль
          <input v-model="loginPassword" type="password" required autocomplete="current-password" />
        </label>
        <button class="btn btn-primary btn-block" type="submit" :disabled="state.loading">
          {{ state.loading ? 'Входим...' : 'Войти' }}
        </button>
      </form>

      <form v-else class="auth-form" @submit.prevent="onRegister">
        <label>
          Имя
          <input v-model="registerName" type="text" required autocomplete="name" />
        </label>
        <label>
          Email
          <input v-model="registerEmail" type="email" required autocomplete="email" />
        </label>
        <label>
          Пароль
          <input v-model="registerPassword" type="password" required autocomplete="new-password" />
        </label>
        <button class="btn btn-primary btn-block" type="submit" :disabled="state.loading">
          {{ state.loading ? 'Создаем...' : 'Создать аккаунт' }}
        </button>
      </form>

      <p v-if="error" class="status status-error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.auth-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(22, 33, 20, 0.48);
  display: grid;
  place-items: center;
  padding: 16px;
}

.auth-modal {
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #d7e6d6;
  padding: 16px;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.auth-tab {
  border: 1px solid #d2e0cf;
  border-radius: 8px;
  padding: 8px 12px;
  background: #f7fbf5;
  cursor: pointer;
  font-weight: 600;
}

.auth-tab-active {
  background: #2f7b3d;
  color: white;
  border-color: #2f7b3d;
}

.auth-form {
  display: grid;
  gap: 10px;
}

.auth-form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #36513a;
}

.auth-form input {
  border: 1px solid #cddfc8;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
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

.btn-block {
  width: 100%;
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
