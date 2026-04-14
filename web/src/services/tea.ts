import { createPromiseClient } from '@bufbuild/connect';
import { TeaNotesService } from '../generated/teanotes/v1/tea_notes_connect';
import { apiTransport } from './apiTransport';

const client = createPromiseClient(TeaNotesService, apiTransport);

export async function listTeas() {
  const res = await client.listTeas({});
  return res.teas ?? [];
}
