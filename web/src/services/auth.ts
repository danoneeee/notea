import { createPromiseClient } from '@bufbuild/connect';
import { AuthService } from '../generated/auth/v1/auth_connect';
import { rawTransport } from './baseTransport';

const client = createPromiseClient(AuthService, rawTransport);

export function login(email: string, password: string) {
  return client.login({
    email: email.trim(),
    password,
  });
}

export function register(displayName: string, email: string, password: string) {
  return client.register({
    displayName: displayName.trim(),
    email: email.trim(),
    password,
  });
}

export function validate(accessToken: string) {
  return client.validate({ accessToken });
}

export function refreshSession(refreshToken: string) {
  return client.refreshSession({ refreshToken });
}
