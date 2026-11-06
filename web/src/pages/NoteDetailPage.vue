<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DescriptorWheel from '../components/DescriptorWheel.vue';
import NoteIconActions from '../components/notes/NoteIconActions.vue';
import NoteSyncMarker from '../components/notes/NoteSyncMarker.vue';
import { describeDescriptorPath, descriptorWheelFamilies } from '../data/descriptors';
import {
  deleteNoteById,
  ensureNoteAvailable,
  getNoteById,
  getNoteSyncMeta,
  notesRevision,
  notesSyncRevision,
} from '../services/notes';
import { getNoteColorStyles } from '../services/noteColors';
import {
  formatBrewingMode,
  formatEnergyEffect,
  formatHarvestSeason,
  formatLiquorColor,
  formatMouthfeel,
  formatNoteDate,
} from '../services/notePresentation';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const removing = ref(false);

const noteId = computed(() => String(route.params.noteId || ''));
const note = computed(() => {
  void notesRevision.value;
  return getNoteById(noteId.value);
});
const syncMeta = computed(() => {
  void notesSyncRevision.value;
  return getNoteSyncMeta(noteId.value);
});
const descriptorLabels = computed(() => (note.value?.descriptors ?? []).map((item) => describeDescriptorPath(item)));
const averageRating = computed(() => {
  if (!note.value) return null;
  const values = Object.values(note.value.ratings);
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
});
const locationLabel = computed(() => {
  if (!note.value) return '';
  const parts = [note.value.country, note.value.originRegion || note.value.region].map((item) => item?.trim()).filter(Boolean);
  return [...new Set(parts)].join(', ');
});
const passportFacts = computed(() => {
  if (!note.value) return [];
  return [
    { label: 'Тип чая', value: note.value.teaType },
    { label: 'Страна', value: note.value.country },
    { label: 'Регион', value: note.value.originRegion || note.value.region },
    { label: 'Сезон сбора', value: formatHarvestSeason(note.value.harvestSeason) },
    { label: 'Год сбора', value: note.value.harvestYear ? String(note.value.harvestYear) : '' },
  ].filter((item) => item.value);
});
const brewingFacts = computed(() => {
  if (!note.value) return [];
  return [
    { label: 'Режим', value: formatBrewingMode(note.value.brewingMode) },
    { label: 'Посуда / сетап', value: note.value.setupSummary },
    { label: 'Вода', value: note.value.waterSource },
    { label: 'Навеска', value: note.value.leafGrams !== null ? `${note.value.leafGrams} г` : '' },
    { label: 'Объём', value: note.value.waterVolumeMl !== null ? `${note.value.waterVolumeMl} мл` : '' },
    { label: 'Температура', value: note.value.waterTemp !== null ? `${note.value.waterTemp} °C` : '' },
    { label: 'Время', value: note.value.timeValue !== null ? `${note.value.timeValue} ${note.value.timeUnit}` : '' },
    { label: 'Промывка', value: note.value.rinseCount !== null ? `${note.value.rinseCount} раз` : '' },
    { label: 'Количество проливов', value: note.value.infusionsCount !== null ? String(note.value.infusionsCount) : '' },
  ].filter((item) => item.value);
});
const cupFacts = computed(() => {
  if (!note.value) return [];
  return [
    { label: 'Цвет настоя', value: formatLiquorColor(note.value.liquorColor) },
    { label: 'Текстура', value: formatMouthfeel(note.value.mouthfeel) },
    { label: 'Состояние', value: formatEnergyEffect(note.value.energyEffect) },
  ].filter((item) => item.value);
});
const ratingCards = computed(() => {
  if (!note.value) return [];
  return [
    { label: 'Аромат', value: note.value.ratings.aroma },
    { label: 'Вкус', value: note.value.ratings.taste },
    { label: 'Послевкусие', value: note.value.ratings.aftertaste },
    { label: 'Баланс', value: note.value.ratings.balance },
  ];
});
const hasBrewingMethod = computed(() => Boolean(note.value?.brewingMethod.trim()));
const passportNote = computed(() => {
  if (!note.value) return '';
  return note.value.passportNotes?.trim() ?? '';
});
const cupProfileNote = computed(() => {
  if (!note.value) return '';
  return note.value.cupProfileNotes?.trim() || note.value.freeText.trim();
});
const descriptorWheelSelectedIds = computed(() => {
  if (!note.value) return [];
  const selected = new Set<string>();
  for (const id of note.value.descriptors) {
    const familyId = id.split(':')[0];
    if (familyId) selected.add(familyId);
  }
  return [...selected];
});
const descriptorSegmentIntensity = computed(() => {
  if (!note.value) return {};
  const counts: Record<string, number> = {};
  for (const descriptorId of note.value.descriptors) {
    const familyId = descriptorId.split(':')[0];
    if (!familyId) continue;
    counts[familyId] = (counts[familyId] ?? 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const out: Record<string, number> = {};
  for (const family of descriptorWheelFamilies) {
    out[family.id] = max > 0 ? (counts[family.id] ?? 0) / max : 0;
  }
  return out;
});
const descriptorPreviewSubcategories = computed(() => {
  const map: Record<string, string[]> = {};
  for (const item of descriptorLabels.value) {
    const familyId = item.id.split(':')[0];
    if (!familyId) continue;
    map[familyId] ??= [];
    map[familyId].push(item.shortLabel);
  }
  return map;
});
async function loadNote() {
  loading.value = true;
  await ensureNoteAvailable(noteId.value);
  loading.value = false;
}

async function removeNote() {
  if (!note.value) return;
  const confirmed = window.confirm(`Удалить заметку «${note.value.teaName || 'Без названия'}»?`);
  if (!confirmed) return;
  removing.value = true;
  try {
    await deleteNoteById(note.value.id);
    router.push({ name: 'app-notes' });
  } finally {
    removing.value = false;
  }
}

onMounted(() => {
  void loadNote();
});
</script>

<template>
  <section class="card">
    <div v-if="loading" class="empty">Загружаем заметку…</div>
    <div v-else-if="!note" class="empty">
      Заметка не найдена или ещё не успела синхронизироваться.
    </div>
    <template v-else>
      <div class="head" :style="getNoteColorStyles(note.noteColor)">
        <div class="head-main">
          <p class="eyebrow">Заметка</p>
          <h2>{{ note.teaName || 'Без названия' }}</h2>
          <p class="subtitle">
            <span v-if="note.sessionTitle">{{ note.sessionTitle }} · </span>
            {{ note.teaType || 'Тип не указан' }}
            <span v-if="locationLabel"> · {{ locationLabel }}</span>
          </p>
        </div>
        <NoteSyncMarker :status="syncMeta?.status" class-name="side-sync" />
        <div class="actions">
          <button class="mini-action" @click="router.push({ name: 'app-notes' })">К списку</button>
          <NoteIconActions :removing="removing" @edit="router.push(`/app/notes/${note.id}/edit`)" @remove="removeNote" />
        </div>
      </div>

      <div class="meta-row">
        <span class="meta-chip">Обновлено {{ formatNoteDate(note.updatedAt) }}</span>
        <span v-if="note.isFavorite" class="meta-chip favorite-chip">Любимая сессия</span>
        <span v-if="note.noteColor" class="meta-chip color-chip-meta">
          <span class="meta-color-dot" :style="{ background: note.noteColor }"></span>
          Цвет заметки
        </span>
        <span v-if="averageRating" class="meta-chip">Средняя оценка {{ averageRating }}/5</span>
      </div>

      <section class="overview-grid">
        <article class="hero-card summary-card">
          <h3>Сессия</h3>
          <p class="summary-copy">
            {{ note.sessionTitle || 'Без названия сессии' }}
          </p>
          <p class="summary-subcopy">
            {{
              locationLabel
                ? `Чай ${note.teaType.toLowerCase()} из ${locationLabel.toLowerCase()} с зафиксированными параметрами и профилем чашки.`
                : 'Технические параметры и профиль чашки сохранены.'
            }}
          </p>
        </article>

        <article class="hero-card score-card">
          <span class="score-kicker">Средняя оценка</span>
          <strong class="score-value">{{ averageRating ?? '—' }}</strong>
          <span class="score-caption">из 5 по четырём ключевым ощущениям чашки</span>
        </article>
      </section>

      <div class="grid">
        <article class="box box-passport">
          <h3>Паспорт чая</h3>
          <dl class="facts">
            <div v-for="item in passportFacts" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
          <div v-if="passportNote" class="inline-note passport-note">
            <span class="inline-note-label">Заметка к паспорту</span>
            <p>{{ passportNote }}</p>
          </div>
          <p v-if="!passportFacts.length" class="empty inline-empty">Паспорт партии заполнен минимально.</p>
        </article>

        <article class="box">
          <h3>Заваривание</h3>
          <dl class="facts">
            <div v-for="item in brewingFacts" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
          <div v-if="hasBrewingMethod" class="inline-note">
            <span class="inline-note-label">Комментарий к сессии</span>
            <p>{{ note.brewingMethod }}</p>
          </div>
        </article>

        <article class="box box-cup-profile">
          <h3>Профиль чашки</h3>
          <dl class="facts">
            <div v-for="item in cupFacts" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
          <div v-if="cupProfileNote" class="inline-note cup-note">
            <span class="inline-note-label">Заметка к чашке</span>
            <p>{{ cupProfileNote }}</p>
          </div>
          <p v-if="!cupFacts.length" class="empty inline-empty">Профиль чашки не был заполнен.</p>
        </article>

        <article class="box">
          <h3>Оценки</h3>
          <div class="rating-grid">
            <article v-for="item in ratingCards" :key="item.label" class="rating-card">
              <span class="rating-card-label">{{ item.label }}</span>
              <strong class="rating-card-value">{{ item.value }}/5</strong>
              <div class="rating-card-stars" aria-hidden="true">
                {{ '★'.repeat(item.value) }}{{ '☆'.repeat(Math.max(0, 5 - item.value)) }}
              </div>
            </article>
          </div>
        </article>
      </div>

      <article class="box">
        <h3>Дескрипторы</h3>
        <div v-if="descriptorWheelSelectedIds.length" class="descriptor-wheel-panel">
          <DescriptorWheel
            :descriptors="descriptorWheelFamilies"
            :selected-ids="descriptorWheelSelectedIds"
            :segment-intensity="descriptorSegmentIntensity"
            :preview-subcategories="descriptorPreviewSubcategories"
            :show-sub-preview="true"
            center-label="НОТЫ"
            :center-sub-label="`${descriptorLabels.length} выбрано`"
          />
        </div>
        <div v-if="descriptorLabels.length" class="pill-list">
          <span
            v-for="item in descriptorLabels"
            :key="item.fullLabel"
            class="pill"
            :style="{ borderColor: item.color, backgroundColor: `${item.color}18` }"
          >
            {{ item.fullLabel }}
          </span>
        </div>
        <p v-else class="empty inline-empty">Дескрипторы пока не выбраны.</p>
      </article>

    </template>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; display: grid; gap: 14px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 22px; border: 1px solid #deead8; border-radius: 18px; background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(248,252,246,0.98)); }
.head-main { min-width: 0; flex: 1; }
.eyebrow { margin: 0 0 6px; color: #67806a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.head h2 { margin: 0 0 6px; font-size: 34px; line-height: 1.1; }
.subtitle { margin: 0; color: #4d6651; font-size: 15px; line-height: 1.5; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
.meta-chip { border: 1px solid #dbe8d7; border-radius: 999px; padding: 6px 10px; background: #f7fbf5; color: #466049; font-size: 13px; }
.favorite-chip { background: #fff6f8; border-color: #f0d5de; color: #a33d5c; }
.color-chip-meta { display: inline-flex; align-items: center; gap: 8px; }
.meta-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
.side-sync { align-self: center; }
.overview-grid { display: grid; grid-template-columns: 1.4fr 0.8fr; gap: 12px; }
.hero-card,
.box { border: 1px solid #deead8; border-radius: 18px; background: #fff; padding: 18px; }
.hero-card { background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%); }
.summary-card { display: grid; gap: 8px; }
.summary-card h3,
.box h3 { margin: 0; }
.summary-copy { margin: 0; font-size: 20px; font-weight: 700; color: #163820; }
.summary-subcopy { margin: 0; color: #56705b; line-height: 1.65; }
.score-card { display: grid; align-content: center; justify-items: start; gap: 6px; }
.score-kicker { color: #5c7660; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.score-value { font-size: 48px; line-height: 1; color: #1e5129; }
.score-caption { color: #5d7661; font-size: 13px; line-height: 1.45; max-width: 200px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.box {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: 14px;
}
.box-passport,
.box-cup-profile { align-content: start; }
.facts { margin: 0; display: grid; gap: 10px; flex: 1; }
.facts div { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #eef4ea; padding-bottom: 8px; }
.facts div:last-child { border-bottom: 0; padding-bottom: 0; }
.facts dt { color: #5d7460; }
.facts dd { margin: 0; text-align: right; color: #173a20; font-weight: 600; }
.inline-note {
  margin-top: auto;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fbf6;
  border: 1px solid #e4eee1;
}
.facts {
  align-content: start;
}
.rating-grid,
.pill-list,
.descriptor-wheel-panel {
  align-content: start;
}
.inline-note-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; color: #5b7560; text-transform: uppercase; letter-spacing: 0.04em; }
.inline-note p { margin: 0; color: #304934; line-height: 1.6; }
.passport-note { background: linear-gradient(180deg, #fbfdf8 0%, #f6faf4 100%); }
.cup-note { background: linear-gradient(180deg, #f9fcf8 0%, #f5faf6 100%); }
.rating-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.rating-card { display: grid; gap: 5px; padding: 14px; border-radius: 14px; background: linear-gradient(180deg, #fbfdf9 0%, #f6faf4 100%); border: 1px solid #e5eee2; }
.rating-card-label { color: #5a7460; font-size: 13px; }
.rating-card-value { color: #194325; font-size: 24px; line-height: 1; }
.rating-card-stars { color: #dfa443; letter-spacing: 0.04em; font-size: 14px; }
.pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
.descriptor-wheel-panel {
  margin: 4px 0 16px;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf5 100%);
  border: 1px solid #e4eee1;
}
.descriptor-wheel-panel :deep(.wheel) {
  width: min(420px, 100%);
}
.pill { border: 1px solid #d7e5d2; border-radius: 999px; padding: 7px 10px; font-size: 13px; color: #274b2e; }
.empty { padding: 18px; border: 1px dashed #c6dcc3; border-radius: 16px; background: #fbfdf8; color: #4d6651; }
.inline-empty { padding: 12px; margin: 0; }
.mini-action {
  border: 0;
  background: transparent;
  color: #5a715e;
  padding: 4px 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mini-action:hover { color: #1f4d28; }

@media (max-width: 860px) {
  .overview-grid,
  .head,
  .grid {
    grid-template-columns: 1fr;
  }

  .head {
    flex-direction: column;
  }

  .actions {
    width: 100%;
  }

  .facts div {
    flex-direction: column;
  }

  .facts dd {
    text-align: left;
  }

  .rating-grid {
    grid-template-columns: 1fr;
  }
}
</style>
