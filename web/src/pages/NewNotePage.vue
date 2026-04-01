<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DescriptorWheel from '../components/DescriptorWheel.vue';
import {
  describeDescriptorPath,
  descriptorFamilies,
  getDescriptorFamilyById,
  getDescriptorGroupById,
} from '../data/descriptors';
import { NOTES_DRAFT_KEY, upsertRecentNote } from '../services/notes';
import { listSetups, type TeaSetup } from '../services/setups';

type OptionalBasicField = 'originDetail' | 'cultivar' | 'source' | 'harvestSeason' | 'harvestYear' | 'processingStyle';
type OptionalBrewField = 'waterSource' | 'rinseCount' | 'infusionsCount' | 'brewingMethod';

const teaTypeOptions = ['Шен пуэр', 'Шу пуэр', 'Улун', 'Белый', 'Зелёный', 'Красный', 'Хэйча', 'Жёлтый', 'Матча', 'Травяной'];
const regionSuggestions = ['Юньнань', 'Фуцзянь', 'Гуандун', 'Аньхой', 'Чжэцзян', 'Сычуань', 'Тайвань', 'Япония', 'Корея', 'Индия', 'Непал', 'Шри-Ланка'];
const originSuggestions = ['Мэнхай', 'Иу', 'Буланшань', 'Уишань', 'Алишань', 'Лишань', 'Фудин', 'Чаочжоу'];
const cultivarSuggestions = ['Да Е Чжун', 'Цин Синь', 'Жоу Гуй', 'Шуй Сянь', 'Фо Шоу', 'Мэй Чжань', 'Бай Хао'];
const sourceOptions = ['Магазин', 'Чайный клуб', 'Обмен', 'Подарок', 'Путешествие', 'Личный запас'];
const processingStyleOptions = ['Свежий', 'Выдержанный', 'Лёгкая обжарка', 'Средняя обжарка', 'Сильная обжарка', 'Сильная ферментация', 'Bug-bitten', 'Charcoal roast'];
const waterSourceOptions = ['Фильтрованная', 'Бутилированная', 'Родниковая', 'Осмос + минерализация', 'Водопроводная отстоянная'];

const router = useRouter();
const step = ref(1);

const sessionTitle = ref('');
const teaName = ref('');
const teaType = ref('');
const region = ref('');
const originDetail = ref('');
const cultivar = ref('');
const source = ref('');
const processingStyle = ref('');
const harvestSeason = ref('');
const harvestYear = ref<number | null>(null);

const brewingMode = ref<'gongfu' | 'steep' | 'coldbrew'>('gongfu');
const brewingMethod = ref('');
const waterSource = ref('');
const setupId = ref('');
const leafGrams = ref<number | null>(null);
const waterTemp = ref<number | null>(null);
const waterVolumeMl = ref<number | null>(null);
const rinseCount = ref<number | null>(null);
const infusionsCount = ref<number | null>(null);
const timeValue = ref<number | null>(null);

const liquorColor = ref('');
const mouthfeel = ref('');
const energyEffect = ref('');
const freeText = ref('');

const setups = ref<TeaSetup[]>([]);
const ratings = ref({
  aroma: 0,
  taste: 0,
  aftertaste: 0,
  balance: 0,
});

const showExtraBasics = ref(false);
const showExtraBrew = ref(false);
const skippedBasics = ref<Record<OptionalBasicField, boolean>>({
  originDetail: false,
  cultivar: false,
  source: false,
  harvestSeason: false,
  harvestYear: false,
  processingStyle: false,
});
const skippedBrew = ref<Record<OptionalBrewField, boolean>>({
  waterSource: false,
  rinseCount: false,
  infusionsCount: false,
  brewingMethod: false,
});

const selectedLimit = 12;
const activeFamilyId = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const expandingNodeId = ref<string | null>(null);
const selectedDescriptorIds = ref<string[]>([]);

const activeFamily = computed(() => (activeFamilyId.value ? getDescriptorFamilyById(activeFamilyId.value) : null));
const activeGroup = computed(() => {
  if (!activeFamilyId.value || !activeGroupId.value) return null;
  return getDescriptorGroupById(activeFamilyId.value, activeGroupId.value);
});

