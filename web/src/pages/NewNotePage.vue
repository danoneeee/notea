<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
  countrySuggestions,
  getOriginRegionOptions,
  getStepValidationError,
  isKnownCountry,
  isKnownRegionForCountry,
  readStoredDraftNoteId,
  type OptionalBasicField,
  type OptionalBrewField,
  teaTypeOptions,
  waterSourceOptions,
} from '../services/noteForm';
import { noteColorOptions } from '../services/noteColors';
import { normalizeTeaOrigin } from '../services/originNormalization';
import { hydrateSetupsFromRemote, listSetups, type TeaSetup } from '../services/setups';

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
const country = ref('');
const originRegion = ref('');
const harvestSeason = ref('');
const harvestYear = ref<number | null>(null);
const passportNotes = ref('');

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
const isFavorite = ref(false);
const cupProfileNotes = ref('');
const createdAt = ref('');

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
  country,
  originRegion,
  harvestSeason,
  harvestYear,
  passportNotes,
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
  isFavorite,
  cupProfileNotes,
};

const showExtraBasics = ref(false);
const showExtraBrew = ref(false);
const showStepValidation = ref(false);
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
const originRegionSuggestions = computed(() => getOriginRegionOptions(country.value));
const basicInvalidFields = computed(() => {
  if (!showStepValidation.value || step.value !== 1) {
    return { sessionTitle: false, teaName: false, teaType: false };
  }
  return {
    sessionTitle: !sessionTitle.value.trim(),
    teaName: !teaName.value.trim(),
    teaType: !teaType.value.trim(),
  };
});
const basicOptionalInvalidFields = computed(() => {
  if (!showStepValidation.value || step.value !== 1 || !showExtraBasics.value) {
    return {
      country: false,
      originRegion: false,
      harvestSeason: false,
      harvestYear: false,
      notes: false,
    };
  }
  return {
    country: !skippedBasics.value.country && !isKnownCountry(country.value),
    originRegion: !skippedBasics.value.originRegion && !isKnownRegionForCountry(country.value, originRegion.value),
    harvestSeason: !skippedBasics.value.harvestSeason && !harvestSeason.value.trim(),
    harvestYear: !skippedBasics.value.harvestYear && harvestYear.value === null,
    notes: !skippedBasics.value.notes && !passportNotes.value.trim(),
  };
});
const brewInvalidFields = computed(() => {
  if (!showStepValidation.value || step.value !== 2) {
    return { leafGrams: false, waterTemp: false, timeValue: false };
  }
  return {
    leafGrams: leafGrams.value === null || leafGrams.value <= 0,
    waterTemp: waterTemp.value === null || waterTemp.value <= 0,
    timeValue: timeValue.value === null || timeValue.value < timeMin.value,
  };
});
const brewOptionalInvalidFields = computed(() => {
  if (!showStepValidation.value || step.value !== 2 || !showExtraBrew.value) {
    return { waterSource: false, rinseCount: false, infusionsCount: false, brewingMethod: false };
  }
  return {
    waterSource: !skippedBrew.value.waterSource && !waterSource.value.trim(),
    rinseCount: !skippedBrew.value.rinseCount && rinseCount.value === null,
    infusionsCount: false,
    brewingMethod: !skippedBrew.value.brewingMethod && !brewingMethod.value.trim(),
  };
});
const finishInvalidFields = computed(() => {
  if (!showStepValidation.value || step.value !== 4) {
    return { ratings: false, liquorColor: false, mouthfeel: false, energyEffect: false };
  }
  return {
    ratings: !areRatingsComplete.value,
    liquorColor: !liquorColor.value.trim(),
    mouthfeel: !mouthfeel.value.trim(),
    energyEffect: !energyEffect.value.trim(),
  };
});
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
    return 'Заполни то, что знаешь наверняка: название и тип. Остальные детали можно добавить по желанию.';
  }
  if (step.value === 2) {
    return 'Для заметки достаточно базовых параметров. Если хочешь сохранить точнее, ниже есть опциональные поля про воду, промывку и число проливов.';
  }
  if (step.value === 3) {
    return 'Сначала выбери большое семейство, потом сузь поиск до подгруппы, а затем раскрой круг ещё сильнее, чтобы поймать точную ноту.';
  }
  return 'Сначала поставь обязательные оценки по звёздам, а затем добавь отдельную заметку к профилю чашки и финальным ощущениям.';
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
  const normalizedOrigin = normalizeTeaOrigin(note.country, note.originRegion, note.region);
  draftNoteId.value = note.id || crypto.randomUUID();
  sessionTitle.value = note.sessionTitle ?? '';
  teaName.value = note.teaName ?? '';
  teaType.value = note.teaType ?? '';
  country.value = normalizedOrigin.country;
  originRegion.value = normalizedOrigin.originRegion;
  harvestSeason.value = note.harvestSeason ?? '';
  harvestYear.value = note.harvestYear ?? null;
  passportNotes.value = note.passportNotes ?? '';
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
  isFavorite.value = note.isFavorite ?? false;
  cupProfileNotes.value = note.cupProfileNotes ?? note.freeText ?? '';
  createdAt.value = note.createdAt ?? note.updatedAt ?? '';
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
  showExtraBasics.value = skippedBasicFields.value.length > 0 || Boolean(country.value || originRegion.value || harvestSeason.value || harvestYear.value || passportNotes.value);
  showExtraBrew.value = skippedBrewFields.value.length > 0 || Boolean(waterSource.value || rinseCount.value !== null || infusionsCount.value !== null || brewingMethod.value);
}

