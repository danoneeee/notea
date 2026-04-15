<script setup lang="ts">
import type { Ref } from 'vue';
import type { OptionalBasicField } from '../../services/noteForm';

defineProps<{
  stepIntroCopy: string;
  fields: {
    sessionTitle: Ref<string>;
    teaName: Ref<string>;
    teaType: Ref<string>;
    country: Ref<string>;
    originRegion: Ref<string>;
    harvestSeason: Ref<string>;
    harvestYear: Ref<number | null>;
    notes: Ref<string>;
  };
  skippedBasics: Record<OptionalBasicField, boolean>;
  invalidFields: {
    sessionTitle: boolean;
    teaName: boolean;
    teaType: boolean;
  };
  optionalInvalidFields: Record<OptionalBasicField, boolean>;
  teaTypeOptions: string[];
  countrySuggestions: string[];
  originRegionSuggestions: string[];
  setBasicFieldSkipped: (field: OptionalBasicField, skipped: boolean) => void;
}>();

const basicsExpanded = defineModel<boolean>('basicsExpanded', { default: false });

function toggleOptionalBasicsSection() {
  basicsExpanded.value = !basicsExpanded.value;
}
</script>

<template>
  <div class="step-shell">
    <div class="step-intro">
      <h2>Паспорт чая</h2>
      <p>{{ stepIntroCopy }}</p>
    </div>
    <div class="field-grid">
      <label class="field field-span-2" :class="{ 'field-invalid': invalidFields.sessionTitle }">
        <span class="field-title">Название сессии / церемонии</span>
        <input
          v-model="fields.sessionTitle.value"
          type="text"
          placeholder="Например, Утренний гунфу, Вечерний утёсный улун, Дегустация с друзьями"
        />
      </label>
      <label class="field" :class="{ 'field-invalid': invalidFields.teaName }">
        <span class="field-title">Название чая</span>
        <input
          v-model="fields.teaName.value"
          type="text"
          placeholder="Например, Лао Бан Чжан, Да Хун Пао, Бай Му Дань"
        />
      </label>
      <label class="field" :class="{ 'field-invalid': invalidFields.teaType }">
        <span class="field-title">Тип</span>
        <select v-model="fields.teaType.value">
          <option value="">Выбери тип</option>
          <option v-for="option in teaTypeOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
    </div>

    <div class="optional-block">
      <div class="optional-head">
        <div>
          <h3>Дополнительные детали о чае</h3>
          <p class="optional-copy">Заполняй только то, что действительно поможет вспомнить партию и сравнить её с другими.</p>
        </div>
        <button class="mini-btn" type="button" @click="toggleOptionalBasicsSection">
          {{ basicsExpanded ? 'Скрыть опциональные поля' : 'Показать опциональные поля' }}
        </button>
      </div>

      <div v-if="basicsExpanded" class="field-grid optional-grid">
        <div class="field" :class="{ 'field-skipped': skippedBasics.country, 'field-invalid': optionalInvalidFields.country }">
          <div class="field-head">
            <span class="field-title">Страна</span>
            <button
              v-if="!skippedBasics.country"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('country', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('country', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.country">
            <select v-model="fields.country.value">
              <option value="">Выбери страну</option>
              <option v-for="option in countrySuggestions" :key="option" :value="option">{{ option }}</option>
            </select>
          </template>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.originRegion, 'field-invalid': optionalInvalidFields.originRegion }">
          <div class="field-head">
            <span class="field-title">Провинция / регион</span>
            <button
              v-if="!skippedBasics.originRegion"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('originRegion', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('originRegion', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.originRegion">
            <select v-if="fields.country.value" v-model="fields.originRegion.value">
              <option value="">Выбери регион</option>
              <option v-for="option in originRegionSuggestions" :key="option" :value="option">{{ option }}</option>
            </select>
            <div v-else class="field-skipped-state">Сначала выбери страну.</div>
          </template>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.harvestSeason, 'field-invalid': optionalInvalidFields.harvestSeason }">
          <div class="field-head">
            <span class="field-title">Сезон сбора</span>
            <button
              v-if="!skippedBasics.harvestSeason"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('harvestSeason', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('harvestSeason', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.harvestSeason">
            <select v-model="fields.harvestSeason.value">
              <option value="">Выбери сезон</option>
              <option value="spring">Весна</option>
              <option value="summer">Лето</option>
              <option value="autumn">Осень</option>
              <option value="winter">Зима</option>
            </select>
          </template>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.harvestYear, 'field-invalid': optionalInvalidFields.harvestYear }">
          <div class="field-head">
            <span class="field-title">Год сбора</span>
            <button
              v-if="!skippedBasics.harvestYear"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('harvestYear', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('harvestYear', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.harvestYear">
            <input
              v-model.number="fields.harvestYear.value"
              type="number"
              min="1980"
              max="2100"
              step="1"
              placeholder="2024"
            />
          </template>
        </div>

        <div class="field field-span-2" :class="{ 'field-skipped': skippedBasics.notes, 'field-invalid': optionalInvalidFields.notes }">
          <div class="field-head">
            <span class="field-title">Дополнительные заметки</span>
            <button
              v-if="!skippedBasics.notes"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('notes', true)"
            >
              Не указываю
            </button>
            <button
              v-else
              type="button"
              class="field-skip-btn active"
              @click="setBasicFieldSkipped('notes', false)"
            >
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.notes">
            <p class="field-note">Добавь дополнительные заметки по партии или сессии, если это поможет при следующем заваривании.</p>
            <textarea v-model="fields.notes.value" rows="3" placeholder="Например, культивар Цин Синь, партия весна 2024, сырьё из сада на высоте 1200 м." />
          </template>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import './noteFormShared.css';
</style>
