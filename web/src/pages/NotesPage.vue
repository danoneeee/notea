<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NoteIconActions from '../components/notes/NoteIconActions.vue';
import NoteSyncMarker from '../components/notes/NoteSyncMarker.vue';
import {
  deleteNoteById,
  discardDraft,
  flushPendingRemoteChanges,
  getLatestDraft,
  getNoteSyncStatus,
  listNotes,
  notesRevision,
  notesSyncState,
} from '../services/notes';
import { getNoteColorStyles } from '../services/noteColors';
import { formatNoteDate } from '../services/notePresentation';

const route = useRoute();
const router = useRouter();

const notes = computed(() => {
  notesRevision.value;
  return listNotes();
});
const latestDraft = computed(() => {
  notesRevision.value;
  return getLatestDraft();
});
const routeFilters = computed(() => ({
  teaType: String(route.query.teaType ?? '').trim(),
  region: String(route.query.region ?? '').trim(),
  brewingMode: String(route.query.brewingMode ?? '').trim(),
  source: String(route.query.source ?? '').trim(),
}));
const filteredNotes = computed(() =>
  notes.value.filter((note) => {
    if (routeFilters.value.teaType && note.teaType !== routeFilters.value.teaType) return false;
    if (routeFilters.value.region && note.region !== routeFilters.value.region) return false;
    if (routeFilters.value.brewingMode && note.brewingMode !== routeFilters.value.brewingMode) return false;
    if (routeFilters.value.source && (note.source ?? '') !== routeFilters.value.source) return false;
    return true;
  }),
);

const syncStats = computed(() => {
  let local = 0;
  let error = 0;
  let syncing = 0;
  for (const note of notes.value) {
    const status = getNoteSyncStatus(note.id);
    if (status === 'local') local += 1;
    if (status === 'error') error += 1;
    if (status === 'syncing') syncing += 1;
  }
  return { local, error, syncing };
});

const syncBannerCopy = computed(() => {
  if (notesSyncState.hydrating) {
    return 'Подтягиваем заметки с сервера и объединяем их с локальными изменениями.';
  }
  if (notesSyncState.flushing) {
    return `Отправляем изменения в аккаунт: ${notesSyncState.pendingCount}.`;
  }
  if (notesSyncState.lastError) {
    return `Не удалось завершить синхронизацию. ${notesSyncState.lastError}`;
  }
  if (syncStats.value.error > 0) {
    return `Есть заметки с ошибкой синхронизации: ${syncStats.value.error}.`;
  }
  if (syncStats.value.local > 0 || syncStats.value.syncing > 0) {
    return `Ожидают синхронизации: ${notesSyncState.pendingCount}.`;
  }
  return '';
});

const syncActionLabel = computed(() => {
  if (notesSyncState.hydrating || notesSyncState.flushing) return 'Синхронизируем...';
  if (notesSyncState.lastError || syncStats.value.error > 0) return 'Повторить';
  return 'Обновить';
});

function clearFilters() {
  router.push({ name: 'app-notes' });
}

async function removeNote(noteId: string) {
  const note = notes.value.find((item) => item.id === noteId);
  const confirmed = window.confirm(`Удалить заметку «${note?.teaName || 'Без названия'}»?`);
  if (!confirmed) return;
  await deleteNoteById(noteId);
}
</script>

