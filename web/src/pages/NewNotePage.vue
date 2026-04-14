<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NoteBasicsStep from '../components/note-form/NoteBasicsStep.vue';
import NoteBrewStep from '../components/note-form/NoteBrewStep.vue';
import NoteDescriptorsStep from '../components/note-form/NoteDescriptorsStep.vue';
import NoteFinishStep from '../components/note-form/NoteFinishStep.vue';
import {
  describeDescriptorPath,
  descriptorFamilies,
  getDescriptorFamilyById,
  getDescriptorGroupById,
} from '../data/descriptors';
import {
  NOTES_DRAFT_KEY,
  discardDraft,
  ensureNoteAvailable,
  getLatestDraft,
  publishNote,
  saveDraft as saveDraftRecord,
  type NoteRecord,
} from '../services/notes';
import {
  buildSetupSummary,
  createSkippedBasicsState,
  createSkippedBrewState,
  getStepValidationError,
  readStoredDraftNoteId,
  type OptionalBasicField,
  type OptionalBrewField,
  cultivarSuggestions,
  originSuggestions,
  processingStyleOptions,
  regionSuggestions,
  sourceOptions,
  teaTypeOptions,
  waterSourceOptions,
} from '../services/noteForm';
import { noteColorOptions } from '../services/noteColors';
import { listSetups, type TeaSetup } from '../services/setups';

const route = useRoute();
const router = useRouter();
const step = ref(1);
const draftNoteId = ref(readStoredDraftNoteId(localStorage.getItem(NOTES_DRAFT_KEY)));
const stepError = ref('');
const formNotice = ref('');

if (route.query.fresh === '1' || route.params.noteId) {
  draftNoteId.value = crypto.randomUUID();
}

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
const noteColor = ref('');
const freeText = ref('');

const setups = ref<TeaSetup[]>([]);
const ratings = ref({
  aroma: 0,
  taste: 0,
  aftertaste: 0,
  balance: 0,
});

const basicFields = {
  sessionTitle,
  teaName,
  teaType,
  region,
  originDetail,
  cultivar,
  source,
  processingStyle,
  harvestSeason,
  harvestYear,
};

const brewFields = {
  brewingMode,
  setupId,
  setups,
  leafGrams,
  waterVolumeMl,
  waterTemp,
  timeValue,
  waterSource,
  rinseCount,
  infusionsCount,
  brewingMethod,
};

const finishFields = {
  liquorColor,
  mouthfeel,
  energyEffect,
  ratings,
  noteColor,
  freeText,
};

const showExtraBasics = ref(false);
const showExtraBrew = ref(false);
const skippedBasics = ref<Record<OptionalBasicField, boolean>>(createSkippedBasicsState());
const skippedBrew = ref<Record<OptionalBrewField, boolean>>(createSkippedBrewState());

const selectedLimit = 12;
const activeFamilyId = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const expandingNodeId = ref<string | null>(null);
const selectedDescriptorIds = ref<string[]>([]);

const descriptorState = {
  selectedDescriptorIds,
  activeFamilyId,
  activeGroupId,
  expandingNodeId,
};

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
const editingNoteId = computed(() => String(route.params.noteId ?? '').trim());
const isEditing = computed(() => Boolean(editingNoteId.value));

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

