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
    isFavorite: Ref<boolean>;
    freeText: Ref<string>;
  };
  invalidFields: {
    ratings: boolean;
    liquorColor: boolean;
    mouthfeel: boolean;
    energyEffect: boolean;
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

    <section class="final-main-grid">
      <section class="ratings" :class="{ 'field-invalid': invalidFields.ratings }">
        <div class="final-section-head">
          <div>
            <h3>Оценки по категориям</h3>
            <p>Оцени сессию по четырём ключевым ощущениям чашки.</p>
          </div>
          <button
            type="button"
            class="favorite-heart"
            :class="{ active: fields.isFavorite.value }"
            :aria-pressed="fields.isFavorite.value"
            :title="fields.isFavorite.value ? 'Убрать из любимых' : 'Добавить в любимые'"
            @click="fields.isFavorite.value = !fields.isFavorite.value"
          >
            <span class="heart-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <path
                  d="M12 20.2l-1.1-1C6 14.9 3 12.1 3 8.7 3 6.1 5.1 4 7.7 4c1.6 0 3.2.8 4.3 2.1C13.1 4.8 14.7 4 16.3 4 18.9 4 21 6.1 21 8.7c0 3.4-3 6.2-7.9 10.5l-1.1 1z"
                />
              </svg>
            </span>
            <span class="heart-label">{{ fields.isFavorite.value ? 'В любимых' : 'В любимые' }}</span>
          </button>
        </div>
        <div class="rating-row" :class="{ invalid: invalidFields.ratings && fields.ratings.value.aroma === 0 }">
          <span>Аромат</span>
          <div class="stars">
            <button v-for="n in 5" :key="`aroma-${n}`" class="star" type="button" @click="setRating('aroma', n)">
              {{ n <= fields.ratings.value.aroma ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-row" :class="{ invalid: invalidFields.ratings && fields.ratings.value.taste === 0 }">
          <span>Вкус</span>
          <div class="stars">
            <button v-for="n in 5" :key="`taste-${n}`" class="star" type="button" @click="setRating('taste', n)">
              {{ n <= fields.ratings.value.taste ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-row" :class="{ invalid: invalidFields.ratings && fields.ratings.value.aftertaste === 0 }">
          <span>Послевкусие</span>
          <div class="stars">
            <button v-for="n in 5" :key="`aftertaste-${n}`" class="star" type="button" @click="setRating('aftertaste', n)">
              {{ n <= fields.ratings.value.aftertaste ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="rating-row" :class="{ invalid: invalidFields.ratings && fields.ratings.value.balance === 0 }">
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
            rows="10"
            placeholder="Как раскрывался чай по проливам, где появилась сладость, какое было тело, что случилось в конце..."
          />
        </label>
      </section>
    </section>

    <section class="finish-top-card">
      <div class="final-section-head">
        <div>
          <h3>Дополнительные ощущения чашки</h3>
          <p>Короткий профиль настоя и состояния после сессии.</p>
        </div>
      </div>

      <div class="finish-top-fields">
        <label class="field finish-field-compact" :class="{ 'field-invalid': invalidFields.liquorColor }">
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

        <label class="field finish-field-compact" :class="{ 'field-invalid': invalidFields.mouthfeel }">
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

        <label class="field finish-field-compact" :class="{ 'field-invalid': invalidFields.energyEffect }">
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
  </div>
</template>

<style scoped>
@import './noteFormShared.css';
</style>
