<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { descriptorWheelFamilies } from '../data/descriptors';
import { listNotes, notesRevision } from '../services/notes';

const ChinaTeaMap = defineAsyncComponent(() => import('../components/ChinaTeaMap.vue'));

const notes = computed(() => {
  notesRevision.value;
  return listNotes();
});

const provinceStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of notes.value) {
    const province = note.region.trim() || 'Не указан';
    map.set(province, (map.get(province) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

const teaTypeStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of notes.value) {
    const teaType = note.teaType.trim() || 'Не указан';
    map.set(teaType, (map.get(teaType) ?? 0) + 1);
  }
  const total = notes.value.length || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }));
});

const descriptorStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of notes.value) {
    for (const descriptor of note.descriptors) {
      const family = descriptor.split(':')[0];
      map.set(family, (map.get(family) ?? 0) + 1);
    }
  }
  const labelById = Object.fromEntries(descriptorWheelFamilies.map((item) => [item.id, item.label]));
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => [labelById[id] ?? id, count] as const);
});

function provinceIntensity(count: number) {
  const max = provinceStats.value[0]?.[1] ?? 1;
  const alpha = Math.max(0.18, count / max);
  return `rgba(47, 123, 61, ${alpha.toFixed(2)})`;
}
</script>

<template>
  <section class="card">
    <h2>Аналитика</h2>
    <div v-if="notes.length === 0" class="empty">
      Добавь несколько заметок, и здесь появятся личные графики и карта провинций.
    </div>
    <div v-else class="grid">
      <article class="box map-box">
        <h3>Карта провинций</h3>
        <div class="map-row">
          <ChinaTeaMap :province-stats="provinceStats" />
          <ul class="province-list">
            <li v-for="[province, count] in provinceStats" :key="province">
              <span class="chip" :style="{ background: provinceIntensity(count) }">{{ province }}</span>
              <strong>{{ count }}</strong>
            </li>
          </ul>
        </div>
      </article>
      <article class="box">
        <h3>Распределение по типам</h3>
        <ul class="bars">
          <li v-for="item in teaTypeStats" :key="item.label">
            <div class="bar-head">
              <span>{{ item.label }}</span>
              <strong>{{ item.percent }}%</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${item.percent}%` }" />
            </div>
          </li>
        </ul>
      </article>
      <article class="box">
        <h3>Топ дескрипторов</h3>
        <ol>
          <li v-for="[name, count] in descriptorStats" :key="name">{{ name }} · {{ count }}</li>
        </ol>
      </article>
    </div>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.box { border: 1px solid #e3eee0; border-radius: 12px; padding: 14px; background: #fbfdf8; }
.box h3 { margin: 0 0 6px; }
.empty { color: #4b6350; border: 1px dashed #c6dcc3; border-radius: 12px; padding: 14px; background: #fbfdf8; }
.map-box { display: flex; flex-direction: column; gap: 8px; grid-column: 1 / -1; }
.map-row { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 14px; align-items: start; }
.province-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 13px; align-content: start; }
.province-list li { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.chip { color: #fff; border-radius: 999px; padding: 6px 10px; font-size: 13px; }
.bars { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.bar-head { display: flex; justify-content: space-between; margin-bottom: 4px; color: #355b3d; }
.bar-track { height: 10px; border-radius: 999px; background: #e6efe3; overflow: hidden; }
.bar-fill { height: 100%; border-radius: inherit; background: #2f7b3d; }
ol { margin: 0; padding-left: 22px; line-height: 1.8; }
@media (max-width: 860px) {
  .grid { grid-template-columns: 1fr; }
  .map-row { grid-template-columns: 1fr; }
}
</style>
