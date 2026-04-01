<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SetupModal from '../components/SetupModal.vue';
import { listSetups, removeSetup, type TeaSetup } from '../services/setups';

const showSetupModal = ref(false);
const setups = ref<TeaSetup[]>([]);

function loadSetups() {
  setups.value = listSetups();
}

function onRemove(id: string) {
  setups.value = removeSetup(id);
}

onMounted(loadSetups);
</script>

<template>
  <section class="card">
    <div class="head">
      <div>
        <h2>Посуда</h2>
        <p class="subtitle">Сохраняй и переиспользуй сетапы церемонии.</p>
      </div>
      <button class="btn btn-primary" @click="showSetupModal = true">Новый сетап</button>
    </div>

    <ul v-if="setups.length > 0" class="list">
      <li v-for="setup in setups" :key="setup.id" class="row">
        <div>
          <strong>{{ setup.name }}</strong>
          <div class="items">{{ setup.items.join(' + ') }}</div>
        </div>
        <button class="btn btn-ghost" @click="onRemove(setup.id)">Удалить</button>
      </li>
    </ul>
    <p v-else class="subtitle">Пока нет сетапов.</p>
  </section>

  <SetupModal v-model="showSetupModal" @saved="loadSetups" />
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.subtitle { color: #4b6350; margin: 0 0 8px; }
.list { margin: 0; padding-left: 0; list-style: none; display: grid; gap: 10px; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid #e3eee0; border-radius: 10px; padding: 10px; }
.items { color: #4b6350; font-size: 13px; }
.btn { border: 0; border-radius: 10px; padding: 8px 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2f7b3d; color: #fff; }
.btn-ghost { background: #eaf5e6; color: #1f4d28; }
</style>