const descriptorDepth = computed(() => {
  if (activeFamily.value && activeGroup.value) return 2;
  if (activeFamily.value) return 1;
  return 0;
});

const wheelDescriptors = computed(() => {
  if (!activeFamily.value) {
    return descriptorFamilies.map((family) => ({
      id: family.id,
      label: family.label,
      color: family.color,
    }));
  }

  if (!activeGroup.value) {
    return activeFamily.value.groups.map((group) => ({
      id: `${activeFamily.value?.id}:${group.id}`,
      label: group.label,
      color: activeFamily.value?.color ?? '#cddcc7',
    }));
  }

  return activeGroup.value.notes.map((note) => ({
    id: `${activeFamily.value?.id}:${activeGroup.value?.id}:${note.id}`,
    label: note.label,
    color: activeFamily.value?.color ?? '#cddcc7',
  }));
});

const wheelCenterLabel = computed(() => {
  if (!activeFamily.value) return 'НАЙТИ НОТУ';
  if (!activeGroup.value) return activeFamily.value.label.toUpperCase();
  return activeGroup.value.label.toUpperCase();
});

const wheelCenterSubLabel = computed(() => {
  if (!activeFamily.value) return 'семейства';
  return 'нажми для возврата';
});

const previewSubcategories = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {};
  if (!activeFamily.value) {
    for (const family of descriptorFamilies) {
      map[family.id] = family.groups.map((group) => group.label);
    }
    return map;
  }
  if (!activeGroup.value) {
    for (const group of activeFamily.value.groups) {
      map[`${activeFamily.value.id}:${group.id}`] = group.notes.map((note) => note.label);
    }
  }
  return map;
});

const descriptorBreadcrumb = computed(() => {
  const items: string[] = ['Круг'];
  if (activeFamily.value) items.push(activeFamily.value.label);
  if (activeGroup.value) items.push(activeGroup.value.label);
  return items;
});

const selectedDescriptors = computed(() => selectedDescriptorIds.value.map((id) => describeDescriptorPath(id)));
const basicsExpanded = computed(() => showExtraBasics.value);
const brewExpanded = computed(() => showExtraBrew.value);
const skippedBasicFields = computed(() =>
  Object.entries(skippedBasics.value)
    .filter(([, skipped]) => skipped)
    .map(([field]) => field as OptionalBasicField),
);
const skippedBrewFields = computed(() =>
  Object.entries(skippedBrew.value)
    .filter(([, skipped]) => skipped)
    .map(([field]) => field as OptionalBrewField),
);
const skippedFields = computed(() => [...skippedBasicFields.value, ...skippedBrewFields.value]);
const areRatingsComplete = computed(() => Object.values(ratings.value).every((value) => value > 0));
const ratingsAverage = computed(() => (Object.values(ratings.value).reduce((sum, value) => sum + value, 0) / 4).toFixed(1));

const stepIntroCopy = computed(() => {
  if (step.value === 1) {
    return 'Заполни то, что знаешь наверняка: название, тип и регион. Более тонкие детали можно раскрыть ниже, если они у тебя есть.';
  }
  if (step.value === 2) {
    return 'Для заметки достаточно базовых параметров. Если хочешь сохранить точнее, ниже есть опциональные поля про воду, промывку и число проливов.';
  }
  if (step.value === 3) {
    return 'Сначала выбери большое семейство, потом сузь поиск до подгруппы, а затем раскрой круг ещё сильнее, чтобы поймать точную ноту.';
  }
  return 'Сначала поставь обязательные оценки по звёздам, а затем при желании добавь свободное впечатление и дополнительные ощущения чашки.';
});

const timeLabel = computed(() => {
  if (brewingMode.value === 'gongfu') return '1-й пролив';
  if (brewingMode.value === 'steep') return 'Настой';
  return 'Cold brew';
});

const timeUnit = computed(() => {
  if (brewingMode.value === 'gongfu') return 'сек';
  if (brewingMode.value === 'steep') return 'мин';
  return 'ч';
});

