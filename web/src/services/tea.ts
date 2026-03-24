import { createPromiseClient } from '@bufbuild/connect';
import { createGrpcWebTransport } from '@bufbuild/connect-web';
import { TeaNotesService } from '../generated/teanotes/v1/tea_notes_connect';

const transport = createGrpcWebTransport({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5173',
});

const client = createPromiseClient(TeaNotesService, transport);

export async function listTeas() {
  const res = await client.listTeas({});
  return res.teas ?? [];
}
