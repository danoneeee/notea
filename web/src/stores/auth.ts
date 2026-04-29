import { computed, reactive } from 'vue';
import * as authService from '../services/auth';
import { NOTES_DRAFT_KEY, NOTES_LIST_KEY } from '../services/notes';
import { getScopedStorageKey } from '../services/storageScope';

const SCOPED_STORAGE_KEYS = ['notea_note_sync_meta', 'notea_pending_note_deletes', 'notea_teaware', 'notea_setups'];

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  userName: string | null;
  userId: string | null;
  userCreatedAt: string | null;
  loading: boolean;
  initialized: boolean;
};

const state = reactive<AuthState>({
  accessToken: localStorage.getItem('notea_access_token'),
  refreshToken: localStorage.getItem('notea_refresh_token'),
  userName: localStorage.getItem('notea_user_name'),
  userId: localStorage.getItem('notea_user_id'),
  userCreatedAt: localStorage.getItem('notea_user_created_at'),
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
  if (state.userCreatedAt) {
    localStorage.setItem('notea_user_created_at', state.userCreatedAt);
  }
}

function clearSession() {
  const scopedKeys = [NOTES_LIST_KEY, NOTES_DRAFT_KEY, ...SCOPED_STORAGE_KEYS].map(getScopedStorageKey);
  for (const key of scopedKeys) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem('notea_access_token');
  localStorage.removeItem('notea_refresh_token');
  localStorage.removeItem('notea_user_name');
  localStorage.removeItem('notea_user_id');
  localStorage.removeItem('notea_user_created_at');
}

function setSession(data: {
  accessToken: string;
  refreshToken: string;
  userName: string;
  userId: string;
  userCreatedAt: string | null;
}) {
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken;
  state.userName = data.userName;
  state.userId = data.userId;
  state.userCreatedAt = data.userCreatedAt;
  persistSession();
}

async function tryRefreshSession() {
  if (!state.refreshToken || state.refreshToken.startsWith('demo:')) {
    return false;
  }
  try {
    const response = await authService.refreshSession(state.refreshToken);
    state.accessToken = response.accessToken;
    state.refreshToken = response.refreshToken;
    persistSession();
    return true;
  } catch {
    return false;
  }
}

async function initialize() {
  if (state.initialized) {
    return;
  }
  state.initialized = true;

  if (!state.accessToken) {
    return;
  }

  if (state.accessToken.startsWith('demo:')) {
    logout();
    return;
  }

  try {
    const res = await authService.validate(state.accessToken);
    if (!res.ok) {
      const refreshed = await tryRefreshSession();
      if (!refreshed) {
        logout();
      }
    }
  } catch {
    const refreshed = await tryRefreshSession();
    if (!refreshed) {
      logout();
    }
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
      userCreatedAt: response.user?.createdAt ? response.user.createdAt.toDate().toISOString() : null,
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
      userCreatedAt: response.user?.createdAt ? response.user.createdAt.toDate().toISOString() : null,
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
  state.userCreatedAt = null;
  clearSession();
}

if (typeof window !== 'undefined') {
  window.addEventListener('notea-auth-expired', () => {
    logout();
  });
}

export function useAuthStore() {
  return {
    state,
    isAuthenticated: computed(() => Boolean(state.accessToken && !state.accessToken.startsWith('demo:'))),
    initialize,
    login,
    register,
    tryRefreshSession,
    logout,
  };
}
