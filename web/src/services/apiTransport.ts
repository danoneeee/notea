import { Code, ConnectError, createPromiseClient, type Interceptor } from '@bufbuild/connect';
import { createGrpcWebTransport } from '@bufbuild/connect-web';
import { AuthService } from '../generated/auth/v1/auth_connect';
import { baseUrl, rawTransport } from './baseTransport';

const ACCESS_TOKEN_KEY = 'notea_access_token';
const REFRESH_TOKEN_KEY = 'notea_refresh_token';
const USER_NAME_KEY = 'notea_user_name';
const USER_ID_KEY = 'notea_user_id';

const rawAuthClient = createPromiseClient(AuthService, rawTransport);
let refreshInFlight: Promise<string | null> | null = null;

function dispatchAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notea-auth-expired'));
  }
}

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_ID_KEY);
  dispatchAuthExpired();
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken || refreshToken.startsWith('demo:')) return null;
    try {
      const response = await rawAuthClient.refreshSession({ refreshToken });
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      return response.accessToken;
    } catch {
      clearStoredSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function isAuthRpc(url: string) {
  return url.includes('/auth.v1.AuthService/');
}

export function getApiErrorMessage(reason: unknown) {
  const error = ConnectError.from(reason);
  if (error.code === Code.PermissionDenied) return 'Недостаточно прав для этого действия.';
  if (error.code === Code.Unauthenticated) return 'Сессия истекла. Войди снова.';
  return error.rawMessage || error.message;
}

const authInterceptor: Interceptor = (next) => async (req) => {
  const token = localStorage.getItem('notea_access_token');
  if (token && !token.startsWith('demo:')) {
    req.header.set('Authorization', `Bearer ${token}`);
  }
  return next(req);
};

const authRecoveryInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (reason) {
    const error = ConnectError.from(reason);
    if (error.code !== Code.Unauthenticated || isAuthRpc(req.url)) {
      throw error;
    }
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      throw error;
    }
    req.header.set('Authorization', `Bearer ${refreshedToken}`);
    return next(req);
  }
};

export const apiTransport = createGrpcWebTransport({
  baseUrl,
  interceptors: [authRecoveryInterceptor, authInterceptor],
});
