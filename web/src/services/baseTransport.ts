import { createGrpcWebTransport } from '@bufbuild/connect-web';

export const baseUrl = import.meta.env.VITE_API_URL ?? window.location.origin;

export const rawTransport = createGrpcWebTransport({
  baseUrl,
});