const timeMin = computed(() => (brewingMode.value === 'gongfu' ? 1 : 0));
const timeMax = computed(() => {
  if (brewingMode.value === 'gongfu') return 120;
  if (brewingMode.value === 'steep') return 30;
  return 48;
});

onMounted(() => {
  setups.value = listSetups();
});

function nextStep() {
  if (step.value < 4) step.value += 1;
}

function prevStep() {
  if (step.value > 1) step.value -= 1;
}

function setRating(key: keyof typeof ratings.value, value: number) {
  ratings.value[key] = value;
}

function clearOptionalBasicValue(field: OptionalBasicField) {
  if (field === 'originDetail') originDetail.value = '';
  if (field === 'cultivar') cultivar.value = '';
  if (field === 'source') source.value = '';
  if (field === 'harvestSeason') harvestSeason.value = '';
  if (field === 'harvestYear') harvestYear.value = null;
  if (field === 'processingStyle') processingStyle.value = '';
}

function setBasicFieldSkipped(field: OptionalBasicField, skipped: boolean) {
  skippedBasics.value[field] = skipped;
  if (skipped) clearOptionalBasicValue(field);
}

function clearOptionalBrewValue(field: OptionalBrewField) {
  if (field === 'waterSource') waterSource.value = '';
  if (field === 'rinseCount') rinseCount.value = null;
  if (field === 'infusionsCount') infusionsCount.value = null;
  if (field === 'brewingMethod') brewingMethod.value = '';
}

function setBrewFieldSkipped(field: OptionalBrewField, skipped: boolean) {
  skippedBrew.value[field] = skipped;
  if (skipped) clearOptionalBrewValue(field);
}

async function animateDescriptorFocus(id: string) {
  expandingNodeId.value = id;
  await new Promise((resolve) => setTimeout(resolve, 260));
  expandingNodeId.value = null;
}

async function openDescriptorLevel(id: string) {
  await animateDescriptorFocus(id);
  if (!activeFamily.value) {
    activeFamilyId.value = id;
    activeGroupId.value = null;
    return;
  }
  if (!activeGroup.value) {
    const [, groupId] = id.split(':');
    activeGroupId.value = groupId ?? null;
  }
}

async function toggleDescriptor(id: string) {
  if (!activeFamily.value || !activeGroup.value) {
    await openDescriptorLevel(id);
    return;
  }

  if (selectedDescriptorIds.value.includes(id)) {
    selectedDescriptorIds.value = selectedDescriptorIds.value.filter((item) => item !== id);
    return;
  }

  if (selectedDescriptorIds.value.length >= selectedLimit) return;
  selectedDescriptorIds.value = [...selectedDescriptorIds.value, id];
}

function goDescriptorBack() {
  if (activeGroup.value) {
    activeGroupId.value = null;
    expandingNodeId.value = null;
    return;
  }
  activeFamilyId.value = null;
  expandingNodeId.value = null;
}

function clearSelectedDescriptors() {
  selectedDescriptorIds.value = [];
}

function removeSelectedDescriptor(id: string) {
  selectedDescriptorIds.value = selectedDescriptorIds.value.filter((item) => item !== id);
}