<template>
  <section class="card">
    <div class="head">
      <div>
        <h2>Заметки</h2>
        <p class="subtitle">
          Журнал дегустаций с локальным черновиком и синхронизацией с аккаунтом.
        </p>
      </div>
      <div class="head-actions">
        <button class="btn btn-primary" @click="router.push({ name: 'app-new-note', query: { fresh: '1' } })">Новая заметка</button>
      </div>
    </div>

    <article v-if="latestDraft" class="draft-card">
      <div>
        <h3>Черновик</h3>
        <p class="draft-copy">
          {{ latestDraft.teaName || 'Без названия' }}
          <span v-if="latestDraft.sessionTitle"> · {{ latestDraft.sessionTitle }}</span>
          · обновлён {{ formatNoteDate(latestDraft.updatedAt) }}
        </p>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" @click="discardDraft()">Удалить черновик</button>
        <button class="btn btn-primary" @click="router.push({ name: 'app-new-note' })">Продолжить</button>
      </div>
    </article>

    <article v-if="notesSyncState.hydrating || notesSyncState.pendingCount || notesSyncState.lastError" class="sync-banner">
      <strong>Синхронизация</strong>
      <p>{{ syncBannerCopy }}</p>
      <button
        class="sync-inline-btn"
        type="button"
        :disabled="notesSyncState.hydrating || notesSyncState.flushing"
        @click="flushPendingRemoteChanges"
      >
        {{ syncActionLabel }}
      </button>
    </article>

    <div v-if="routeFilters.teaType || routeFilters.region || routeFilters.brewingMode || routeFilters.source" class="filters">
      <span class="filter-chip" v-if="routeFilters.teaType">Тип: {{ routeFilters.teaType }}</span>
      <span class="filter-chip" v-if="routeFilters.region">Регион: {{ routeFilters.region }}</span>
      <span class="filter-chip" v-if="routeFilters.brewingMode">Режим: {{ routeFilters.brewingMode }}</span>
      <span class="filter-chip" v-if="routeFilters.source">Источник: {{ routeFilters.source }}</span>
      <button class="text-btn" @click="clearFilters">Сбросить фильтр</button>
    </div>

    <p v-if="filteredNotes.length === 0" class="empty">Пока нет сохранённых заметок. Создай первую через «Новая заметка».</p>
    <ul v-else class="note-list">
      <li v-for="note in filteredNotes" :key="note.id" class="note-row" :style="getNoteColorStyles(note.noteColor)">
        <button class="note-link" type="button" @click="router.push(`/app/notes/${note.id}`)">
          <div class="note-body">
            <div class="note-main">
              <strong class="note-title">{{ note.teaName || 'Без названия' }}</strong>
              <span v-if="note.sessionTitle" class="note-session">{{ note.sessionTitle }}</span>
            </div>
            <div class="note-meta">
              <span>{{ note.teaType || 'Тип не указан' }}</span>
              <span v-if="note.region">· {{ note.region }}</span>
              <span v-if="note.setupSummary">· {{ note.setupSummary }}</span>
            </div>
          </div>
          <NoteSyncMarker :status="getNoteSyncStatus(note.id)" class-name="side-sync" />
          <div class="note-foot">
            <time class="note-time" :datetime="note.updatedAt">{{ formatNoteDate(note.updatedAt) }}</time>
          </div>
        </button>
        <NoteIconActions @edit="router.push(`/app/notes/${note.id}/edit`)" @remove="removeNote(note.id)" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; display: grid; gap: 12px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.subtitle { color: #4b6350; margin: 0; max-width: 720px; line-height: 1.5; font-size: 14px; }
.draft-card, .sync-banner { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1px solid #d8e7d3; background: #f7fbf5; }
.draft-card h3 { margin: 0 0 4px; }
.draft-copy, .sync-banner p { margin: 0; color: #506853; font-size: 14px; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-chip { border: 1px solid #d9e6d5; border-radius: 999px; padding: 5px 9px; font-size: 12px; color: #466049; background: #fbfdf8; }
.text-btn { border: 0; background: transparent; color: #2f7b3d; cursor: pointer; font-weight: 700; }
.sync-inline-btn {
  border: 0;
  background: transparent;
  color: #2f7b3d;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  margin-left: auto;
}
.sync-inline-btn:disabled { opacity: 0.6; cursor: default; }
.empty { margin: 0; padding: 16px; border: 1px dashed #c6dcc3; border-radius: 12px; background: #fbfdf8; color: #4d6651; font-size: 14px; }
.note-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.note-row { display: flex; justify-content: space-between; align-items: stretch; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #e3eee0; background: #fbfdf8; }
.note-link { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; align-items: start; text-align: left; border: 0; background: transparent; cursor: pointer; padding: 0; }
.note-body { min-width: 0; display: grid; gap: 6px; }
.note-main { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.note-title { color: #173a20; font-size: 15px; }
.note-session, .note-meta { font-size: 13px; color: #5d7460; }
.note-foot { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.note-time { font-size: 12px; color: #6a806e; }
.side-sync { align-self: center; margin-top: 2px; }
.btn { border: 0; border-radius: 10px; padding: 8px 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2f7b3d; color: #fff; }
.btn-ghost { background: #eaf5e6; color: #1f4d28; }

@media (max-width: 860px) {
  .head,
  .draft-card,
  .sync-banner,
  .note-row {
    flex-direction: column;
  }

  .note-link {
    grid-template-columns: 1fr;
  }

  .side-sync {
    justify-self: start;
    margin-top: 0;
  }
}
</style>
