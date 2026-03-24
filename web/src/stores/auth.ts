import { computed, reactive } from 'vue';
import * as authService from '../services/auth';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  userName: string | null;
  userId: string | null;
  loading: boolean;
  initialized: boolean;
};

const state = reactive<AuthState>({
  accessToken: localStorage.getItem('notea_access_token'),
  refreshToken: localStorage.getItem('notea_refresh_token'),
  userName: localStorage.getItem('notea_user_name'),
  userId: localStorage.getItem('notea_user_id'),
  loading: false,
  initialized: false,
});

function persistSession() {
  if (state.accessToken) {
    localStorage.setItem('notea_access_token', state.accessToken);
  }
  if (state.refreshToken) {
    localStorage.setItem('notea_refresh_token', state.refreshToken);
  }
  if (state.userName) {
    localStorage.setItem('notea_user_name', state.userName);
  }
  if (state.userId) {
    localStorage.setItem('notea_user_id', state.userId);
  }
}

function clearSession() {
  localStorage.removeItem('notea_access_token');
  localStorage.removeItem('notea_refresh_token');
  localStorage.removeItem('notea_user_name');
  localStorage.removeItem('notea_user_id');
}

function setSession(data: {
  accessToken: string;
  refreshToken: string;
  userName: string;
  userId: string;
}) {
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.userName = data.userName;
  state.userId = data.userId;
  persistSession();
}

async function initialize() {
  if (state.initialized) {
    return;
  }
  state.initialized = true;

  if (!state.accessToken) {
    return;
  }

  try {
    const res = await authService.validate(state.accessToken);
    if (!res.ok) {
      logout();
    }
  } catch {
    logout();
  }
}

async function login(email: string, password: string) {
  state.loading = true;
  try {
    const response = await authService.login(email, password);
    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      userName: response.user?.displayName || response.user?.email || 'пользователь',
      userId: response.user?.id || '',
    });
  } finally {
    state.loading = false;
  }
}

async function register(displayName: string, email: string, password: string) {
  state.loading = true;
  try {
    const response = await authService.register(displayName, email, password);
    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      userName: response.user?.displayName || response.user?.email || 'пользователь',
      userId: response.user?.id || '',
    });
  } finally {
    state.loading = false;
  }
}

function logout() {
  state.accessToken = null;
  state.refreshToken = null;
  state.userName = null;
  state.userId = null;
  clearSession();
}

export function useAuthStore() {
  return {
    state,
    isAuthenticated: computed(() => Boolean(state.accessToken)),
    initialize,
    login,
    register,
    logout,
  };
}