function buildPayload(): NoteRecord {
  const normalizedOrigin = normalizeTeaOrigin(country.value, originRegion.value);
  const now = new Date().toISOString();
  return {
    id: draftNoteId.value,
    sessionTitle: sessionTitle.value,
    teaName: teaName.value,
    teaType: teaType.value,
    country: normalizedOrigin.country,
    originRegion: normalizedOrigin.originRegion,
    region: normalizedOrigin.region,
    harvestSeason: harvestSeason.value,
    harvestYear: harvestYear.value,
    passportNotes: passportNotes.value,
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
    isFavorite: isFavorite.value,
    cupProfileNotes: cupProfileNotes.value,
    freeText: cupProfileNotes.value,
    ratings: { ...ratings.value },
    createdAt: createdAt.value || now,
    updatedAt: now,
  };
}

function validateStep(targetStep = step.value) {
  return getStepValidationError({
    targetStep,
    sessionTitle: sessionTitle.value,
    teaName: teaName.value,
    teaType: teaType.value,
    country: country.value,
    originRegion: originRegion.value,
    leafGrams: leafGrams.value,
    waterTemp: waterTemp.value,
    timeValue: timeValue.value,
    timeMin: timeMin.value,
    areRatingsComplete: areRatingsComplete.value,
    liquorColor: liquorColor.value,
    mouthfeel: mouthfeel.value,
    energyEffect: energyEffect.value,
  });
}

function getOptionalStepValidationError(targetStep = step.value) {
  if (targetStep === 1 && showExtraBasics.value) {
    const hasUnfilledOptionalBasics =
      (!skippedBasics.value.country && !isKnownCountry(country.value)) ||
      (!skippedBasics.value.originRegion && !isKnownRegionForCountry(country.value, originRegion.value)) ||
      (!skippedBasics.value.harvestSeason && !harvestSeason.value.trim()) ||
      (!skippedBasics.value.harvestYear && harvestYear.value === null) ||
      (!skippedBasics.value.notes && !passportNotes.value.trim());
    if (hasUnfilledOptionalBasics) {
      return 'Заполни раскрытые опциональные поля или отметь их как «Не указываю».';
    }
  }
  if (targetStep === 2 && showExtraBrew.value) {
    const hasUnfilledOptionalBrew =
      (!skippedBrew.value.waterSource && !waterSource.value.trim()) ||
      (!skippedBrew.value.rinseCount && rinseCount.value === null) ||
      (!skippedBrew.value.brewingMethod && !brewingMethod.value.trim());
    if (hasUnfilledOptionalBrew) {
      return 'Заполни раскрытые опциональные поля или отметь их как «Не указываю».';
    }
  }
  return '';
}

onMounted(async () => {
  setups.value = listSetups();
  try {
    setups.value = await hydrateSetupsFromRemote();
  } catch {
    setups.value = listSetups();
  }
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

watch(country, (value) => {
  const options = getOriginRegionOptions(value);
  if (!options.includes(originRegion.value)) {
    originRegion.value = '';
  }
});

function nextStep() {
  showStepValidation.value = true;
  const error = validateStep(step.value);
  if (error) {
    stepError.value = error;
    return;
  }
  const optionalError = getOptionalStepValidationError(step.value);
  if (optionalError) {
    stepError.value = optionalError;
    return;
  }
  showStepValidation.value = false;
  stepError.value = '';
  if (step.value < 4) step.value += 1;
}

function prevStep() {
  showStepValidation.value = false;
  if (step.value > 1) step.value -= 1;
}

function setRating(key: keyof typeof ratings.value, value: number) {
  ratings.value[key] = value;
}

function clearOptionalBasicValue(field: OptionalBasicField) {
  if (field === 'country') {
    country.value = '';
    originRegion.value = '';
  }
  if (field === 'originRegion') originRegion.value = '';
  if (field === 'harvestSeason') harvestSeason.value = '';
  if (field === 'harvestYear') harvestYear.value = null;
  if (field === 'notes') passportNotes.value = '';
}

function setBasicFieldSkipped(field: OptionalBasicField, skipped: boolean) {
  skippedBasics.value[field] = skipped;
  if (field === 'country' && skipped) {
    skippedBasics.value.originRegion = true;
  }
  if (field === 'country' && !skipped) {
    skippedBasics.value.originRegion = false;
  }
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
  showStepValidation.value = false;
  stepError.value = '';
}

function finish() {
  const error = validateStep(4);
  if (error) {
    showStepValidation.value = true;
    stepError.value = error;
    return;
  }
  showStepValidation.value = false;
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
        v-model:basicsExpanded="showExtraBasics"
        :step-intro-copy="stepIntroCopy"
        :fields="basicFields"
        :skipped-basics="skippedBasics"
        :invalid-fields="basicInvalidFields"
        :optional-invalid-fields="basicOptionalInvalidFields"
        :tea-type-options="teaTypeOptions"
        :country-suggestions="countrySuggestions"
        :origin-region-suggestions="originRegionSuggestions"
        :set-basic-field-skipped="setBasicFieldSkipped"
      />

      <NoteBrewStep
        v-else-if="step === 2"
        v-model:brewExpanded="showExtraBrew"
        :step-intro-copy="stepIntroCopy"
        :fields="brewFields"
        :time-label="timeLabel"
        :time-unit="timeUnit"
        :time-min="timeMin"
        :time-max="timeMax"
        :skipped-brew="skippedBrew"
        :invalid-fields="brewInvalidFields"
        :optional-invalid-fields="brewOptionalInvalidFields"
        :water-source-options="waterSourceOptions"
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
        :invalid-fields="finishInvalidFields"
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

@media (max-width: 860px) {
  .page {
    padding: 16px;
  }
}
</style>