function saveDraft() {
  const payload = {
    sessionTitle: sessionTitle.value,
    teaName: teaName.value,
    teaType: teaType.value,
    region: region.value,
    originDetail: originDetail.value,
    cultivar: cultivar.value,
    source: source.value,
    processingStyle: processingStyle.value,
    harvestSeason: harvestSeason.value,
    harvestYear: harvestYear.value,
    skippedFields: skippedFields.value,
    brewingMode: brewingMode.value,
    brewingMethod: brewingMethod.value,
    waterSource: waterSource.value,
    setupId: setupId.value || null,
    setupSummary: setupId.value ? setups.value.find((x) => x.id === setupId.value)?.items.join(' + ') ?? '' : '',
    leafGrams: leafGrams.value,
    waterTemp: waterTemp.value,
    waterVolumeMl: waterVolumeMl.value,
    rinseCount: rinseCount.value,
    infusionsCount: infusionsCount.value,
    timeValue: timeValue.value,
    timeUnit: timeUnit.value,
    descriptors: selectedDescriptorIds.value,
    liquorColor: liquorColor.value,
    mouthfeel: mouthfeel.value,
    energyEffect: energyEffect.value,
    freeText: freeText.value,
    ratings: ratings.value,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(NOTES_DRAFT_KEY, JSON.stringify(payload));
  upsertRecentNote(payload);
}

function finish() {
  saveDraft();
  router.push('/app/notes');
}

function goBack() {
  router.push('/app/notes');
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
      <div v-if="step === 1" class="step-shell">
        <div class="step-intro">
          <h2>Паспорт чая</h2>
          <p>{{ stepIntroCopy }}</p>
        </div>
        <div class="field-grid">
          <label class="field field-span-2">
            <span class="field-title">Название сессии / церемонии</span>
            <input v-model="sessionTitle" type="text" placeholder="Например, Утренний гунфу, Вечерний утёсный улун, Дегустация с друзьями" />
          </label>
          <label class="field field-span-2">
            <span class="field-title">Название чая</span>
            <input v-model="teaName" type="text" placeholder="Например, Лао Бан Чжан, Да Хун Пао, Бай Му Дань" />
          </label>
          <label class="field">
            <span class="field-title">Тип</span>
            <select v-model="teaType">
              <option value="">Выбери тип</option>
              <option v-for="option in teaTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-title">Провинция / регион</span>
            <input v-model="region" list="region-suggestions" type="text" placeholder="Начни вводить регион" />
          </label>
        </div>

        <div class="optional-block">
          <div class="optional-head">
            <div>
              <h3>Дополнительные детали о чае</h3>
              <p class="optional-copy">Происхождение, сезон, культивар и стиль обработки помогут отличать похожие чаи. У каждого поля можно явно отметить, что ты его не указываешь.</p>
            </div>
            <button
              class="mini-btn"
              type="button"
              @click="showExtraBasics = !showExtraBasics"
            >
              {{ basicsExpanded ? 'Скрыть опциональные поля' : 'Показать опциональные поля' }}
            </button>
          </div>

          <div v-if="basicsExpanded" class="field-grid optional-grid">
            <div class="field field-span-2" :class="{ 'field-skipped': skippedBasics.originDetail }">
              <div class="field-head">
                <span class="field-title">Точное происхождение</span>
                <button v-if="!skippedBasics.originDetail" type="button" class="field-skip-btn" @click="setBasicFieldSkipped('originDetail', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('originDetail', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBasics.originDetail">
                <p class="field-note">Можно выбрать из подсказок или вписать своё.</p>
                <input
                  v-model="originDetail"
                  list="origin-suggestions"
                  type="text"
                  placeholder="Гора, деревня, сад, фабрика, участок"
                />
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBasics.cultivar }">
              <div class="field-head">
                <span class="field-title">Культивар / материал</span>
                <button v-if="!skippedBasics.cultivar" type="button" class="field-skip-btn" @click="setBasicFieldSkipped('cultivar', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('cultivar', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBasics.cultivar">
                <p class="field-note">Популярные варианты доступны в подсказках.</p>
                <input
                  v-model="cultivar"
                  list="cultivar-suggestions"
                  type="text"
                  placeholder="Например, Цин Синь или Да Е Чжун"
                />
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBasics.source }">
              <div class="field-head">
                <span class="field-title">Источник</span>
                <button v-if="!skippedBasics.source" type="button" class="field-skip-btn" @click="setBasicFieldSkipped('source', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('source', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBasics.source">
                <p class="field-note">Вместо свободного текста можно выбрать готовый сценарий.</p>
                <select v-model="source">
                  <option value="">Выбери источник</option>
                  <option v-for="option in sourceOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBasics.harvestSeason }">
              <div class="field-head">
                <span class="field-title">Сезон сбора</span>
                <button v-if="!skippedBasics.harvestSeason" type="button" class="field-skip-btn" @click="setBasicFieldSkipped('harvestSeason', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('harvestSeason', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBasics.harvestSeason">
                <p class="field-note">Сезон проще выбрать из шаблона, чем вводить руками.</p>
                <select v-model="harvestSeason">
                  <option value="">Выбери сезон</option>
                  <option value="spring">Весна</option>
                  <option value="summer">Лето</option>
                  <option value="autumn">Осень</option>
                  <option value="winter">Зима</option>
                </select>
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBasics.harvestYear }">
              <div class="field-head">
                <span class="field-title">Год сбора</span>
                <button v-if="!skippedBasics.harvestYear" type="button" class="field-skip-btn" @click="setBasicFieldSkipped('harvestYear', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('harvestYear', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBasics.harvestYear">
                <p class="field-note">Если год неизвестен, лучше явно пропустить поле, чем оставлять случайное значение.</p>
                <input
                  v-model.number="harvestYear"
                  type="number"
                  min="1980"
                  max="2100"
                  step="1"
                  placeholder="2024"
                />
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field field-span-2" :class="{ 'field-skipped': skippedBasics.processingStyle }">
              <div class="field-head">
                <span class="field-title">Обработка / стиль партии</span>
                <button v-if="!skippedBasics.processingStyle" type="button" class="field-skip-btn" @click="setBasicFieldSkipped('processingStyle', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBasicFieldSkipped('processingStyle', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBasics.processingStyle">
                <p class="field-note">Для самых частых случаев доступны готовые варианты.</p>
                <select v-model="processingStyle">
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

      <div v-else-if="step === 2" class="step-shell">
        <div class="step-intro">
          <h2>Параметры сессии</h2>
          <p>{{ stepIntroCopy }}</p>
        </div>
        <div class="field-grid session-basics-grid">
          <label class="field">
            <span class="field-title">Режим заваривания</span>
            <select v-model="brewingMode">
              <option value="gongfu">Проливами (гунфу)</option>
              <option value="steep">Настоем (1 заваривание)</option>
              <option value="coldbrew">Cold brew (холодный настой)</option>
            </select>
          </label>

          <label class="field">
            <span class="field-title">Комплект посуды</span>
            <select v-model="setupId">
              <option value="">Без сетапа</option>
              <option v-for="setup in setups" :key="setup.id" :value="setup.id">{{ setup.name }}</option>
            </select>
          </label>
        </div>

        <p class="setup-hint" v-if="setupId">
          Состав сетапа: {{ setups.find((x) => x.id === setupId)?.items.join(' + ') }}
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
                <input v-model.number="leafGrams" type="number" min="0" step="0.1" placeholder="7" />
                <span class="unit">г</span>
              </div>
            </div>
            <div class="param">
              <span class="param-label">Объём воды</span>
              <div class="param-input">
                <input v-model.number="waterVolumeMl" type="number" min="0" step="1" placeholder="100" />
                <span class="unit">мл</span>
              </div>
            </div>
            <div class="param">
              <span class="param-label">Температура воды</span>
              <div class="param-input">
                <input v-model.number="waterTemp" type="number" min="0" max="100" step="1" placeholder="95" />
                <span class="unit">°C</span>
              </div>
            </div>
            <div class="param">
              <span class="param-label">{{ timeLabel }}</span>
              <div class="param-input">
                <input v-model.number="timeValue" type="number" :min="timeMin" :max="timeMax" step="1" placeholder="10" />
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
            <button
              class="mini-btn"
              type="button"
              @click="showExtraBrew = !showExtraBrew"
            >
              {{ brewExpanded ? 'Скрыть опциональные поля' : 'Показать опциональные поля' }}
            </button>
          </div>

          <div v-if="brewExpanded" class="field-grid optional-grid">
            <div class="field" :class="{ 'field-skipped': skippedBrew.waterSource }">
              <div class="field-head">
                <span class="field-title">Тип воды</span>
                <button v-if="!skippedBrew.waterSource" type="button" class="field-skip-btn" @click="setBrewFieldSkipped('waterSource', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBrewFieldSkipped('waterSource', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBrew.waterSource">
                <p class="field-note">Лучше короткий шаблон, чем длинное пояснение.</p>
                <select v-model="waterSource">
                  <option value="">Выбери тип воды</option>
                  <option v-for="option in waterSourceOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBrew.rinseCount }">
              <div class="field-head">
                <span class="field-title">Промывка</span>
                <button v-if="!skippedBrew.rinseCount" type="button" class="field-skip-btn" @click="setBrewFieldSkipped('rinseCount', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBrewFieldSkipped('rinseCount', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBrew.rinseCount">
                <p class="field-note">Укажи, если промывка реально влияет на твой ритуал.</p>
                <div class="param-inline">
                  <input v-model.number="rinseCount" type="number" min="0" max="5" step="1" placeholder="1" />
                  <span class="unit">раз</span>
                </div>
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBrew.infusionsCount }">
              <div class="field-head">
                <span class="field-title">Итог проливов</span>
                <button v-if="!skippedBrew.infusionsCount" type="button" class="field-skip-btn" @click="setBrewFieldSkipped('infusionsCount', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBrewFieldSkipped('infusionsCount', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBrew.infusionsCount">
                <p class="field-note">Полезно, если хочешь сравнивать живучесть разных партий.</p>
                <div class="param-inline">
                  <input v-model.number="infusionsCount" type="number" min="1" max="30" step="1" placeholder="7" />
                  <span class="unit">шт</span>
                </div>
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>

            <div class="field" :class="{ 'field-skipped': skippedBrew.brewingMethod }">
              <div class="field-head">
                <span class="field-title">Комментарии к сессии</span>
                <button v-if="!skippedBrew.brewingMethod" type="button" class="field-skip-btn" @click="setBrewFieldSkipped('brewingMethod', true)">Не указываю</button>
                <button v-else type="button" class="field-skip-btn active" @click="setBrewFieldSkipped('brewingMethod', false)">Заполнить</button>
              </div>
              <template v-if="!skippedBrew.brewingMethod">
                <p class="field-note">Сюда удобно записать посуду, ритм проливов или другие детали процесса.</p>
                <input
                  v-model="brewingMethod"
                  type="text"
                  placeholder="Гайвань 100 мл, быстрые проливы, чай предварительно прогрет"
                />
              </template>
              <div v-else class="field-skipped-state">Поле пропущено осознанно</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="step === 3" class="step-shell descriptor-step">
        <div class="step-intro">
          <h2>Дескрипторный круг</h2>
          <p>
            Сначала выбери большое семейство, потом сузь поиск до подгруппы, а затем раскрой круг ещё сильнее, чтобы
            поймать точную ноту.
          </p>
        </div>

        <div class="descriptor-layout">
          <section class="descriptor-panel">
            <div class="descriptor-toolbar">
              <div class="crumbs">
                <template v-for="(crumb, index) in descriptorBreadcrumb" :key="`${crumb}-${index}`">
                  <span class="crumb" :class="{ active: index === descriptorBreadcrumb.length - 1 }">{{ crumb }}</span>
                  <span v-if="index < descriptorBreadcrumb.length - 1" class="crumb-separator">›</span>
                </template>
              </div>
            </div>

            <DescriptorWheel
              :descriptors="wheelDescriptors"
              :selected-ids="selectedDescriptorIds"
              :center-label="wheelCenterLabel"
              :center-sub-label="wheelCenterSubLabel"
              :center-clickable="Boolean(activeFamilyId)"
              :expanding-id="expandingNodeId"
              :fade-others="Boolean(expandingNodeId)"
              :zoom-level="descriptorDepth"
              :preview-subcategories="previewSubcategories"
              :show-sub-preview="!activeGroup"
              @toggle="toggleDescriptor"
              @center-click="goDescriptorBack"
            />
          </section>

          <aside class="selected">
            <div class="selected-head">
              <div>
                <h3>Ноты сессии</h3>
                <p class="hint">Можно выбрать до {{ selectedLimit }} точных нот для одной записи.</p>
              </div>
              <div class="selected-meta">
                <span class="selected-count">{{ selectedDescriptorIds.length }}/{{ selectedLimit }}</span>
                <button
                  v-if="selectedDescriptorIds.length"
                  class="mini-btn ghost"
                  type="button"
                  @click="clearSelectedDescriptors"
                >
                  Очистить
                </button>
              </div>
            </div>

            <div v-if="selectedDescriptors.length > 0" class="selected-tags">
              <button
                v-for="item in selectedDescriptors"
                :key="item.id"
                class="descriptor-tag"
                type="button"
                :title="item.fullLabel"
                @click="removeSelectedDescriptor(item.id)"
              >
                <span class="descriptor-dot" :style="{ background: item.color }" />
                <span>{{ item.shortLabel }}</span>
                <span class="tag-remove">×</span>
              </button>
            </div>
            <p v-else class="hint">Выбери сначала семейство, затем подгруппу и в финале конкретную ноту.</p>

            <div class="descriptor-notes">
              <h4>Как читать круг</h4>
              <ul>
                <li>1-й уровень: большие вкусовые семьи.</li>
                <li>2-й уровень: более точные направления внутри семьи.</li>
                <li>3-й уровень: конкретная нота чашки.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <div v-else class="step-shell final-step-shell">
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
              <select v-model="liquorColor">
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
              <select v-model="mouthfeel">
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
              <select v-model="energyEffect">
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
                <button v-for="n in 5" :key="`balance-${n}`" class="star" type="button" @click="setRating('balance', n)">
                  {{ n <= ratings.balance ? '★' : '☆' }}
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
                v-model="freeText"
              rows="11"
                placeholder="Как раскрывался чай по проливам, где появилась сладость, какое было тело, что случилось в конце..."
              />
            </label>
          </section>
        </section>
      </div>
    </section>

    <footer class="footer">
      <button class="btn btn-ghost" :disabled="step === 1" @click="prevStep">Назад</button>
      <div class="right-actions">
        <button class="btn btn-ghost" @click="saveDraft">Сохранить черновик</button>
        <button v-if="step < 4" class="btn btn-primary" @click="nextStep">Далее</button>
        <button v-else class="btn btn-primary" :disabled="!areRatingsComplete" @click="finish">Сохранить заметку</button>
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

