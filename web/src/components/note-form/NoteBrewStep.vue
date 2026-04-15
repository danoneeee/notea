<script setup lang="ts">
import type { Ref } from 'vue';
import type { OptionalBrewField } from '../../services/noteForm';
import type { TeaSetup } from '../../services/setups';

defineProps<{
  stepIntroCopy: string;
  fields: {
    brewingMode: Ref<'gongfu' | 'steep' | 'coldbrew'>;
    setupId: Ref<string>;
    setups: Ref<TeaSetup[]>;
    leafGrams: Ref<number | null>;
    waterVolumeMl: Ref<number | null>;
    waterTemp: Ref<number | null>;
    timeValue: Ref<number | null>;
    waterSource: Ref<string>;
    rinseCount: Ref<number | null>;
    infusionsCount: Ref<number | null>;
    brewingMethod: Ref<string>;
  };
  timeLabel: string;
  timeUnit: string;
  timeMin: number;
  timeMax: number;
  skippedBrew: Record<OptionalBrewField, boolean>;
  invalidFields: {
    leafGrams: boolean;
    waterTemp: boolean;
    timeValue: boolean;
  };
  optionalInvalidFields: Record<OptionalBrewField, boolean>;
  waterSourceOptions: string[];
  setBrewFieldSkipped: (field: OptionalBrewField, skipped: boolean) => void;
}>();

const brewExpanded = defineModel<boolean>('brewExpanded', { default: false });

function toggleOptionalBrewSection() {
  brewExpanded.value = !brewExpanded.value;
}
</script>

<template>
  <div class="step-shell">
    <div class="step-intro">
      <h2>Параметры сессии</h2>
      <p>{{ stepIntroCopy }}</p>
    </div>
    <div class="field-grid session-basics-grid">
      <label class="field">
        <span class="field-title">Режим заваривания</span>
        <select v-model="fields.brewingMode.value">
          <option value="gongfu">Проливами (гунфу)</option>
          <option value="steep">Настоем (1 заваривание)</option>
          <option value="coldbrew">Cold brew (холодный настой)</option>
        </select>
      </label>

      <label class="field">
        <span class="field-title">Комплект посуды</span>
        <select v-model="fields.setupId.value">
          <option value="">Без сетапа</option>
          <option v-for="setup in fields.setups.value" :key="setup.id" :value="setup.id">{{ setup.name }}</option>
        </select>
      </label>
    </div>

    <p v-if="fields.setupId.value" class="setup-hint">
      Состав сетапа: {{ fields.setups.value.find((x) => x.id === fields.setupId.value)?.items.join(' + ') }}
    </p>

    <section class="metric-section">
      <div class="metric-section-head">
        <h3>Главные параметры</h3>
      </div>

      <div class="brew-params brew-params-primary">
        <div class="param" :class="{ 'param-invalid': invalidFields.leafGrams }">
          <span class="param-label">Лист</span>
          <div class="param-input">
            <input v-model.number="fields.leafGrams.value" type="number" min="0" step="0.1" placeholder="7" />
            <span class="unit">г</span>
          </div>
        </div>
        <div class="param">
          <span class="param-label">Объём воды</span>
          <div class="param-input">
            <input v-model.number="fields.waterVolumeMl.value" type="number" min="0" step="1" placeholder="100" />
            <span class="unit">мл</span>
          </div>
        </div>
        <div class="param" :class="{ 'param-invalid': invalidFields.waterTemp }">
          <span class="param-label">Температура воды</span>
          <div class="param-input">
            <input v-model.number="fields.waterTemp.value" type="number" min="0" max="100" step="1" placeholder="95" />
            <span class="unit">°C</span>
          </div>
        </div>
        <div class="param" :class="{ 'param-invalid': invalidFields.timeValue }">
          <span class="param-label">{{ timeLabel }}</span>
          <div class="param-input">
            <input
              v-model.number="fields.timeValue.value"
              type="number"
              :min="timeMin"
              :max="timeMax"
              step="1"
              placeholder="10"
            />
            <span class="unit">{{ timeUnit }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="optional-block">
      <div class="optional-head">
        <div>
          <h3>Тонкие параметры сессии</h3>
        </div>
        <button class="mini-btn" type="button" @click="toggleOptionalBrewSection">
          {{ brewExpanded ? 'Скрыть опциональные поля' : 'Показать опциональные поля' }}
        </button>
      </div>

      <div v-if="brewExpanded" class="field-grid optional-grid">
        <div class="field" :class="{ 'field-skipped': skippedBrew.waterSource, 'field-invalid': optionalInvalidFields.waterSource }">
          <div class="field-head">
            <span class="field-title">Тип воды</span>
            <button
              v-if="!skippedBrew.waterSource"
              type="button"
              class="field-skip-btn"
              @click="setBrewFieldSkipped('waterSource', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBrewFieldSkipped('waterSource', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBrew.waterSource">
            <select v-model="fields.waterSource.value">
              <option value="">Выбери тип воды</option>
              <option v-for="option in waterSourceOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBrew.rinseCount, 'field-invalid': optionalInvalidFields.rinseCount }">
          <div class="field-head">
            <span class="field-title">Промывка</span>
            <button
              v-if="!skippedBrew.rinseCount"
              type="button"
              class="field-skip-btn"
              @click="setBrewFieldSkipped('rinseCount', true)"
            >
              Не указываю
            </button>
            <button v-else type="button" class="field-skip-btn active" @click="setBrewFieldSkipped('rinseCount', false)">
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBrew.rinseCount">
            <div class="param-inline">
              <input v-model.number="fields.rinseCount.value" type="number" min="0" max="5" step="1" placeholder="1" />
              <span class="unit">раз</span>
            </div>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field field-span-2" :class="{ 'field-skipped': skippedBrew.brewingMethod, 'field-invalid': optionalInvalidFields.brewingMethod }">
          <div class="field-head">
            <span class="field-title">Комментарии к сессии</span>
            <button
              v-if="!skippedBrew.brewingMethod"
              type="button"
              class="field-skip-btn"
              @click="setBrewFieldSkipped('brewingMethod', true)"
            >
              Не указываю
            </button>
            <button
              v-else
              type="button"
              class="field-skip-btn active"
              @click="setBrewFieldSkipped('brewingMethod', false)"
            >
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBrew.brewingMethod">
            <input
              v-model="fields.brewingMethod.value"
              type="text"
              placeholder="Гайвань 100 мл, быстрые проливы, чай предварительно прогрет"
            />
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './noteFormShared.css';
</style>
