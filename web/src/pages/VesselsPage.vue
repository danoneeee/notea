<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import SetupModal from '../components/SetupModal.vue';
import { hydrateSetupsFromRemote, listSetups, removeSetup, type TeaSetup } from '../services/setups';
import {
  addTeaware,
  hydrateTeawareFromRemote,
  listTeaware,
  removeTeaware,
  type TeawareItem,
  type TeawareType,
} from '../services/teaware';
import { noteColorOptions } from '../services/noteColors';

const showSetupModal = ref(false);
const setups = ref<TeaSetup[]>(listSetups());
const teaware = ref<TeawareItem[]>(listTeaware());
const loading = ref(false);
const errorMessage = ref('');

const newTeawareName = ref('');
const newTeawareType = ref<TeawareType>('teapot');
const newTeawareColor = ref(noteColorOptions[1]?.value || '#7dbb6f');

const colorOptions = computed(() => noteColorOptions.slice(1)); // без "Без цвета"

async function loadInventory() {
  loading.value = true;
  errorMessage.value = '';
  try {
    teaware.value = await hydrateTeawareFromRemote();
    setups.value = await hydrateSetupsFromRemote();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось загрузить посуду и сетапы.';
    teaware.value = listTeaware();
    setups.value = listSetups();
  } finally {
    loading.value = false;
  }
}

async function onAddTeaware() {
  errorMessage.value = '';
  try {
    teaware.value = await addTeaware({ name: newTeawareName.value, type: newTeawareType.value, color: newTeawareColor.value });
    setups.value = await hydrateSetupsFromRemote();
    newTeawareName.value = '';
    newTeawareType.value = 'teapot';
    newTeawareColor.value = noteColorOptions[1]?.value || '#7dbb6f';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось добавить посуду.';
  }
}

async function onRemoveTeaware(id: string) {
  errorMessage.value = '';
  try {
    teaware.value = await removeTeaware(id);
    setups.value = await hydrateSetupsFromRemote();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось архивировать посуду.';
  }
}

function onSetupSaved(nextSetups: TeaSetup[]) {
  setups.value = nextSetups;
}

async function onRemove(id: string) {
  errorMessage.value = '';
  try {
    setups.value = await removeSetup(id);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось архивировать сетап.';
  }
}

onMounted(() => {
  void loadInventory();
});
</script>

<template>
  <section class="card">
    <header class="head">
      <div>
        <h2>Чайная полка</h2>
        <p class="subtitle">
          Сначала добавь предметы посуды (гайвани, чайники, пиалы, термосы…), потом объединяй их в сетапы.
        </p>
      </div>
      <div class="head-actions">
        <form class="add-teaware" @submit.prevent="onAddTeaware">
          <select v-model="newTeawareType">
            <option value="teapot">Чайник</option>
            <option value="gaiwan">Гайвань</option>
            <option value="cup">Пиала / кружка</option>
            <option value="pitcher">Чахай</option>
            <option value="aroma-cup">Чайные духи</option>
            <option value="thermos">Термос</option>
            <option value="other">Другое</option>
          </select>
          <input v-model="newTeawareName" type="text" placeholder="Название посуды" />
          <div class="color-picker" aria-label="Цвет посуды">
            <button
              v-for="option in colorOptions"
              :key="option.value"
              type="button"
              class="color-dot"
              :class="{ 'color-dot--active': newTeawareColor === option.value }"
              :style="{ backgroundColor: option.swatch }"
              @click="newTeawareColor = option.value"
            />
          </div>
          <button class="btn btn-primary" type="submit">Добавить посуду</button>
        </form>
      </div>
    </header>

    <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
    <p v-else-if="loading" class="subtitle empty-state">Загружаю посуду и сетапы из аккаунта…</p>

    <div v-if="teaware.length > 0" class="grid">
      <article v-for="item in teaware" :key="item.id" class="vessel-card">
        <div class="vessel-color" :style="{ backgroundColor: item.color }" aria-hidden="true" />
        <div class="vessel-main">
          <h3 class="vessel-name">{{ item.name }}</h3>
          <p class="vessel-line">
            {{
              item.type === 'gaiwan'
                ? 'Гайвань'
                : item.type === 'teapot'
                  ? 'Чайник'
                  : item.type === 'cup'
                    ? 'Пиала / кружка'
                    : item.type === 'pitcher'
                      ? 'Чахай'
                      : item.type === 'aroma-cup'
                        ? 'Чайные духи'
                        : item.type === 'thermos'
                          ? 'Термос'
                          : 'Посуда'
            }}
          </p>
        </div>
        <button class="vessel-remove" type="button" @click="onRemoveTeaware(item.id)">×</button>
      </article>
    </div>
    <p v-else class="subtitle empty-state">Пока нет посуды — добавь несколько предметов, чтобы коллекция ожила.</p>

    <div class="divider" aria-hidden="true"></div>

    <section class="setups">
      <div class="setups-head">
        <h3>Наборы (сетапы)</h3>
        <button class="btn btn-ghost" type="button" @click="showSetupModal = true">Создать сетап</button>
      </div>
      <ul class="setups-list">
        <li v-for="setup in setups" :key="setup.id" class="setups-row">
          <div class="setups-main">
            <strong>{{ setup.name }}</strong>
            <span class="setups-items">{{ setup.items.join(' + ') }}</span>
          </div>
          <button class="btn btn-ghost btn-small" @click="onRemove(setup.id)">Удалить</button>
        </li>
      </ul>
    </section>
  </section>

  <SetupModal v-model="showSetupModal" :teaware-items="teaware" @saved="onSetupSaved" />
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.head-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.subtitle { color: #4b6350; margin: 4px 0 0; max-width: 420px; }
.empty-state { margin-top: 16px; font-style: italic; }
.error-banner { margin: 0 0 12px; color: #8d2f40; }

.add-teaware {
  display: flex;
  gap: 6px;
  align-items: center;
}

.add-teaware select,
.add-teaware input {
  border-radius: 10px;
  border: 1px solid #cedec9;
  padding: 6px 8px;
  font-size: 13px;
}

.add-teaware input {
  min-width: 180px;
}

.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.vessel-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid #e0ebdd;
  background: #ffffff;
}

.vessel-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.vessel-main {
  min-width: 0;
}

.vessel-name {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 600;
  color: #173721;
}

.vessel-line {
  margin: 0;
  font-size: 12px;
  color: #4b6350;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vessel-remove {
  border: 0;
  background: transparent;
  color: #728773;
  cursor: pointer;
  font-size: 14px;
}

.btn { border: 0; border-radius: 10px; padding: 8px 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2f7b3d; color: #fff; }
.btn-ghost { background: #eaf5e6; color: #1f4d28; }
.btn-small { padding: 6px 10px; font-size: 12px; justify-self: end; }

.setups {
  margin-top: 18px;
}

.setups-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.setups h3 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #345139;
}

.setups-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.setups-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border: 1px solid #e3eee0;
  border-radius: 10px;
  padding: 8px 10px;
  background: #f8fbf6;
}

.setups-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setups-items {
  font-size: 13px;
  color: #4b6350;
}

.color-picker {
  display: flex;
  gap: 4px;
  padding: 0 4px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-dot--active {
  border-color: #1f4d28;
}

.divider {
  margin: 18px 0 10px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, #dacdb9 0%, #c5b296 100%);
  box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.16);
}

@media (max-width: 720px) {
  .head {
    flex-direction: column;
    align-items: flex-start;
  }

  .head-actions {
    align-items: stretch;
  }

  .add-teaware {
    flex-wrap: wrap;
  }
}
</style>
