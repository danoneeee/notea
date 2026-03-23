<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { createPromiseClient } from '@bufbuild/connect';
import { createGrpcWebTransport } from '@bufbuild/connect-web';

import { TeaNotesService } from './generated/teanotes/v1/tea_notes_connect';

type Tea = {
  id: string;
  name: string;
  province: string;
  variant: string;
};

const teas = ref<Tea[]>([]);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const transport = createGrpcWebTransport({
      baseUrl: 'http://localhost:5173',
    });

    const client = createPromiseClient(TeaNotesService, transport);

    const res = await client.listTeas({});
    teas.value = res.teas ?? [];
  } catch (e: any) {
    error.value = e?.message ?? String(e);
  }
});
</script>

<template>
  <main style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 16px">
    <h1>Notea</h1>

    <section v-if="error" style="color: #b00020; white-space: pre-wrap">
      {{ error }}
    </section>

    <section>
      <h2>Список чаёв</h2>
      <ul>
        <li v-for="t in teas" :key="t.id">
          <strong>{{ t.name }}</strong> ({{ t.province }}) — {{ t.variant }}
        </li>
      </ul>

      <p v-if="!error && teas.length === 0">Пока пусто (или Envoy/Notes не запущены).</p>
    </section>
  </main>
</template>
