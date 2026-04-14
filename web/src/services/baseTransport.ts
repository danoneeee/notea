import { createGrpcWebTransport } from '@bufbuild/connect-web';

export const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5173';

export const rawTransport = createGrpcWebTransport({
  baseUrl,
});