.step-shell {
  display: grid;
  gap: 18px;
}

.final-step-shell {
  gap: 18px;
}

.step-intro {
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f7fbf5 0%, #edf6e8 100%);
  border: 1px solid #d8e7d3;
}

.step-intro h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.step-intro p {
  margin: 0;
  color: #537057;
  line-height: 1.5;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
  color: #345139;
  font-size: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #dbe7d8;
  background: #fbfdf9;
}

.field-span-2 {
  grid-column: span 2;
}

.field-span-all {
  grid-column: 1 / -1;
}

.field-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #628067;
  font-weight: 700;
}

.field-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.field-skip-btn {
  border: 1px solid #d4e3d0;
  background: #fff;
  color: #58725c;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.field-skip-btn.active {
  background: #e9f5e5;
  border-color: #93bf97;
  color: #265130;
}

.field-note {
  margin: -2px 0 0;
  color: #6a846e;
  font-size: 12px;
  line-height: 1.45;
}

.field-skipped {
  background: #f7faf5;
  border-style: dashed;
}

.field-skipped-state {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 10px;
  background: #f4f7f2;
  color: #708673;
  font-size: 13px;
  font-weight: 600;
}

input,
select,
textarea {
  border: 1px solid #cedec9;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #7fb286;
  box-shadow: 0 0 0 3px rgba(94, 156, 104, 0.12);
}

