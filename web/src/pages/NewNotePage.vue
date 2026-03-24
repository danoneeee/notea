<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import DescriptorWheel from '../components/DescriptorWheel.vue';

type DescriptorFamily = {
  id: string;
  label: string;
  color: string;
  subcategories: string[];
};

const router = useRouter();
const step = ref(1);

const teaName = ref('');
const teaType = ref('');
const region = ref('');
const brewingMethod = ref('');
const waterTemp = ref<number | null>(null);
const brewingTime = ref<number | null>(null);
const freeText = ref('');
const ratings = ref({
  aroma: 0,
  taste: 0,
  aftertaste: 0,
  balance: 0,
});

const descriptorFamilies: DescriptorFamily[] = [
  { id: 'floral', label: 'Цветочный', color: '#f3b1cf', subcategories: ['Жасмин', 'Сирень', 'Лаванда'] },
  { id: 'fruity', label: 'Фруктовый', color: '#f7c68b', subcategories: ['Цитрус', 'Сухофрукты', 'Косточковые'] },
  { id: 'sweet', label: 'Сладкий', color: '#f0d978', subcategories: ['Мед', 'Карамель', 'Тростниковый сахар'] },
  { id: 'herbal', label: 'Травяной', color: '#a5d69f', subcategories: ['Свежая трава', 'Мята', 'Шалфей'] },
  { id: 'woody', label: 'Древесный', color: '#c7ad8f', subcategories: ['Кора', 'Сандал', 'Кедр'] },
  { id: 'spicy', label: 'Пряный', color: '#e8a08d', subcategories: ['Корица', 'Гвоздика', 'Перец'] },
  { id: 'roasted', label: 'Жареный', color: '#b9937e', subcategories: ['Орех', 'Какао', 'Поджаристый хлеб'] },
  { id: 'mineral', label: 'Минеральный', color: '#b6c7d8', subcategories: ['Камень', 'Соль', 'Влажная земля'] },
  { id: 'umami', label: 'Умами', color: '#9bc5b2', subcategories: ['Бульонность', 'Морские водоросли', 'Соевый оттенок'] },
];

const activeFamilyId = ref<string | null>(null);
const selectedDescriptorIds = ref<string[]>([]); // "familyId:subcategory"
const expandingFamilyId = ref<string | null>(null);

const activeFamily = computed(() =>
  descriptorFamilies.find((family) => family.id === activeFamilyId.value) ?? null,
);

const wheelDescriptors = computed(() => {
  if (!activeFamily.value) {
    return descriptorFamilies.map((family) => ({
      id: family.id,
      label: family.label,
      color: family.color,
    }));
  }
  return activeFamily.value.subcategories.map((subcategory, index) => ({
    id: `${activeFamily.value?.id}:${index}`,
    label: subcategory,
    color: activeFamily.value?.color ?? '#cddcc7',
  }));
});

const wheelCenterLabel = computed(() => {
  if (!activeFamily.value) {
    return 'ВКУС';
  }
  return activeFamily.value.label.toUpperCase();
});

const previewSubcategories = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {};
  for (const family of descriptorFamilies) {
    map[family.id] = family.subcategories;
  }
  return map;
});

const selectedDescriptors = computed(() => {
  return selectedDescriptorIds.value.map((id) => {
    const [familyId, idxRaw] = id.split(':');
    const family = descriptorFamilies.find((x) => x.id === familyId);
    if (!family) {
      return { id, label: id };
    }
    const idx = Number(idxRaw);
    const subcategory = family.subcategories[idx] ?? 'Нота';
    return { id, label: `${family.label} -> ${subcategory}` };
  });
});

function nextStep() {
  if (step.value < 4) {
    step.value += 1;
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value -= 1;
  }
}

async function toggleDescriptor(id: string) {
  if (!activeFamily.value) {
    expandingFamilyId.value = id;
    await new Promise((resolve) => setTimeout(resolve, 220));
    activeFamilyId.value = id;
    expandingFamilyId.value = null;
    return;
  }

  if (selectedDescriptorIds.value.includes(id)) {
    selectedDescriptorIds.value = selectedDescriptorIds.value.filter((x) => x !== id);
    return;
  }

  if (selectedDescriptorIds.value.length >= 8) {
    return;
  }
  selectedDescriptorIds.value = [...selectedDescriptorIds.value, id];
}

function resetToFamilies() {
  activeFamilyId.value = null;
  expandingFamilyId.value = null;
}

function setRating(key: keyof typeof ratings.value, value: number) {
  ratings.value[key] = value;
}

