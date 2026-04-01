<script setup lang="ts">
import { ref } from 'vue';
import { addSetup } from '../services/setups';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const setupName = ref('');
const setupItemInput = ref('');
const draftSetupItems = ref<string[]>([]);

function close() {
  emit('update:modelValue', false);
}

function addDraftItem() {
  const value = setupItemInput.value.trim().replace(/\s+/g, ' ');
  if (!value) {
    return;
  }
  const hasSame = draftSetupItems.value.some((x) => x.toLowerCase() === value.toLowerCase());
  if (!hasSame) {
    draftSetupItems.value = [...draftSetupItems.value, value];
  }
  setupItemInput.value = '';
}

function removeDraftItem(item: string) {
  draftSetupItems.value = draftSetupItems.value.filter((x) => x !== item);
}

function save() {
  const before = JSON.stringify(draftSetupItems.value);
  addSetup(setupName.value, draftSetupItems.value);
  if (!setupName.value.trim() || before === '[]') {
    return;
  }
  setupName.value = '';
  setupItemInput.value = '';
  draftSetupItems.value = [];
  emit('saved');
  close();
}
</script>

<template>
  <div v-if="props.modelValue" class="backdrop" @click.self="close">
    <section class="modal">
      <h3>Новый сетап церемонии</h3>
      <p class="hint">Сначала задай название, затем добавь элементы посуды по одному.</p>

      <label class="field">
        Название сетапа
        <input v-model="setupName" type="text" placeholder="Например: Гунфу вечер" />
      </label>

      <label class="field">
        Элемент посуды
        <div class="row">
          <input
            v-model="setupItemInput"
            type="text"
            placeholder="Чайник, гайвань, пиала..."
            @keyup.enter="addDraftItem"
          />
          <button class="btn btn-ghost" type="button" @click="addDraftItem">Добавить</button>
        </div>
      </label>

      <div v-if="draftSetupItems.length > 0" class="chips">
        <span v-for="item in draftSetupItems" :key="item" class="chip">
          {{ item }}
          <button type="button" class="chip-remove" @click="removeDraftItem(item)">x</button>
        </span>
      </div>

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
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cfe0cb;
  background: #f3faf0;
  color: #24482d;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 13px;
}

.chip-remove {
  border: 0;
  background: transparent;
  color: #47684d;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
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