function applyNoteRecord(note: NoteRecord) {
  draftNoteId.value = note.id || crypto.randomUUID();
  sessionTitle.value = note.sessionTitle ?? '';
  teaName.value = note.teaName ?? '';
  teaType.value = note.teaType ?? '';
  region.value = note.region ?? '';
  originDetail.value = note.originDetail ?? '';
  cultivar.value = note.cultivar ?? '';
  source.value = note.source ?? '';
  processingStyle.value = note.processingStyle ?? '';
  harvestSeason.value = note.harvestSeason ?? '';
  harvestYear.value = note.harvestYear ?? null;
  brewingMode.value = note.brewingMode ?? 'gongfu';
  brewingMethod.value = note.brewingMethod ?? '';
  waterSource.value = note.waterSource ?? '';
  setupId.value = note.setupId ?? '';
  leafGrams.value = note.leafGrams ?? null;
  waterTemp.value = note.waterTemp ?? null;
  waterVolumeMl.value = note.waterVolumeMl ?? null;
  rinseCount.value = note.rinseCount ?? null;
  infusionsCount.value = note.infusionsCount ?? null;
  timeValue.value = note.timeValue ?? null;
  liquorColor.value = note.liquorColor ?? '';
  mouthfeel.value = note.mouthfeel ?? '';
  energyEffect.value = note.energyEffect ?? '';
  noteColor.value = note.noteColor ?? '';
  freeText.value = note.freeText ?? '';
  selectedDescriptorIds.value = [...(note.descriptors ?? [])];
  ratings.value = {
    aroma: note.ratings.aroma ?? 0,
    taste: note.ratings.taste ?? 0,
    aftertaste: note.ratings.aftertaste ?? 0,
    balance: note.ratings.balance ?? 0,
  };
  for (const key of Object.keys(skippedBasics.value) as OptionalBasicField[]) {
    skippedBasics.value[key] = Boolean(note.skippedFields?.includes(key));
  }
  for (const key of Object.keys(skippedBrew.value) as OptionalBrewField[]) {
    skippedBrew.value[key] = Boolean(note.skippedFields?.includes(key));
  }
  showExtraBasics.value = skippedBasicFields.value.length > 0 || Boolean(originDetail.value || cultivar.value || source.value || processingStyle.value || harvestSeason.value || harvestYear.value);
  showExtraBrew.value = skippedBrewFields.value.length > 0 || Boolean(waterSource.value || rinseCount.value !== null || infusionsCount.value !== null || brewingMethod.value);
}

function buildPayload(): NoteRecord {
  return {
    id: draftNoteId.value,
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
    setupSummary: buildSetupSummary(setups.value, setupId.value),
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
    noteColor: noteColor.value,
    freeText: freeText.value,
    ratings: { ...ratings.value },
    updatedAt: new Date().toISOString(),
  };
}

function validateStep(targetStep = step.value) {
  return getStepValidationError({
    targetStep,
    teaName: teaName.value,
    teaType: teaType.value,
    region: region.value,
    leafGrams: leafGrams.value,
    waterTemp: waterTemp.value,
    timeValue: timeValue.value,
    timeMin: timeMin.value,
    areRatingsComplete: areRatingsComplete.value,
  });
}

onMounted(async () => {
  setups.value = listSetups();
  if (isEditing.value) {
    const note = await ensureNoteAvailable(editingNoteId.value);
    if (note) {
      applyNoteRecord(note);
      formNotice.value = 'Открыта существующая заметка для редактирования.';
    }
    return;
  }
  if (route.query.fresh === '1') {
    discardDraft();
    return;
  }
  const draft = getLatestDraft();
  if (draft) {
    applyNoteRecord(draft);
    formNotice.value = 'Черновик восстановлен. Можно продолжить запись или сохранить итоговую заметку.';
  }
});

function nextStep() {
  const error = validateStep(step.value);
  if (error) {
    stepError.value = error;
    return;
  }
  stepError.value = '';
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
  const payload = saveDraftRecord(buildPayload());
  draftNoteId.value = payload.id;
  formNotice.value = 'Черновик сохранён локально. Он не попадёт в журнал, пока ты не завершишь заметку.';
  stepError.value = '';
}

function finish() {
  const error = validateStep(4);
  if (error) {
    stepError.value = error;
    return;
  }
  const saved = publishNote(buildPayload());
  discardDraft(saved.id);
  stepError.value = '';
  router.push(`/app/notes/${saved.id}`);
}

function goBack() {
  if (isEditing.value) {
    router.push(`/app/notes/${editingNoteId.value}`);
    return;
  }
  router.push('/app/notes');
}
</script>