function saveDraft() {
  const payload = {
    teaName: teaName.value,
    teaType: teaType.value,
    region: region.value,
    brewingMethod: brewingMethod.value,
    waterTemp: waterTemp.value,
    brewingTime: brewingTime.value,
    descriptors: selectedDescriptorIds.value,
    freeText: freeText.value,
    ratings: ratings.value,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem('notea_note_draft', JSON.stringify(payload));
}

function finish() {
  saveDraft();
  router.push('/');
}

function goBack() {
  router.push('/');
}
</script>

<template>
  <main class="page">
    <header class="header">
      <div>
        <h1>Новая заметка</h1>
        <p class="subtitle">Шаг {{ step }} из 4</p>
      </div>
      <button class="btn btn-ghost" @click="goBack">На главную</button>
    </header>

    <section class="progress">
      <div v-for="n in 4" :key="n" class="dot" :class="{ active: n <= step }" />
    </section>

    <section class="card">
      <div v-if="step === 1" class="form-grid">
        <label>
          Название чая
          <input v-model="teaName" type="text" placeholder="Например, Лао Бан Чжан" />
        </label>
        <label>
          Тип
          <input v-model="teaType" type="text" placeholder="Шен пуэр / Шу пуэр / Улун..." />
        </label>
        <label>
          Регион
          <input v-model="region" type="text" placeholder="Юньнань" />
        </label>
      </div>

      <div v-else-if="step === 2" class="form-grid">
        <label>
          Метод заваривания
          <input v-model="brewingMethod" type="text" placeholder="Гайвань, 100 мл" />
        </label>
        <label>
          Температура воды (°C)
          <input v-model.number="waterTemp" type="number" min="40" max="100" />
        </label>
        <label>
          Первый пролив (сек)
          <input v-model.number="brewingTime" type="number" min="1" max="120" />
        </label>
      </div>

      <div v-else-if="step === 3" class="descriptor-layout">
        <DescriptorWheel
          :descriptors="wheelDescriptors"
          :selected-ids="selectedDescriptorIds"
          :center-label="wheelCenterLabel"
          :expanding-id="expandingFamilyId"
          :fade-others="Boolean(expandingFamilyId)"
          :sub-mode="Boolean(activeFamilyId)"
          :preview-subcategories="previewSubcategories"
          :show-sub-preview="!activeFamilyId"
          @toggle="toggleDescriptor"
        />
        <aside class="selected">
          <div class="selected-head">
            <h3>Выбранные дескрипторы</h3>
            <button v-if="activeFamilyId" class="mini-btn" type="button" @click="resetToFamilies">
              К семействам
            </button>
          </div>
          <ul v-if="selectedDescriptors.length > 0">
            <li v-for="item in selectedDescriptors" :key="item.id">
              {{ item.label }}
            </li>
          </ul>
          <p v-else class="hint">Выбери до 8 нот.</p>
        </aside>
      </div>

      <div v-else class="form-grid">
        <section class="ratings">
          <h3>Оценки по категориям</h3>
          <div class="rating-row">
            <span>Аромат</span>
            <div class="stars">
              <button v-for="n in 5" :key="`aroma-${n}`" class="star" type="button" @click="setRating('aroma', n)">
                {{ n <= ratings.aroma ? '★' : '☆' }}
              </button>
            </div>
          </div>
          <div class="rating-row">
            <span>Вкус</span>
            <div class="stars">
              <button v-for="n in 5" :key="`taste-${n}`" class="star" type="button" @click="setRating('taste', n)">
                {{ n <= ratings.taste ? '★' : '☆' }}
              </button>
            </div>
          </div>
          <div class="rating-row">
            <span>Послевкусие</span>
            <div class="stars">
              <button
                v-for="n in 5"
                :key="`aftertaste-${n}`"
                class="star"
                type="button"
                @click="setRating('aftertaste', n)"
              >
                {{ n <= ratings.aftertaste ? '★' : '☆' }}
              </button>
            </div>
          </div>
          <div class="rating-row">
            <span>Баланс</span>
            <div class="stars">
              <button
                v-for="n in 5"
                :key="`balance-${n}`"
                class="star"
                type="button"
                @click="setRating('balance', n)"
              >
                {{ n <= ratings.balance ? '★' : '☆' }}
              </button>
            </div>
          </div>
        </section>
        <label>
          Свободные заметки
          <textarea
            v-model="freeText"
            rows="6"
            placeholder="Послевкусие, ощущение в теле, общее впечатление..."
          />
        </label>
      </div>
    </section>

    <footer class="footer">
      <button class="btn btn-ghost" :disabled="step === 1" @click="prevStep">Назад</button>
      <div class="right-actions">
        <button class="btn btn-ghost" @click="saveDraft">Сохранить черновик</button>
        <button v-if="step < 4" class="btn btn-primary" @click="nextStep">Далее</button>
        <button v-else class="btn btn-primary" @click="finish">Сохранить заметку</button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: #182018;
  background: #f7fbf5;
}

.header {
  max-width: 1080px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header h1 {
  margin: 0;
}

.subtitle {
  margin: 4px 0 0;
  color: #58715b;
}

.progress {
  max-width: 1080px;
  margin: 0 auto 16px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.dot {
  height: 8px;
  border-radius: 999px;
  background: #dce7d7;
}

.dot.active {
  background: #2f7b3d;
}

.card {
  max-width: 1080px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #dfe9db;
  border-radius: 16px;
  padding: 24px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid label {
  display: grid;
  gap: 6px;
  color: #345139;
  font-size: 14px;
}

input,
textarea {
  border: 1px solid #cedec9;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.descriptor-layout {
  display: grid;
  grid-template-columns: minmax(420px, 620px) 1fr;
  gap: 20px;
  align-items: start;
}

.selected {
  border: 1px solid #dbe7d8;
  border-radius: 12px;
  padding: 14px;
}

.selected h3 {
  margin: 0 0 8px;
}

.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.selected ul {
  margin: 0;
  padding-left: 20px;
}

.hint {
  margin: 0;
  color: #668169;
}

.footer {
  max-width: 1080px;
  margin: 16px auto 0;
  display: flex;
  justify-content: space-between;
}

.right-actions {
  display: flex;
  gap: 8px;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
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

.mini-btn {
  border: 1px solid #cfe0cb;
  background: #f5faf3;
  color: #33553b;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

.ratings {
  border: 1px solid #dce8d8;
  border-radius: 12px;
  padding: 12px;
}

.ratings h3 {
  margin: 0 0 10px;
}

.rating-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  border: 0;
  background: transparent;
  color: #e0a94b;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

@media (max-width: 860px) {
  .descriptor-layout {
    grid-template-columns: 1fr;
  }
}
</style>