.optional-block {
  border: 1px dashed #d9e6d5;
  border-radius: 16px;
  padding: 14px;
  background: #fbfdf9;
}

.optional-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.optional-head h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.optional-copy {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #617b65;
}

.optional-grid {
  padding-top: 4px;
}

.session-basics-grid {
  align-items: start;
}

.metric-section {
  border: 1px solid #dbe7d8;
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(180deg, #fcfefb 0%, #f7fbf5 100%);
}

.metric-section-head {
  margin-bottom: 12px;
}

.metric-section-head h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #284e30;
}

.metric-section-head p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #627c66;
}

.descriptor-layout {
  display: grid;
  grid-template-columns: minmax(460px, 700px) 1fr;
  gap: 20px;
  align-items: start;
}

.descriptor-panel {
  display: grid;
  gap: 12px;
}

.descriptor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.crumb {
  padding: 4px 0;
  color: #6f8773;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.crumb.active {
  color: #244e2e;
}

.crumb-separator {
  color: #9db39f;
  font-size: 14px;
  line-height: 1;
}

.selected {
  border: 1px solid #dbe7d8;
  border-radius: 12px;
  padding: 14px;
  background: #fbfdf9;
}

.selected h3 {
  margin: 0;
}

.selected-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 8px;
}

.selected-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.selected-count {
  min-width: 54px;
  text-align: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: #e8f3e5;
  color: #2b5b34;
  font-size: 12px;
  font-weight: 800;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.descriptor-tag {
  border: 1px solid #cee0ca;
  background: #f4faf2;
  border-radius: 999px;
  padding: 8px 10px 8px 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #285231;
  font-size: 13px;
}

.descriptor-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.75), 0 0 0 1px rgba(87, 112, 92, 0.12);
}

