<script setup lang="ts">
import { computed, ref } from 'vue';
import DescriptorWheel from '../components/DescriptorWheel.vue';
import { descriptorWheelFamilies } from '../data/descriptors';
import { getLatestDraft, listNotes, notesRevision, seedDemoNotes } from '../services/notes';

const isDev = import.meta.env.DEV;
const seedHint = ref<string | null>(null);

const notes = computed(() => {
  notesRevision.value;
  return listNotes();
});
const latestDraft = computed(() => {
  notesRevision.value;
  return getLatestDraft();
});

function loadDemoNotes() {
  seedDemoNotes({ replace: true });
  seedHint.value =
    '12 демо-заметок: на круге ярко woody, mineral, sweet; слабее fruity и floral; herbal, spicy, roasted и umami не трогаем — останутся тусклыми.';
}

const wheelDescriptors = descriptorWheelFamilies;

const notesCount = computed(() => notes.value.length);

const topTeas = computed(() => {
  const map = new Map<string, number>();
  for (const note of notes.value) {
    const key = note.teaName.trim() || `${note.teaType.trim() || 'Не указан тип'} · ${note.region.trim() || 'Без региона'}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
});

const avgRating = computed(() => {
  if (!notes.value.length) return null;
  const totals = notes.value.map((note) => {
    const values = Object.values(note.ratings);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  return totals.reduce((sum, value) => sum + value, 0) / totals.length;
});

/** 0..1 по каждому семейству на круге: чем чаще нота в заметках, тем ярче сегмент */
const segmentIntensity = computed(() => {
  const usage = new Map<string, number>();
  for (const d of wheelDescriptors) {
    usage.set(d.id, 0);
  }
  for (const note of notes.value) {
    for (const descriptor of note.descriptors) {
      const familyId = descriptor.split(':')[0];
      if (usage.has(familyId)) {
        usage.set(familyId, (usage.get(familyId) ?? 0) + 1);
      }
    }
  }
  let max = 0;
  for (const v of usage.values()) {
    max = Math.max(max, v);
  }
  const out: Record<string, number> = {};
  for (const d of wheelDescriptors) {
    const c = usage.get(d.id) ?? 0;
    out[d.id] = max > 0 ? c / max : 0;
  }
  return out;
});
</script>

<template>
  <section class="card">
    <h2>Профиль</h2>
    <div v-if="isDev" class="dev-bar">
      <button type="button" class="btn-seed" @click="loadDemoNotes">Загрузить демо-заметки (проверка блоков)</button>
      <p v-if="seedHint" class="seed-hint">{{ seedHint }}</p>
    </div>
    <div class="stats">
      <article class="stat-box">
        <span class="stat-value">{{ notesCount }}</span>
        <span class="stat-label">записей сохранено</span>
      </article>
      <article class="stat-box">
        <span class="stat-value">{{ avgRating ? avgRating.toFixed(1) : '—' }}</span>
        <span class="stat-label">средняя оценка</span>
      </article>
      <article class="stat-box">
        <span class="stat-value">{{ latestDraft?.teaName || 'Черновик пуст' }}</span>
        <span class="stat-label">последний черновик</span>
      </article>
    </div>
    <div class="grid">
      <article class="box">
        <h3>Топ-3 чая</h3>
        <ol v-if="topTeas.length">
          <li v-for="[name, count] in topTeas" :key="name">{{ name }} · {{ count }} дегустац.</li>
        </ol>
        <p v-else class="subtitle">Пока нет данных. Добавь несколько заметок, чтобы увидеть персональный топ.</p>
      </article>
      <article class="box">
        <h3>Твой дескрипторный круг</h3>
        <p class="subtitle">Более яркие сегменты — ноты, которые ты выбираешь чаще всего.</p>
        <DescriptorWheel
          :descriptors="wheelDescriptors"
          :selected-ids="[]"
          :segment-intensity="segmentIntensity"
          center-label="МОИ НОТЫ"
        />
      </article>
    </div>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; }
.dev-bar { margin-bottom: 12px; padding: 10px 12px; border: 1px dashed #aac4a4; border-radius: 12px; background: #f4faf2; }
.btn-seed { border: 0; border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; background: #2f5f7b; color: #fff; }
.seed-hint { margin: 8px 0 0; font-size: 13px; color: #3d5c46; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
.stat-box { border: 1px solid #e3eee0; border-radius: 12px; padding: 12px 14px; background: #fbfdf8; display: flex; flex-direction: column; gap: 4px; }
.stat-value { font-size: 24px; font-weight: 800; color: #1e4e29; }
.stat-label { color: #5d7460; font-size: 13px; }
.grid { display: grid; grid-template-columns: 340px 1fr; gap: 12px; align-items: start; }
.box { border: 1px solid #e3eee0; border-radius: 12px; padding: 14px; background: #fbfdf8; }
.subtitle { margin: 0 0 8px; color: #4b6350; }
ol { margin: 0; padding-left: 22px; line-height: 1.8; }
@media (max-width: 980px) { .stats, .grid { grid-template-columns: 1fr; } }
</style>
