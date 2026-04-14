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
  brewExpanded: boolean;
  skippedBrew: Ref<Record<OptionalBrewField, boolean>>;
  waterSourceOptions: string[];
  toggleExtraBrew: () => void;
  setBrewFieldSkipped: (field: OptionalBrewField, skipped: boolean) => void;
}>();
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
        <p>Самое важное для повторения удачной сессии: лист, вода, температура и время.</p>
      </div>

      <div class="brew-params brew-params-primary">
        <div class="param">
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
        <div class="param">
          <span class="param-label">Температура воды</span>
          <div class="param-input">
            <input v-model.number="fields.waterTemp.value" type="number" min="0" max="100" step="1" placeholder="95" />
            <span class="unit">°C</span>
          </div>
        </div>
        <div class="param">
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
          <p class="optional-copy">Для тех случаев, когда хочется зафиксировать воду, промывку и число проливов.</p>
        </div>
        <button class="mini-btn" type="button" @click="toggleExtraBrew">
          {{ brewExpanded ? 'Скрыть опциональные поля' : 'Показать опциональные поля' }}
        </button>
      </div>

      <div v-if="brewExpanded" class="field-grid optional-grid">
        <div class="field" :class="{ 'field-skipped': skippedBrew.value.waterSource }">
          <div class="field-head">
            <span class="field-title">Тип воды</span>
            <button
              v-if="!skippedBrew.value.waterSource"
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
          <template v-if="!skippedBrew.value.waterSource">
            <p class="field-note">Лучше короткий шаблон, чем длинное пояснение.</p>
            <select v-model="fields.waterSource.value">
              <option value="">Выбери тип воды</option>
              <option v-for="option in waterSourceOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBrew.value.rinseCount }">
          <div class="field-head">
            <span class="field-title">Промывка</span>
            <button
              v-if="!skippedBrew.value.rinseCount"
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
          <template v-if="!skippedBrew.value.rinseCount">
            <p class="field-note">Укажи, если промывка реально влияет на твой ритуал.</p>
            <div class="param-inline">
              <input v-model.number="fields.rinseCount.value" type="number" min="0" max="5" step="1" placeholder="1" />
              <span class="unit">раз</span>
            </div>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBrew.value.infusionsCount }">
          <div class="field-head">
            <span class="field-title">Итог проливов</span>
            <button
              v-if="!skippedBrew.value.infusionsCount"
              type="button"
              class="field-skip-btn"
              @click="setBrewFieldSkipped('infusionsCount', true)"
            >
              Не указываю
            </button>
            <button
              v-else
              type="button"
              class="field-skip-btn active"
              @click="setBrewFieldSkipped('infusionsCount', false)"
            >
              Заполнить
            </button>
          </div>
          <template v-if="!skippedBrew.value.infusionsCount">
            <p class="field-note">Полезно, если хочешь сравнивать живучесть разных партий.</p>
            <div class="param-inline">
              <input
                v-model.number="fields.infusionsCount.value"
                type="number"
                min="1"
                max="30"
                step="1"
                placeholder="7"
              />
              <span class="unit">шт</span>
            </div>
          </template>
          <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
        </div>

        <div class="field" :class="{ 'field-skipped': skippedBrew.value.brewingMethod }">
          <div class="field-head">
            <span class="field-title">Комментарии к сессии</span>
            <button
              v-if="!skippedBrew.value.brewingMethod"
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
          <template v-if="!skippedBrew.value.brewingMethod">
            <p class="field-note">Сюда удобно записать посуду, ритм проливов или другие детали процесса.</p>
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