.tag-remove {
  font-size: 16px;
  line-height: 1;
  color: #75917a;
}

.descriptor-notes {
  margin-top: 16px;
  border-top: 1px solid #e2ece0;
  padding-top: 14px;
}

.descriptor-notes h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.descriptor-notes ul {
  margin: 0;
  padding-left: 18px;
  color: #59735d;
  line-height: 1.6;
}

.hint {
  margin: 0;
  color: #668169;
}

.setup-hint {
  margin: -4px 0 2px;
  color: #5f7962;
  font-size: 13px;
}

.brew-params {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding-top: 4px;
}

.brew-params-primary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.param {
  border: 1px solid #dbe7d8;
  background: #fbfdf8;
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 6px;
}

.param-label {
  font-size: 12px;
  font-weight: 700;
  color: #3d5e42;
}

.param-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-input input {
  width: 100%;
  border: 1px solid #cedec9;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
}

.param-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-inline input {
  width: 100%;
}

.unit {
  color: #5c775f;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.final-secondary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-top: 0;
}

.finish-top-card {
  border: 1px solid #dce8d8;
  border-radius: 12px;
  padding: 12px;
  background: #fbfdf9;
}

.finish-top-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}

.final-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.final-section-head h3 {
  margin: 0 0 4px;
}

