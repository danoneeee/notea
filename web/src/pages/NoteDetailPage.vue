<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NoteIconActions from '../components/notes/NoteIconActions.vue';
import NoteSyncMarker from '../components/notes/NoteSyncMarker.vue';
import { describeDescriptorPath } from '../data/descriptors';
import {
  deleteNoteById,
  ensureNoteAvailable,
  getNoteById,
  getNoteSyncMeta,
  notesRevision,
  notesSyncRevision,
} from '../services/notes';
import { getNoteColorStyles } from '../services/noteColors';
import { formatNoteDate } from '../services/notePresentation';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const removing = ref(false);

const noteId = computed(() => String(route.params.noteId || ''));
const note = computed(() => {
  notesRevision.value;
  return getNoteById(noteId.value);
});
const syncMeta = computed(() => {
  notesSyncRevision.value;
  return getNoteSyncMeta(noteId.value);
});
const descriptorLabels = computed(() => (note.value?.descriptors ?? []).map((item) => describeDescriptorPath(item)));
const averageRating = computed(() => {
  if (!note.value) return null;
  const values = Object.values(note.value.ratings);
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
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
            <span v-if="note.region"> · {{ note.region }}</span>
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
        <span v-if="note.noteColor" class="meta-chip color-chip-meta">
          <span class="meta-color-dot" :style="{ background: note.noteColor }"></span>
          Цвет заметки
        </span>
        <span v-if="averageRating" class="meta-chip">Средняя оценка {{ averageRating }}/5</span>
      </div>

      <div class="grid">
        <article class="box">
          <h3>Паспорт чая</h3>
          <dl class="facts">
            <div><dt>Тип</dt><dd>{{ note.teaType || '—' }}</dd></div>
            <div><dt>Регион</dt><dd>{{ note.region || '—' }}</dd></div>
            <div><dt>Происхождение</dt><dd>{{ note.originDetail || '—' }}</dd></div>
            <div><dt>Культивар</dt><dd>{{ note.cultivar || '—' }}</dd></div>
            <div><dt>Источник</dt><dd>{{ note.source || '—' }}</dd></div>
            <div><dt>Обработка</dt><dd>{{ note.processingStyle || '—' }}</dd></div>
            <div><dt>Сезон</dt><dd>{{ note.harvestSeason || '—' }}</dd></div>
            <div><dt>Год</dt><dd>{{ note.harvestYear ?? '—' }}</dd></div>
          </dl>
        </article>

        <article class="box">
          <h3>Заваривание</h3>
          <dl class="facts">
            <div><dt>Режим</dt><dd>{{ note.brewingMode }}</dd></div>
            <div><dt>Метод</dt><dd>{{ note.brewingMethod || '—' }}</dd></div>
            <div><dt>Сетап</dt><dd>{{ note.setupSummary || '—' }}</dd></div>
            <div><dt>Лист</dt><dd>{{ note.leafGrams ?? '—' }} г</dd></div>
            <div><dt>Вода</dt><dd>{{ note.waterTemp ?? '—' }} °C</dd></div>
            <div><dt>Объём</dt><dd>{{ note.waterVolumeMl ?? '—' }} мл</dd></div>
            <div><dt>Время</dt><dd>{{ note.timeValue ?? '—' }} {{ note.timeUnit }}</dd></div>
            <div><dt>Промывка</dt><dd>{{ note.rinseCount ?? '—' }}</dd></div>
            <div><dt>Проливы</dt><dd>{{ note.infusionsCount ?? '—' }}</dd></div>
          </dl>
        </article>

        <article class="box">
          <h3>Профиль чашки</h3>
          <dl class="facts">
            <div><dt>Цвет настоя</dt><dd>{{ note.liquorColor || '—' }}</dd></div>
            <div><dt>Текстура</dt><dd>{{ note.mouthfeel || '—' }}</dd></div>
            <div><dt>Состояние</dt><dd>{{ note.energyEffect || '—' }}</dd></div>
          </dl>
        </article>

        <article class="box">
          <h3>Оценки</h3>
          <dl class="facts">
            <div><dt>Аромат</dt><dd>{{ note.ratings.aroma }}/5</dd></div>
            <div><dt>Вкус</dt><dd>{{ note.ratings.taste }}/5</dd></div>
            <div><dt>Послевкусие</dt><dd>{{ note.ratings.aftertaste }}/5</dd></div>
            <div><dt>Баланс</dt><dd>{{ note.ratings.balance }}/5</dd></div>
          </dl>
        </article>
      </div>

      <article class="box">
        <h3>Дескрипторы</h3>
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

      <article class="box">
        <h3>Свободные заметки</h3>
        <p class="free-text">{{ note.freeText || 'Текстовое описание пока не добавлено.' }}</p>
      </article>
    </template>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; display: grid; gap: 12px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px; border: 1px solid #deead8; border-radius: 16px; background: #fff; }
.head-main { min-width: 0; flex: 1; }
.eyebrow { margin: 0 0 6px; color: #67806a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.head h2 { margin: 0 0 6px; }
.subtitle { margin: 0; color: #4d6651; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
.meta-chip { border: 1px solid #dbe8d7; border-radius: 999px; padding: 6px 10px; background: #f7fbf5; color: #466049; font-size: 13px; }
.color-chip-meta { display: inline-flex; align-items: center; gap: 8px; }
.meta-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
.side-sync { align-self: center; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.box { border: 1px solid #deead8; border-radius: 16px; background: #fff; padding: 18px; }
.box h3 { margin: 0 0 10px; }
.facts { margin: 0; display: grid; gap: 10px; }
.facts div { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #eef4ea; padding-bottom: 8px; }
.facts div:last-child { border-bottom: 0; padding-bottom: 0; }
.facts dt { color: #5d7460; }
.facts dd { margin: 0; text-align: right; color: #173a20; font-weight: 600; }
.pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { border: 1px solid #d7e5d2; border-radius: 999px; padding: 7px 10px; font-size: 13px; color: #274b2e; }
.free-text { margin: 0; white-space: pre-wrap; line-height: 1.6; color: #304934; }
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
}
</style>
