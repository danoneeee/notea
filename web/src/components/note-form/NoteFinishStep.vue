<script setup lang="ts">
import type { Ref } from 'vue';

type Ratings = {
  aroma: number;
  taste: number;
  aftertaste: number;
  balance: number;
};

type NoteColorOption = {
  value: string;
  label: string;
  swatch: string;
};

defineProps<{
  stepIntroCopy: string;
  fields: {
    liquorColor: Ref<string>;
    mouthfeel: Ref<string>;
    energyEffect: Ref<string>;
    ratings: Ref<Ratings>;
    noteColor: Ref<string>;
    freeText: Ref<string>;
  };
  ratingsAverage: string;
  noteColorOptions: NoteColorOption[];
  setRating: (key: keyof Ratings, value: number) => void;
}>();
</script>

<template>
  <div class="step-shell final-step-shell">
    <div class="step-intro">
      <h2>Финальный профиль чашки</h2>
      <p>{{ stepIntroCopy }}</p>
    </div>

    <section class="finish-top-card">
      <div class="final-section-head">
        <div>
          <h3>Дополнительные ощущения чашки</h3>
          <p>Короткий профиль настоя и состояния после сессии.</p>
        </div>
      </div>

      <div class="finish-top-fields">
        <label class="field finish-field-compact">
          <span class="field-title">Цвет настоя</span>
          <p class="field-note">Визуальный образ чашки.</p>
          <select v-model="fields.liquorColor.value">
            <option value="">Выбери оттенок</option>
            <option value="very-light">Очень светлый</option>
            <option value="gold">Золотистый</option>
            <option value="amber">Янтарный</option>
            <option value="orange">Оранжево-медный</option>
            <option value="red-brown">Красно-коричневый</option>
            <option value="dark">Темный</option>
          </select>
        </label>

        <label class="field finish-field-compact">
          <span class="field-title">Тело / текстура</span>
          <p class="field-note">Как ощущается чай во рту.</p>
          <select v-model="fields.mouthfeel.value">
            <option value="">Выбери текстуру</option>
            <option value="airy">Воздушное</option>
            <option value="silky">Шелковистое</option>
            <option value="juicy">Сочное</option>
            <option value="oily">Маслянистое</option>
            <option value="dense">Плотное</option>
            <option value="drying">Подсушивающее</option>
          </select>
        </label>

        <label class="field finish-field-compact">
          <span class="field-title">Энергия / состояние</span>
          <p class="field-note">Общий эффект после сессии.</p>
          <select v-model="fields.energyEffect.value">
            <option value="">Выбери состояние</option>
            <option value="quiet">Спокойное, созерцательное</option>
            <option value="warm">Теплое, расслабляющее</option>
            <option value="focused">Собранное, фокусирующее</option>
            <option value="uplifting">Поднимающее, яркое</option>
            <option value="strong">Сильное, телесное</option>
          </select>
        </label>
      </div>
    </section>

    <section class="final-secondary-grid">
      <section class="ratings">
        <div class="final-section-head">
          <div>
            <h3>Оценки по категориям</h3>
            <p>Оцени сессию по четырём ключевым ощущениям чашки.</p>
          </div>
        </div>
        <div class="rating-row">
          <span>Аромат</span>
          <div class="stars">
            <button v-for="n in 5" :key="`aroma-${n}`" class="star" type="button" @click="setRating('aroma', n)">
              {{ n <= fields.ratings.value.aroma ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-row">
          <span>Вкус</span>
          <div class="stars">
            <button v-for="n in 5" :key="`taste-${n}`" class="star" type="button" @click="setRating('taste', n)">
              {{ n <= fields.ratings.value.taste ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-row">
          <span>Послевкусие</span>
          <div class="stars">
            <button v-for="n in 5" :key="`aftertaste-${n}`" class="star" type="button" @click="setRating('aftertaste', n)">
              {{ n <= fields.ratings.value.aftertaste ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-row">
          <span>Баланс</span>
          <div class="stars">
            <button v-for="n in 5" :key="`balance-${n}`" class="star" type="button" @click="setRating('balance', n)">
              {{ n <= fields.ratings.value.balance ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-summary">
          <span class="rating-summary-label">Средняя оценка</span>
          <strong class="rating-summary-value">{{ ratingsAverage }}/5</strong>
        </div>
      </section>

      <section class="notes-panel note-color-panel">
        <div class="final-section-head">
          <div>
            <h3>Цвет заметки</h3>
            <p>Помогает визуально выделять записи в ленте и быстрее находить их глазами.</p>
          </div>
        </div>
        <div class="color-picker">
          <button
            v-for="option in noteColorOptions"
            :key="option.value || 'none'"
            type="button"
            class="color-chip"
            :class="{ active: fields.noteColor.value === option.value, empty: !option.value }"
            :title="option.label"
            @click="fields.noteColor.value = option.value"
          >
            <span class="color-chip-swatch" :style="{ background: option.swatch }"></span>
            <span class="color-chip-label">{{ option.label }}</span>
          </button>
        </div>
      </section>

      <section class="notes-panel final-notes">
        <div class="final-section-head">
          <div>
            <h3>Свободные заметки</h3>
            <p>Коротко опиши, как раскрывался чай и что особенно запомнилось.</p>
          </div>
        </div>
        <label class="field field-span-all notes-field">
          <textarea
            v-model="fields.freeText.value"
            rows="11"
            placeholder="Как раскрывался чай по проливам, где появилась сладость, какое было тело, что случилось в конце..."
          />
        </label>
      </section>
    </section>
  </div>
</template>

<style scoped>
@import './noteFormShared.css';
</style>
