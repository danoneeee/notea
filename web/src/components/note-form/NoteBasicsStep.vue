<script setup lang="ts">
import type { Ref } from 'vue';
import type { OptionalBasicField } from '../../services/noteForm';

defineProps<{
  stepIntroCopy: string;
  fields: {
    sessionTitle: Ref<string>;
    teaName: Ref<string>;
    teaType: Ref<string>;
    region: Ref<string>;
    originDetail: Ref<string>;
    cultivar: Ref<string>;
    source: Ref<string>;
    processingStyle: Ref<string>;
    harvestSeason: Ref<string>;
    harvestYear: Ref<number | null>;
  };
  basicsExpanded: boolean;
  skippedBasics: Ref<Record<OptionalBasicField, boolean>>;
  teaTypeOptions: string[];
  regionSuggestions: string[];
  originSuggestions: string[];
  cultivarSuggestions: string[];
  sourceOptions: string[];
  processingStyleOptions: string[];
  toggleExtraBasics: () => void;
  setBasicFieldSkipped: (field: OptionalBasicField, skipped: boolean) => void;
}>();
</script>

<template>
  <div class="step-shell">
    <div class="step-intro">
      <h2>Паспорт чая</h2>
      <p>{{ stepIntroCopy }}</p>
    </div>
    <div class="field-grid">
      <label class="field field-span-2">
        <span class="field-title">Название сессии / церемонии</span>
        <input
          v-model="fields.sessionTitle.value"
          type="text"
          placeholder="Например, Утренний гунфу, Вечерний утёсный улун, Дегустация с друзьями"
        />
      </label>
      <label class="field field-span-2">
        <span class="field-title">Название чая</span>
        <input
          v-model="fields.teaName.value"
          type="text"
          placeholder="Например, Лао Бан Чжан, Да Хун Пао, Бай Му Дань"
        />
      </label>
      <label class="field">
        <span class="field-title">Тип</span>
        <select v-model="fields.teaType.value">
          <option value="">Выбери тип</option>
          <option v-for="option in teaTypeOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-title">Провинция / регион</span>
        <input v-model="fields.region.value" list="region-suggestions" type="text" placeholder="Начни вводить регион" />
      </label>
    </div>

    <div class="optional-block">
      <div class="optional-head">
        <div>
          <h3>Дополнительные детали о чае</h3>
          <p class="optional-copy">
            Происхождение, сезон, культивар и стиль обработки помогут отличать похожие чаи. У каждого поля можно явно
            отметить, что ты его не указываешь.
          </p>
        </div>
        <button class="mini-btn" type="button" @click="toggleExtraBasics">
          {{ basicsExpanded ? 'Скрыть опциональные поля' : 'Показать опциональные поля' }}
        </button>
      </div>

      <div v-if="basicsExpanded" class="field-grid optional-grid">
        <div class="field field-span-2" :class="{ 'field-skipped': skippedBasics.value.originDetail }">
          <div class="field-head">
            <span class="field-title">Точное происхождение</span>
            <button
              v-if="!skippedBasics.value.originDetail"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('originDetail', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('originDetail', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.value.originDetail">
            <p class="field-note">Можно выбрать из подсказок или вписать своё.</p>
            <input
              v-model="fields.originDetail.value"
              list="origin-suggestions"
              type="text"
              placeholder="Гора, деревня, сад, фабрика, участок"
            />
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.value.cultivar }">
          <div class="field-head">
            <span class="field-title">Культивар / материал</span>
            <button
              v-if="!skippedBasics.value.cultivar"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('cultivar', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('cultivar', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.value.cultivar">
            <p class="field-note">Популярные варианты доступны в подсказках.</p>
            <input
              v-model="fields.cultivar.value"
              list="cultivar-suggestions"
              type="text"
              placeholder="Например, Цин Синь или Да Е Чжун"
            />
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.value.source }">
          <div class="field-head">
            <span class="field-title">Источник</span>
            <button
              v-if="!skippedBasics.value.source"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('source', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('source', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.value.source">
            <p class="field-note">Вместо свободного текста можно выбрать готовый сценарий.</p>
            <select v-model="fields.source.value">
              <option value="">Выбери источник</option>
              <option v-for="option in sourceOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.value.harvestSeason }">
          <div class="field-head">
            <span class="field-title">Сезон сбора</span>
            <button
              v-if="!skippedBasics.value.harvestSeason"
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
          <template v-if="!skippedBasics.value.harvestSeason">
            <p class="field-note">Сезон проще выбрать из шаблона, чем вводить руками.</p>
            <select v-model="fields.harvestSeason.value">
              <option value="">Выбери сезон</option>
              <option value="spring">Весна</option>
              <option value="summer">Лето</option>
              <option value="autumn">Осень</option>
              <option value="winter">Зима</option>
            </select>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBasics.value.harvestYear }">
          <div class="field-head">
            <span class="field-title">Год сбора</span>
            <button
              v-if="!skippedBasics.value.harvestYear"
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
          <template v-if="!skippedBasics.value.harvestYear">
            <p class="field-note">Если год неизвестен, лучше явно пропустить поле, чем оставлять случайное значение.</p>
            <input
              v-model.number="fields.harvestYear.value"
              type="number"
              min="1980"
              max="2100"
              step="1"
              placeholder="2024"
            />
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field field-span-2" :class="{ 'field-skipped': skippedBasics.value.processingStyle }">
          <div class="field-head">
            <span class="field-title">Обработка / стиль партии</span>
            <button
              v-if="!skippedBasics.value.processingStyle"
              type="button"
              class="field-skip-btn"
              @click="setBasicFieldSkipped('processingStyle', true)"
            >
              Не указываю
            </button>
            <button
              v-else
              type="button"
              class="field-skip-btn active"
              @click="setBasicFieldSkipped('processingStyle', false)"
            >
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBasics.value.processingStyle">
            <p class="field-note">Для самых частых случаев доступны готовые варианты.</p>
            <select v-model="fields.processingStyle.value">
              <option value="">Выбери стиль обработки</option>
              <option v-for="option in processingStyleOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>
      </div>
    </div>

    <datalist id="region-suggestions">
      <option v-for="option in regionSuggestions" :key="option" :value="option" />
    </datalist>
    <datalist id="origin-suggestions">
      <option v-for="option in originSuggestions" :key="option" :value="option" />
    </datalist>
    <datalist id="cultivar-suggestions">
      <option v-for="option in cultivarSuggestions" :key="option" :value="option" />
    </datalist>
  </div>
</template>

<style scoped>
@import './noteFormShared.css';
</style>
