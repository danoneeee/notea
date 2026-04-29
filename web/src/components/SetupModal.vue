<script setup lang="ts">
import { computed, ref } from 'vue';
import { addSetup, type TeaSetup } from '../services/setups';
import type { TeawareItem } from '../services/teaware';

const props = defineProps<{
  modelValue: boolean;
  teawareItems: TeawareItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [setups: TeaSetup[]];
}>();

const setupName = ref('');
const selectedTeawareIds = ref<Set<string>>(new Set());

const hasAnyTeaware = computed(() => props.teawareItems.length > 0);

function close() {
  emit('update:modelValue', false);
}

async function save() {
  const selectedIds = props.teawareItems.filter((item) => selectedTeawareIds.value.has(item.id)).map((item) => item.id);
  if (!setupName.value.trim() || selectedIds.length === 0) {
    return;
  }
  const setups = await addSetup(setupName.value, selectedIds);
  setupName.value = '';
  selectedTeawareIds.value = new Set();
  emit('saved', setups);
  close();
}
</script>

<template>
  <div v-if="props.modelValue" class="backdrop" @click.self="close">
    <section class="modal">
      <h3>Новый сетап церемонии</h3>
      <p class="hint">Сначала задай название, затем отметь посуду, которая входит в этот сетап.</p>

      <label class="field">
        Название сетапа
        <input v-model="setupName" type="text" placeholder="Например: Гунфу вечер" />
      </label>
      <div v-if="hasAnyTeaware" class="teaware-grid">
        <button
          v-for="item in props.teawareItems"
          :key="item.id"
          type="button"
          class="teaware-pill"
          :class="{ 'teaware-pill--selected': selectedTeawareIds.has(item.id) }"
          @click="
            () => {
              const next = new Set(selectedTeawareIds);
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              selectedTeawareIds = next;
            }
          "
        >
          {{ item.name }}
        </button>
      </div>
      <p v-else class="hint">Сначала добавь посуду на полку, затем из неё можно будет собрать сетап.</p>

      <div class="actions">
        <button class="btn btn-ghost" type="button" @click="close">Отмена</button>
        <button class="btn btn-primary" type="button" @click="save">Сохранить сетап</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(21, 34, 21, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 20;
}

.modal {
  width: min(560px, 100%);
  background: #fff;
  border: 1px solid #d7e6d6;
  border-radius: 14px;
  padding: 16px;
}

h3 {
  margin: 0 0 6px;
}

.hint {
  margin: 0 0 10px;
  color: #4d6551;
  font-size: 14px;
}

.field {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #345139;
}

.row {
  display: flex;
  gap: 8px;
}

input {
  flex: 1;
  border: 1px solid #cedec9;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.chips {
  display: none;
}

.chip {
  display: none;
}

.chip-remove {
  display: none;
}

.teaware-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 12px;
}

.teaware-pill {
  border: 1px solid #cfe0cb;
  background: #f3faf0;
  color: #24482d;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
}

.teaware-pill--selected {
  background: #2f7b3d;
  border-color: #2f7b3d;
  color: #fff;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #2f7b3d;
  color: #fff;
}

.btn-ghost {
  background: #eaf5e6;
  color: #1f4d28;
}
</style>
