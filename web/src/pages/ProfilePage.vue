<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import DescriptorWheel from '../components/DescriptorWheel.vue';
import { descriptorWheelFamilies } from '../data/descriptors';
import { listNotes, notesRevision } from '../services/notes';
import { useAuthStore } from '../stores/auth';

const PROFILE_AVATAR_KEY = 'notea_profile_avatar';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const router = useRouter();
const auth = useAuthStore();
const wheelDescriptors = descriptorWheelFamilies;

const avatarInput = ref<HTMLInputElement | null>(null);
const avatarImage = ref(typeof window !== 'undefined' ? localStorage.getItem(PROFILE_AVATAR_KEY) || '' : '');

const notes = computed(() => {
  void notesRevision.value;
  return listNotes();
});

const userName = computed(() => auth.state.userName?.trim() || 'Чаевод');
const totalNotes = computed(() => notes.value.length);
const totalPosts = computed(() => 0);

const avatarLetters = computed(() =>
  userName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'N',
);

const topTeas = computed(() => {
  const map = new Map<string, number>();
  for (const note of notes.value) {
    const key = note.teaType?.trim() || 'Не указан тип';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count], index) => ({ label, count, rank: index + 1 }));
});

function openAvatarPicker() {
  avatarInput.value?.click();
}

function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.alert('Можно выбрать только изображение.');
    input.value = '';
    return;
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    window.alert('Изображение слишком большое. Выбери файл до 2 МБ.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : '';
    avatarImage.value = result;
    localStorage.setItem(PROFILE_AVATAR_KEY, result);
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function logout() {
  auth.logout();
  router.push('/');
}

/** 0..1 по каждому семейству на круге: чем чаще нота в заметках, тем ярче сегмент */
const segmentIntensity = computed(() => {
  const usage = new Map<string, number>();
  for (const descriptor of wheelDescriptors) {
    usage.set(descriptor.id, 0);
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
  for (const value of usage.values()) {
    max = Math.max(max, value);
  }
  const out: Record<string, number> = {};
  for (const descriptor of wheelDescriptors) {
    const count = usage.get(descriptor.id) ?? 0;
    out[descriptor.id] = max > 0 ? count / max : 0;
  }
  return out;
});
</script>

<template>
  <section class="card">
    <section class="hero">
      <div class="profile-panel">
        <div class="profile-head">
          <div class="avatar-shell">
            <img v-if="avatarImage" :src="avatarImage" alt="Аватар профиля" class="avatar-image" />
            <div v-else class="avatar-fallback">{{ avatarLetters }}</div>
          </div>

          <div class="profile-copy">
            <p class="eyebrow">Профиль</p>
            <h1>{{ userName }}</h1>
            <div class="profile-actions">
              <button class="btn btn-primary" type="button" @click="openAvatarPicker">Сменить аватар</button>
              <button class="btn btn-ghost" type="button" @click="logout">Выйти</button>
            </div>
          </div>
        </div>

        <input
          ref="avatarInput"
          class="visually-hidden"
          type="file"
          accept="image/*"
          @change="onAvatarSelected"
        />
      </div>

      <aside class="wheel-panel" aria-label="Круг вкусового профиля">
        <p class="eyebrow">Круг</p>
        <div class="profile-wheel">
          <DescriptorWheel
            :descriptors="wheelDescriptors"
            :selected-ids="[]"
            :segment-intensity="segmentIntensity"
            center-label=""
          />
        </div>
      </aside>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">Количество заметок</span>
        <strong class="stat-value">{{ totalNotes }}</strong>
      </article>

      <article class="stat-card">
        <div class="stat-head">
          <span class="stat-label">Количество постов</span>
          <span class="beta-badge">beta</span>
        </div>
        <strong class="stat-value">{{ totalPosts }}</strong>
      </article>
      <article class="stat-card top-teas-card">
        <span class="stat-label">Топ чаёв</span>
        <div v-if="topTeas.length" class="top-inline-list">
          <div v-for="item in topTeas" :key="item.label" class="top-inline-item">
            <span class="top-inline-rank">{{ item.rank }}</span>
            <span class="top-inline-name">{{ item.label }}</span>
            <span class="top-inline-count">{{ item.count }}</span>
          </div>
        </div>
        <p v-else class="empty-state">Пока пусто</p>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel posts-panel">
        <div class="panel-head">
          <div class="posts-title">
            <p class="eyebrow">Посты</p>
            <span class="beta-badge">beta</span>
          </div>
        </div>

        <div class="posts-placeholder">
          <strong>Здесь появятся посты</strong>
          <p>Раздел подготовлен под будущую ленту и публикации, но сами посты пока не реализованы.</p>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.card {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  gap: 12px;
  background: #fff;
  border: 1px solid #deead8;
  border-radius: 16px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 12px;
}

.profile-panel,
.wheel-panel,
.stat-card,
.panel {
  border: 1px solid #deead8;
  border-radius: 12px;
  background: #fff;
}

.profile-panel,
.wheel-panel,
.panel {
  padding: 16px;
}

.profile-head {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.avatar-shell {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #d4e5cf;
  background: linear-gradient(180deg, #eef7ea 0%, #d8ead3 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.avatar-image,
.avatar-fallback {
  width: 100%;
  height: 100%;
}

.avatar-image {
  object-fit: cover;
  display: block;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  font-size: 30px;
  font-weight: 800;
  color: #163820;
}

.profile-copy {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6d856f;
}

.profile-copy h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  color: #173a20;
}

.profile-actions,
.stat-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.wheel-panel {
  display: grid;
  gap: 10px;
  justify-items: center;
  align-content: start;
}

.profile-wheel {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%);
  border: 1px solid #d4e5cf;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.profile-wheel :deep(.wheel-wrap),
.profile-wheel :deep(.wheel) {
  width: 124px;
  height: 124px;
}

.profile-wheel :deep(.segment-label),
.profile-wheel :deep(.preview),
.profile-wheel :deep(.halo-ring),
.profile-wheel :deep(.center-action) {
  display: none;
}

.profile-wheel :deep(.segment-group),
.profile-wheel :deep(.wheel) {
  transition: none;
}

.profile-wheel :deep(.segment) {
  cursor: default;
}

.stats-grid,
.content-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  padding: 14px 16px;
  display: grid;
  gap: 6px;
}

.stat-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5d7460;
}

.stat-value {
  font-size: 32px;
  line-height: 1;
  color: #173a20;
}

.panel {
  display: grid;
  gap: 12px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.top-teas-card {
  align-content: start;
}

.top-inline-list {
  display: grid;
  gap: 6px;
}

.top-inline-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  color: #21442a;
  font-size: 13px;
}

.top-inline-rank {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #edf6ea;
  color: #245a32;
  font-size: 11px;
  font-weight: 800;
}

.top-inline-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-inline-count {
  color: #5d7460;
  font-size: 12px;
}

.empty-state,
.posts-placeholder p {
  margin: 0;
  color: #5d7460;
  line-height: 1.6;
}

.posts-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.content-grid {
  grid-template-columns: 1fr;
}

.posts-panel {
  min-height: 0;
}

.posts-placeholder {
  min-height: 200px;
  border: 1px dashed #cfe0cb;
  border-radius: 12px;
  background: #fbfdf8;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
}

.posts-placeholder strong {
  color: #173a20;
  font-size: 22px;
}

.beta-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid #e6dcaa;
  background: #fff7dc;
  color: #7a6116;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.btn-primary {
  color: #fff;
  background: #2f7b3d;
}

.btn-ghost {
  color: #1f4d28;
  background: #eaf5e6;
}

.btn-demo {
  color: #1f4d28;
  background: #f4ecd0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 920px) {
  .hero,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .wheel-panel {
    justify-items: start;
  }
}

@media (max-width: 720px) {
  .card {
    padding: 16px;
  }

  .profile-head {
    grid-template-columns: 1fr;
  }

  .profile-copy h1 {
    font-size: 24px;
  }

  .avatar-shell {
    width: 84px;
    height: 84px;
  }

  .avatar-fallback {
    font-size: 26px;
  }

  .profile-wheel,
  .profile-wheel :deep(.wheel-wrap),
  .profile-wheel :deep(.wheel) {
    width: 108px;
    height: 108px;
  }
}
</style>
