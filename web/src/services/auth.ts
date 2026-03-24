import { createPromiseClient } from '@bufbuild/connect';
import { createGrpcWebTransport } from '@bufbuild/connect-web';
import { AuthService } from '../generated/auth/v1/auth_connect';

const transport = createGrpcWebTransport({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5173',
});

const client = createPromiseClient(AuthService, transport);

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