.final-section-head p {
  margin: 0;
  color: #617b65;
  font-size: 13px;
  line-height: 1.45;
}

.notes-panel {
  border: 1px solid #dce8d8;
  border-radius: 12px;
  padding: 12px;
  background: #fbfdf9;
}

.notes-field {
  padding: 0;
  border: 0;
  background: transparent;
}

@media (max-width: 860px) {
  .brew-params {
    grid-template-columns: 1fr;
  }
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

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.mini-btn.ghost {
  background: #fff;
}

.ratings {
  border: 1px solid #dce8d8;
  border-radius: 12px;
  padding: 14px;
  background: #fbfdf9;
  display: flex;
  flex-direction: column;
}

.ratings h3 {
  margin: 0 0 10px;
}

.rating-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #edf3eb;
}

.rating-row:last-of-type {
  border-bottom: 0;
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

.rating-summary {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #e2ece0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.rating-summary-label {
  color: #5f7962;
  font-size: 13px;
}

.rating-summary-value {
  color: #244e2e;
  font-size: 22px;
  line-height: 1;
}

.finish-field-compact {
  gap: 8px;
  padding: 12px;
}

.finish-field-compact select {
  min-height: 42px;
}

@media (max-width: 860px) {
  .field-grid,
  .finish-top-fields,
  .final-secondary-grid,
  .descriptor-layout {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: auto;
  }

  .brew-params {
    grid-template-columns: 1fr;
  }

  .descriptor-toolbar {
    align-items: flex-start;
  }

  .selected-meta {
    align-items: flex-start;
  }

  .optional-head {
    flex-direction: column;
  }

  .field-head {
    flex-direction: column;
  }
}
</style>
