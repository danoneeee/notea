<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { listTeas } from '../services/tea';

type Tea = { id: string; name: string; province: string; variant: string };

const teas = ref<Tea[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    teas.value = await listTeas();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="card">
    <h2>Заметки</h2>
    <p class="subtitle">Твои чаи и записи дегустаций.</p>
    <p v-if="loading">Загружаем...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <ul v-else class="list">
      <li v-for="t in teas" :key="t.id"><strong>{{ t.name }}</strong> ({{ t.province }}) — {{ t.variant }}</li>
    </ul>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; }
.subtitle { color: #4b6350; margin: 0 0 8px; }
.list { margin: 0; padding-left: 20px; line-height: 1.7; }
.error { color: #9a2a40; }
</style>