<template>
  <main class="page">
    <header class="header">
      <div>
        <h1>{{ isEditing ? 'Редактирование заметки' : 'Новая заметка' }}</h1>
        <p class="subtitle">Шаг {{ step }} из 4</p>
      </div>
      <button class="btn btn-ghost" @click="goBack">К заметкам</button>
    </header>

    <section class="progress">
      <div v-for="n in 4" :key="n" class="dot" :class="{ active: n <= step }" />
    </section>

    <p v-if="formNotice" class="notice">{{ formNotice }}</p>
    <p v-if="stepError" class="error-banner">{{ stepError }}</p>

    <section class="card">
      <NoteBasicsStep
        v-if="step === 1"
        :step-intro-copy="stepIntroCopy"
        :fields="basicFields"
        :basics-expanded="basicsExpanded"
        :skipped-basics="skippedBasics"
        :tea-type-options="teaTypeOptions"
        :region-suggestions="regionSuggestions"
        :origin-suggestions="originSuggestions"
        :cultivar-suggestions="cultivarSuggestions"
        :source-options="sourceOptions"
        :processing-style-options="processingStyleOptions"
        :toggle-extra-basics="() => (showExtraBasics = !showExtraBasics)"
        :set-basic-field-skipped="setBasicFieldSkipped"
      />

      <NoteBrewStep
        v-else-if="step === 2"
        :step-intro-copy="stepIntroCopy"
        :fields="brewFields"
        :time-label="timeLabel"
        :time-unit="timeUnit"
        :time-min="timeMin"
        :time-max="timeMax"
        :brew-expanded="brewExpanded"
        :skipped-brew="skippedBrew"
        :water-source-options="waterSourceOptions"
        :toggle-extra-brew="() => (showExtraBrew = !showExtraBrew)"
        :set-brew-field-skipped="setBrewFieldSkipped"
      />

      <NoteDescriptorsStep
        v-else-if="step === 3"
        :state="descriptorState"
        :wheel-descriptors="wheelDescriptors"
        :wheel-center-label="wheelCenterLabel"
        :wheel-center-sub-label="wheelCenterSubLabel"
        :descriptor-depth="descriptorDepth"
        :preview-subcategories="previewSubcategories"
        :descriptor-breadcrumb="descriptorBreadcrumb"
        :selected-descriptors="selectedDescriptors"
        :selected-limit="selectedLimit"
        :toggle-descriptor="toggleDescriptor"
        :go-descriptor-back="goDescriptorBack"
        :clear-selected-descriptors="clearSelectedDescriptors"
        :remove-selected-descriptor="removeSelectedDescriptor"
      />

      <NoteFinishStep
        v-else
        :step-intro-copy="stepIntroCopy"
        :fields="finishFields"
        :ratings-average="ratingsAverage"
        :note-color-options="noteColorOptions"
        :set-rating="setRating"
      />
    </section>

    <footer class="footer">
      <button class="btn btn-ghost" :disabled="step === 1" @click="prevStep">Назад</button>
      <div class="right-actions">
        <button class="btn btn-ghost" @click="saveDraft">Сохранить черновик</button>
        <button v-if="step < 4" class="btn btn-primary" @click="nextStep">Далее</button>
        <button v-else class="btn btn-primary" @click="finish">{{ isEditing ? 'Сохранить изменения' : 'Сохранить заметку' }}</button>
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

.notice,
.error-banner {
  max-width: 1080px;
  margin: 0 auto 12px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.notice {
  border: 1px solid #dbe8d7;
  background: #f7fbf5;
  color: #47634c;
}

.error-banner {
  border: 1px solid #f0c8cf;
  background: #fff7f8;
  color: #8d2f40;
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

.note-color-panel {
  align-content: start;
}

.color-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.color-chip {
  border: 1px solid #d7e5d2;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
  color: #35513a;
}

.color-chip.active {
  border-color: #2f7b3d;
  box-shadow: inset 0 0 0 1px #2f7b3d;
}

.color-chip-swatch {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  flex: 0 0 18px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.65), 0 0 0 1px rgba(73,101,79,0.14);
}

.color-chip.empty .color-chip-swatch {
  background: linear-gradient(135deg, #eef4ea 0%, #d9e6d5 100%);
}

.color-chip-label {
  font-size: 13px;
  font-weight: 600;
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
  .color-picker,
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
