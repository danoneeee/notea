<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { descriptorWheelFamilies } from '../data/descriptors';
import { listNotes, notesRevision } from '../services/notes';
import { listSetups } from '../services/setups';

const ChinaTeaMap = defineAsyncComponent(() => import('../components/ChinaTeaMap.vue'));

const notes = computed(() => {
  notesRevision.value;
  return listNotes();
});

const activeSection = ref<'overview' | 'map' | 'passport' | 'brewing' | 'profile'>('overview');

const selectedTeaType = ref('');
const selectedRegion = ref('');
const selectedBrewingMode = ref('');
const selectedSource = ref('');

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
}

const teaTypeOptions = computed(() => uniqueOptions(notes.value.map((note) => note.teaType)));
const regionOptions = computed(() => uniqueOptions(notes.value.map((note) => note.region)));
const brewingModeOptions = computed(() => uniqueOptions(notes.value.map((note) => note.brewingMode)));
const sourceOptions = computed(() => uniqueOptions(notes.value.map((note) => note.source)));

const filteredNotes = computed(() =>
  notes.value.filter((note) => {
    if (selectedTeaType.value && note.teaType.trim() !== selectedTeaType.value) return false;
    if (selectedRegion.value && note.region.trim() !== selectedRegion.value) return false;
    if (selectedBrewingMode.value && note.brewingMode !== selectedBrewingMode.value) return false;
    if (selectedSource.value && (note.source?.trim() ?? '') !== selectedSource.value) return false;
    return true;
  }),
);

const totalNotes = computed(() => filteredNotes.value.length);

const provinceStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    const province = note.region.trim() || 'Не указан';
    map.set(province, (map.get(province) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

const uniqueRegions = computed(() => provinceStats.value.filter(([region]) => region !== 'Не указан').length);

const topProvince = computed(() => provinceStats.value[0] ?? null);
const topProvinceCards = computed(() => {
  const total = totalNotes.value || 1;
  return provinceStats.value
    .filter(([province]) => province !== 'Не указан')
    .slice(0, 4)
    .map(([province, count], index) => ({
      province,
      count,
      rank: index + 1,
      percent: Math.round((count / total) * 100),
    }));
});

const teaTypeStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    const teaType = note.teaType.trim() || 'Не указан';
    map.set(teaType, (map.get(teaType) ?? 0) + 1);
  }
  const total = filteredNotes.value.length || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }));
});

const topTeaType = computed(() => teaTypeStats.value[0] ?? null);

const brewingModeLabels: Record<string, string> = {
  gongfu: 'Гунфу / проливы',
  steep: 'Настой',
  coldbrew: 'Cold brew',
};
const brewingModeColors: Record<string, string> = {
  gongfu: '#2f7b3d',
  steep: '#7cae58',
  coldbrew: '#5c9db7',
};

const mouthfeelLabels: Record<string, string> = {
  airy: 'Воздушное',
  silky: 'Шелковистое',
  juicy: 'Сочное',
  oily: 'Маслянистое',
  dense: 'Плотное',
  drying: 'Подсушивающее',
};

const energyLabels: Record<string, string> = {
  quiet: 'Спокойное',
  warm: 'Тёплое',
  focused: 'Собранное',
  uplifting: 'Поднимающее',
  strong: 'Сильное',
};

const liquorColorLabels: Record<string, string> = {
  'very-light': 'Очень светлый',
  gold: 'Золотистый',
  amber: 'Янтарный',
  orange: 'Оранжево-медный',
  'red-brown': 'Красно-коричневый',
  dark: 'Тёмный',
};

const harvestSeasonLabels: Record<string, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
};

type CountStat = { key: string; label: string; count: number };
type RegionRatingStat = { region: string; count: number; average: number; percent: number };

function countStats(values: Array<string | null | undefined>, options?: { labelMap?: Record<string, string>; excludeEmpty?: boolean; limit?: number }) {
  const map = new Map<string, number>();
  for (const raw of values) {
    const value = String(raw ?? '').trim();
    if (!value && options?.excludeEmpty) continue;
    const key = value || 'Не указано';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  let entries = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      label: options?.labelMap?.[key] ?? key,
      count,
    }));
  if (options?.limit) entries = entries.slice(0, options.limit);
  return entries;
}

function averageStat(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

const descriptorMetaById = Object.fromEntries(
  descriptorWheelFamilies.map((item) => [item.id, { label: item.label, color: item.color }]),
);

const descriptorStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    for (const descriptor of note.descriptors) {
      const family = descriptor.split(':')[0];
      map.set(family, (map.get(family) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      label: descriptorMetaById[id]?.label ?? id,
      color: descriptorMetaById[id]?.color ?? '#d9e5d6',
      count,
    }));
});

const notesWithDescriptors = computed(() => filteredNotes.value.filter((note) => note.descriptors.length > 0).length);
const descriptorCoverage = computed(() => (totalNotes.value ? Math.round((notesWithDescriptors.value / totalNotes.value) * 100) : 0));
const topDescriptor = computed(() => descriptorStats.value[0] ?? null);
const namedSessions = computed(() => filteredNotes.value.filter((note) => note.sessionTitle?.trim()).length);
const namedSessionsPercent = computed(() => (totalNotes.value ? Math.round((namedSessions.value / totalNotes.value) * 100) : 0));
const uniqueTeaTypes = computed(() => new Set(filteredNotes.value.map((note) => note.teaType.trim() || 'Не указан')).size);
const journalSpanDays = computed(() => {
  if (!filteredNotes.value.length) return null;
  const timestamps = filteredNotes.value.map((note) => new Date(note.updatedAt).getTime());
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
});

const brewingModeStats = computed(() =>
  countStats(
    filteredNotes.value.map((note) => note.brewingMode),
    { labelMap: brewingModeLabels },
  ).map((item) => ({
    ...item,
    percent: totalNotes.value ? Math.round((item.count / totalNotes.value) * 100) : 0,
    color: brewingModeColors[item.key] ?? '#4f975c',
  })),
);
const topBrewingMode = computed(() => brewingModeStats.value[0] ?? null);
const setupNameById = computed(() => Object.fromEntries(listSetups().map((setup) => [setup.id, setup.name])));

const setupStats = computed(
  () =>
    countStats(
      filteredNotes.value.map((note) => {
        if (note.setupId) return setupNameById.value[note.setupId] ?? 'Сетап без названия';
        return '';
      }),
      { excludeEmpty: true, limit: 4 },
    ),
);
const waterSourceStats = computed(() => countStats(filteredNotes.value.map((note) => note.waterSource), { excludeEmpty: true, limit: 4 }));
const mouthfeelStats = computed(() => countStats(filteredNotes.value.map((note) => note.mouthfeel), { labelMap: mouthfeelLabels, excludeEmpty: true, limit: 4 }));
const energyStats = computed(() => countStats(filteredNotes.value.map((note) => note.energyEffect), { labelMap: energyLabels, excludeEmpty: true, limit: 4 }));
const liquorColorStats = computed(() => countStats(filteredNotes.value.map((note) => note.liquorColor), { labelMap: liquorColorLabels, excludeEmpty: true, limit: 4 }));
const sourceStats = computed(() => countStats(filteredNotes.value.map((note) => note.source), { excludeEmpty: true, limit: 4 }));
const processingStyleStats = computed(() => countStats(filteredNotes.value.map((note) => note.processingStyle), { excludeEmpty: true, limit: 4 }));
const harvestSeasonStats = computed(() => countStats(filteredNotes.value.map((note) => note.harvestSeason), { labelMap: harvestSeasonLabels, excludeEmpty: true, limit: 4 }));
const cultivarStats = computed(() => countStats(filteredNotes.value.map((note) => note.cultivar), { excludeEmpty: true, limit: 4 }));
const avgWaterTemp = computed(() => averageStat(filteredNotes.value.map((note) => note.waterTemp)));
const avgLeafGrams = computed(() => averageStat(filteredNotes.value.map((note) => note.leafGrams)));
const avgInfusions = computed(() => averageStat(filteredNotes.value.map((note) => note.infusionsCount)));
const avgWaterVolume = computed(() => averageStat(filteredNotes.value.map((note) => note.waterVolumeMl)));
const avgRinseCount = computed(() => averageStat(filteredNotes.value.map((note) => note.rinseCount)));
const originDetailCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => Boolean(note.originDetail?.trim())).length / totalNotes.value) * 100) : 0),
);
const sourceCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => Boolean(note.source?.trim())).length / totalNotes.value) * 100) : 0),
);
const waterSourceCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => Boolean(note.waterSource?.trim())).length / totalNotes.value) * 100) : 0),
);
const rinseCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => typeof note.rinseCount === 'number').length / totalNotes.value) * 100) : 0),
);
const infusionsCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => typeof note.infusionsCount === 'number').length / totalNotes.value) * 100) : 0),
);
const brewingMethodCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => Boolean(note.brewingMethod.trim())).length / totalNotes.value) * 100) : 0),
);
const topSource = computed(() => sourceStats.value[0]?.label ?? '—');
const topSetup = computed(() => setupStats.value[0]?.label ?? '—');
const topWaterSource = computed(() => waterSourceStats.value[0]?.label ?? '—');
const exactOriginStats = computed(() => {
  const map = new Map<string, { region: string; origin: string; count: number }>();
  for (const note of filteredNotes.value) {
    const region = note.region.trim();
    const origin = note.originDetail?.trim() ?? '';
    if (!region || !origin) continue;
    const key = `${region}::${origin}`;
    const current = map.get(key);
    if (current) current.count += 1;
    else map.set(key, { region, origin, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
});
const harvestYearSummary = computed(() => {
  const values = filteredNotes.value
    .map((note) => note.harvestYear)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) return null;
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return {
    average,
    freshest: Math.max(...values),
    oldest: Math.min(...values),
  };
});

function buildRegionRatingStats(metric: keyof typeof filteredNotes.value[number]['ratings']): RegionRatingStat[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const note of filteredNotes.value) {
    const region = note.region.trim();
    if (!region) continue;
    const current = map.get(region) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += note.ratings[metric];
    map.set(region, current);
  }
  return [...map.entries()]
    .map(([region, stats]) => ({
      region,
      count: stats.count,
      average: stats.total / stats.count,
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 4)
    .map((item) => ({
      ...item,
      percent: Math.round((item.average / 5) * 100),
    }));
}

const regionAromaStats = computed(() => buildRegionRatingStats('aroma'));
const regionTasteStats = computed(() => buildRegionRatingStats('taste'));
const regionAftertasteStats = computed(() => buildRegionRatingStats('aftertaste'));
const regionBalanceStats = computed(() => buildRegionRatingStats('balance'));
const regionRatingCards = computed(() => [
  {
    key: 'aroma',
    title: 'Аромат по регионам',
    copy: 'Где чаще всего попадаются самые выразительные ароматы.',
    items: regionAromaStats.value,
  },
  {
    key: 'taste',
    title: 'Вкус по регионам',
    copy: 'Рейтинг регионов по средней силе вкуса в заметках.',
    items: regionTasteStats.value,
  },
  {
    key: 'aftertaste',
    title: 'Послевкусие по регионам',
    copy: 'Какие регионы чаще оставляют самый длинный и приятный хвост.',
    items: regionAftertasteStats.value,
  },
  {
    key: 'balance',
    title: 'Баланс по регионам',
    copy: 'Насколько гармоничными в среднем оказываются чаи из региона.',
    items: regionBalanceStats.value,
  },
]);
const regionDescriptorProfiles = computed(() =>
  provinceStats.value
    .filter(([region]) => region !== 'Не указан')
    .slice(0, 4)
    .map(([region, notesCount]) => {
      const familyCounts = new Map<string, number>();
      let notesWithDescriptorsCount = 0;
      for (const note of filteredNotes.value) {
        if ((note.region.trim() || 'Не указан') !== region) continue;
        if (!note.descriptors.length) continue;
        notesWithDescriptorsCount += 1;
        for (const descriptor of note.descriptors) {
          const family = descriptor.split(':')[0];
          familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
        }
      }
      const topDescriptors = [...familyCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => ({
          id,
          label: descriptorMetaById[id]?.label ?? id,
          color: descriptorMetaById[id]?.color ?? '#d9e5d6',
        }));
      return {
        region,
        notesCount,
        notesWithDescriptorsCount,
        topDescriptors,
      };
    }),
);

const passportRichNotes = computed(
  () =>
    filteredNotes.value.filter((note) => {
      const filled = [note.originDetail, note.cultivar, note.source, note.processingStyle, note.harvestSeason, note.harvestYear]
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length;
      return filled >= 3;
    }).length,
);
const passportRichPercent = computed(() => (totalNotes.value ? Math.round((passportRichNotes.value / totalNotes.value) * 100) : 0));
const setupCoverage = computed(
  () => (totalNotes.value ? Math.round((filteredNotes.value.filter((note) => note.setupSummary.trim()).length / totalNotes.value) * 100) : 0),
);
const cupProfileCoverage = computed(
  () =>
    (totalNotes.value
      ? Math.round(
          (
            filteredNotes.value.filter((note) => Boolean(note.liquorColor || note.mouthfeel || note.energyEffect)).length / totalNotes.value
          ) * 100,
        )
      : 0),
);

function clearFilters() {
  selectedTeaType.value = '';
  selectedRegion.value = '';
  selectedBrewingMode.value = '';
  selectedSource.value = '';
}
</script>

<template>
  <section class="card">
    <div class="hero">
      <div>
        <h2>Аналитика</h2>
        <p class="lead">Раздел разбит по критериям: обзор записей, география происхождения и вкусовой профиль.</p>
      </div>
    </div>

    <div v-if="notes.length === 0" class="empty">
      Добавь несколько заметок, и здесь появятся личные графики и карта провинций.
    </div>
    <template v-else>
      <section class="filters">
        <div class="criteria-head">
          <h3>Фильтры</h3>
          <p>Выбери срез, чтобы посмотреть более точную аналитику по типу чая, региону, режиму заваривания или источнику.</p>
        </div>
        <div class="filter-grid">
          <label class="filter-field">
            <span>Тип чая</span>
            <select v-model="selectedTeaType">
              <option value="">Все типы</option>
              <option v-for="option in teaTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>Регион</span>
            <select v-model="selectedRegion">
              <option value="">Все регионы</option>
              <option v-for="option in regionOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>Режим</span>
            <select v-model="selectedBrewingMode">
              <option value="">Все режимы</option>
              <option v-for="option in brewingModeOptions" :key="option" :value="option">{{ brewingModeLabels[option] ?? option }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>Источник</span>
            <select v-model="selectedSource">
              <option value="">Любой источник</option>
              <option v-for="option in sourceOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
        <div class="filter-footer">
          <span class="filter-meta">В выборке: {{ totalNotes }} заметок</span>
          <button type="button" class="clear-btn" @click="clearFilters">Сбросить фильтры</button>
        </div>
      </section>

      <div v-if="filteredNotes.length === 0" class="empty">
        По текущим фильтрам заметок не найдено. Попробуй снять часть ограничений.
      </div>
      <template v-else>
      <div class="analytics-layout">
        <aside class="section-sidebar" aria-label="Навигация по аналитике">
          <nav class="section-nav">
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'overview' }"
              @click="activeSection = 'overview'"
            >
              Обзор
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'map' }"
              @click="activeSection = 'map'"
            >
              География
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'passport' }"
              @click="activeSection = 'passport'"
            >
              Паспорт партии
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'brewing' }"
              @click="activeSection = 'brewing'"
            >
              Заваривание
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'profile' }"
              @click="activeSection = 'profile'"
            >
              Вкусовой профиль
            </button>
          </nav>
        </aside>
        <div class="analytics-main">
          <section
            id="analytics-overview"
            v-if="activeSection === 'overview'"
            class="criteria-block overview-section"
          >
            <div class="criteria-head">
              <h3>Обзор записей</h3>
              <p>Базовые ориентиры по объёму заметок, регионам и типам чая.</p>
            </div>
            <div class="stats">
              <article class="stat-box">
                <span class="stat-value">{{ totalNotes }}</span>
                <span class="stat-label">всего заметок в срезе</span>
              </article>
              <article class="stat-box">
                <span class="stat-value">{{ uniqueTeaTypes }}</span>
                <span class="stat-label">типов чая</span>
              </article>
              <article class="stat-box">
                <span class="stat-value">{{ uniqueRegions }}</span>
                <span class="stat-label">регионов в заметках</span>
              </article>
              <article class="stat-box">
                <span class="stat-value">{{ journalSpanDays ?? '—' }}</span>
                <span class="stat-label">дней истории записей</span>
              </article>
            </div>
            <div class="analytics-divider" aria-hidden="true">
              <span />
            </div>
            <div class="overview-grid">
              <article class="box insight-box">
                <div class="section-head compact">
                  <div>
                    <h3>Портрет коллекции</h3>
                    <p class="section-copy">Что сильнее всего описывает текущую подборку заметок.</p>
                  </div>
                </div>
                <ul class="insight-list">
                  <li>
                    <span class="insight-label">Доминирующий тип</span>
                    <strong>{{ topTeaType?.label ?? '—' }}</strong>
                  </li>
                  <li>
                    <span class="insight-label">Главный регион</span>
                    <strong>{{ topProvince?.[0] ?? '—' }}</strong>
                  </li>
                  <li>
                    <span class="insight-label">Основной режим</span>
                    <strong>{{ topBrewingMode?.label ?? '—' }}</strong>
                  </li>
                  <li>
                    <span class="insight-label">Ведущий дескриптор</span>
                    <strong class="insight-strong">
                      <span v-if="topDescriptor" class="descriptor-dot" :style="{ background: topDescriptor.color }" />
                      {{ topDescriptor?.label ?? '—' }}
                    </strong>
                  </li>
                </ul>
              </article>

              <article class="box insight-box">
                <div class="section-head compact">
                  <div>
                    <h3>Качество записи</h3>
                    <p class="section-copy">Насколько подробно обычно заполнены заметки.</p>
                  </div>
                </div>
                <ul class="insight-list">
                  <li>
                    <span class="insight-label">Сессий с названием</span>
                    <strong>{{ namedSessionsPercent }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Подробный паспорт партии</span>
                    <strong>{{ passportRichPercent }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Заметок с сетапом</span>
                    <strong>{{ setupCoverage }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Чашка и состояние отмечены</span>
                    <strong>{{ cupProfileCoverage }}%</strong>
                  </li>
                </ul>
              </article>
            </div>
          </section>

          <section
            id="analytics-map"
            v-if="activeSection === 'map'"
            class="criteria-block geography-section"
          >
            <div class="criteria-head">
              <h3>География</h3>
              <p>Карта показывает, из каких провинций и регионов чаще всего появляется чай в твоих заметках.</p>
            </div>
            <div class="analytics-grid geography-grid">
              <article class="box map-box geography-map">
                <div class="section-head">
                  <div>
                    <h3>Карта провинций</h3>
                    <p class="section-copy">Наведи на регион, чтобы увидеть плотность заметок по карте.</p>
                  </div>
                  <div class="section-meta">
                    <strong>{{ uniqueRegions }}</strong>
                    <span>регионов отмечено</span>
                  </div>
                </div>
                <div class="map-row">
                  <ChinaTeaMap :province-stats="provinceStats" />
                </div>
              </article>

              <article class="box geography-top-box">
                <div class="section-head compact">
                  <div>
                    <h3>Топ по провинциям</h3>
                    <p class="section-copy">Короткая сводка по регионам, которые чаще всего встречаются в текущем срезе.</p>
                  </div>
                </div>
                <div v-if="topProvinceCards.length" class="province-top-grid">
                  <article v-for="item in topProvinceCards" :key="item.province" class="province-top-card">
                    <span
                      class="province-rank province-rank-badge"
                      :class="`province-rank-badge--${Math.min(item.rank, 4)}`"
                    >
                      {{ item.rank }}
                    </span>
                    <strong>{{ item.province }}</strong>
                    <span class="province-top-meta">{{ item.count }} заметок</span>
                    <span class="province-top-share">{{ item.percent }}% выборки</span>
                  </article>
                </div>
                <p v-else class="mini-empty">Для текущего среза пока нет провинций с заполненными данными.</p>
              </article>

              <div class="analytics-divider" aria-hidden="true">
                <span />
              </div>

              <div class="region-rating-group">
                <article
                  v-for="card in regionRatingCards"
                  :key="card.key"
                  class="box region-rating-metric-box"
                >
                  <div class="section-head compact region-rating-head">
                    <div>
                      <h3>{{ card.title }}</h3>
                      <p class="section-copy">{{ card.copy }}</p>
                    </div>
                  </div>
                  <ol v-if="card.items.length" class="rank-list region-rating-list">
                    <li v-for="item in card.items" :key="item.region">
                      <span class="rank-label">
                        <span class="region-rating-name">{{ item.region }}</span>
                        <span class="region-rating-notes">Средняя оценка</span>
                      </span>
                      <span class="region-rating-meta">
                        <strong>{{ item.average.toFixed(1) }}/5</strong>
                      </span>
                    </li>
                  </ol>
                  <p v-else class="mini-empty">Рейтинг появится, когда в заметках будут оценки и заполненные регионы.</p>
                </article>
              </div>

              <div class="analytics-divider" aria-hidden="true">
                <span />
              </div>

              <article class="box region-descriptor-box">
                <div class="section-head compact">
                  <div>
                    <h3>Регион x дескрипторы</h3>
                    <p class="section-copy">Какие ноты чаще всего звучат у ведущих регионов в твоих заметках.</p>
                  </div>
                </div>
                <div v-if="regionDescriptorProfiles.length" class="region-descriptor-grid">
                  <article
                    v-for="item in regionDescriptorProfiles"
                    :key="item.region"
                    class="region-descriptor-card"
                  >
                    <div class="region-descriptor-head">
                      <strong>{{ item.region }}</strong>
                      <span>{{ item.notesWithDescriptorsCount ? 'Профиль собран' : 'Пока мало дескрипторов' }}</span>
                    </div>
                    <div v-if="item.topDescriptors.length" class="descriptor-pill-list">
                      <span
                        v-for="descriptor in item.topDescriptors"
                        :key="`${item.region}-${descriptor.id}`"
                        class="descriptor-pill"
                      >
                        <span class="descriptor-dot" :style="{ background: descriptor.color }" />
                        <span>{{ descriptor.label }}</span>
                      </span>
                    </div>
                    <p v-else class="mini-empty">У заметок из этого региона пока не хватает отмеченных дескрипторов.</p>
                  </article>
                </div>
                <p v-else class="mini-empty">Блок появится, когда в заметках будут регионы с отмеченными дескрипторами.</p>
              </article>
            </div>
          </section>

          <section
            id="analytics-passport"
            v-if="activeSection === 'passport'"
            class="criteria-block passport-section"
          >
            <div class="criteria-head">
              <h3>Паспорт партии</h3>
              <p>Раздел сейчас в переработке. Хочу собрать его как отдельный «материальный» слой аналитики по происхождению и партии.</p>
            </div>
            <article class="box wip-box">
              <div class="section-head compact">
                <div>
                  <h3>Work in progress</h3>
                  <p class="section-copy">Секция временно скрыта от полноценной аналитики и будет собрана заново.</p>
                </div>
              </div>
            </article>
          </section>

          <section
            id="analytics-brewing"
            v-if="activeSection === 'brewing'"
            class="criteria-block brewing-section"
          >
            <div class="criteria-head">
              <h3>Практика заваривания</h3>
              <p>Раздел про сам ритуал: как ты чаще всего завариваешь, чем пользуешься и насколько подробно фиксируешь процесс.</p>
            </div>
            <div class="analytics-grid brewing-grid">
              <article class="box brewing-mode-box">
                <div class="section-head compact">
                  <div>
                    <h3>Сценарии заваривания</h3>
                    <p class="section-copy">Три главных режима сессий и их реальная доля в твоих заметках.</p>
                  </div>
                </div>
                <div v-if="brewingModeStats.length" class="brew-mode-strip" aria-hidden="true">
                  <span
                    v-for="item in brewingModeStats"
                    :key="`${item.key}-strip`"
                    class="brew-mode-strip-segment"
                    :style="{ width: `${Math.max(item.percent, 12)}%`, background: item.color }"
                  />
                </div>
                <div v-if="brewingModeStats.length" class="brew-mode-card-grid">
                  <article v-for="item in brewingModeStats" :key="item.key" class="brew-mode-card">
                    <span class="brew-mode-dot" :style="{ background: item.color }" />
                    <span class="brew-mode-label">{{ item.label }}</span>
                    <strong>{{ item.percent }}%</strong>
                    <span class="brew-mode-meta">{{ item.count }} сессий</span>
                  </article>
                </div>
                <p v-else class="mini-empty">Режимы появятся, когда в выборке будут заметки по завариванию.</p>
              </article>

              <article class="box detail-box">
                <div class="section-head compact">
                  <div>
                    <h3>Профиль сессии</h3>
                    <p class="section-copy">Средние ориентиры, которые помогают быстро понять твой привычный способ заваривания.</p>
                  </div>
                </div>
                <div class="brew-metric-grid">
                  <article class="mini-card">
                    <span class="mini-label">Температура</span>
                    <strong>{{ avgWaterTemp ? `${avgWaterTemp.toFixed(0)}°C` : '—' }}</strong>
                    <span class="mini-meta">средняя температура воды</span>
                  </article>
                  <article class="mini-card">
                    <span class="mini-label">Навеска</span>
                    <strong>{{ avgLeafGrams ? `${avgLeafGrams.toFixed(1)} г` : '—' }}</strong>
                    <span class="mini-meta">сколько листа обычно берёшь</span>
                  </article>
                  <article class="mini-card">
                    <span class="mini-label">Объём</span>
                    <strong>{{ avgWaterVolume ? `${avgWaterVolume.toFixed(0)} мл` : '—' }}</strong>
                    <span class="mini-meta">средний объём воды в сессии</span>
                  </article>
                  <article class="mini-card">
                    <span class="mini-label">Проливы</span>
                    <strong>{{ avgInfusions ? avgInfusions.toFixed(1) : '—' }}</strong>
                    <span class="mini-meta">среднее число проливов</span>
                  </article>
                </div>
              </article>

              <article class="box insight-box">
                <div class="section-head compact">
                  <div>
                    <h3>Насколько подробно ты фиксируешь процесс</h3>
                    <p class="section-copy">Какие технические детали заваривания реально заполняются в заметках.</p>
                  </div>
                </div>
                <ul class="insight-list">
                  <li>
                    <span class="insight-label">Сетап указан</span>
                    <strong>{{ setupCoverage }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Тип воды указан</span>
                    <strong>{{ waterSourceCoverage }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Промывка указана</span>
                    <strong>{{ rinseCoverage }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Комментарий к сессии</span>
                    <strong>{{ brewingMethodCoverage }}%</strong>
                  </li>
                </ul>
              </article>

              <div class="analytics-divider" aria-hidden="true">
                <span />
              </div>

              <article class="box brewing-setup-box">
                <div class="section-head compact">
                  <div>
                    <h3>Сетапы</h3>
                    <p class="section-copy">Какая посуда и какие комплекты чаще всего становятся основой сессии.</p>
                  </div>
                </div>
                <ul v-if="setupStats.length" class="mini-list">
                  <li v-for="item in setupStats" :key="item.key">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.count }}</strong>
                  </li>
                </ul>
                <p v-else class="mini-empty">В текущем срезе сетапы пока не указаны.</p>
                <div class="brew-metric-grid brew-metric-grid-compact">
                  <article class="mini-card">
                    <span class="mini-label">Сетап-лидер</span>
                    <strong>{{ topSetup }}</strong>
                    <span class="mini-meta">самый частый комплект посуды</span>
                  </article>
                  <article class="mini-card">
                    <span class="mini-label">Сетап указан</span>
                    <strong>{{ setupCoverage }}%</strong>
                    <span class="mini-meta">заметок с выбранной посудой</span>
                  </article>
                </div>
              </article>

              <article class="box brewing-water-box">
                <div class="section-head compact">
                  <div>
                    <h3>Вода и техника</h3>
                    <p class="section-copy">Какую воду ты выбираешь и насколько подробно фиксируешь тонкие параметры сессии.</p>
                  </div>
                </div>
                <ul v-if="waterSourceStats.length" class="mini-list">
                  <li v-for="item in waterSourceStats" :key="item.key">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.count }}</strong>
                  </li>
                </ul>
                <p v-else class="mini-empty">Для этих заметок нет данных о воде.</p>
                <div class="brew-metric-grid brew-metric-grid-compact">
                  <article class="mini-card">
                    <span class="mini-label">Вода-лидер</span>
                    <strong>{{ topWaterSource }}</strong>
                    <span class="mini-meta">самый частый тип воды</span>
                  </article>
                  <article class="mini-card">
                    <span class="mini-label">Промывка</span>
                    <strong>{{ avgRinseCount ? avgRinseCount.toFixed(1) : '—' }}</strong>
                    <span class="mini-meta">среднее число промывок</span>
                  </article>
                </div>
              </article>
            </div>
          </section>

          <section
            id="analytics-profile"
            v-if="activeSection === 'profile'"
            class="criteria-block"
          >
            <div class="criteria-head">
              <h3>Вкусовой профиль</h3>
              <p>Сопоставляет предпочтительные типы чая, доминирующие дескрипторы и ощущения от чашки.</p>
            </div>
            <div class="analytics-grid">
              <article id="analytics-types" class="box">
                <div class="section-head compact">
                  <div>
                    <h3>Типы чая</h3>
                    <p class="section-copy">Какие чайные направления доминируют в твоей практике.</p>
                  </div>
                </div>
                <ul class="bars">
                  <li v-for="item in teaTypeStats" :key="item.label">
                    <div class="bar-head">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.percent }}%</strong>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" :style="{ width: `${item.percent}%` }" />
                    </div>
                    <div class="bar-foot">{{ item.count }} заметок</div>
                  </li>
                </ul>
              </article>

              <article id="analytics-descriptors" class="box">
                <div class="section-head compact">
                  <div>
                    <h3>Дескрипторы</h3>
                    <p class="section-copy">Семейства нот, которые ты отмечаешь чаще всего.</p>
                  </div>
                </div>
                <ol class="rank-list">
                  <li v-for="item in descriptorStats" :key="item.id">
                    <span class="rank-label">
                      <span class="descriptor-dot" :style="{ background: item.color }" />
                      <span>{{ item.label }}</span>
                    </span>
                    <strong>{{ item.count }}</strong>
                  </li>
                </ol>
              </article>

              <article class="box insight-box">
                <div class="section-head compact">
                  <div>
                    <h3>Чашка и состояние</h3>
                    <p class="section-copy">Что чаще всего встречается в ощущениях от настоя и после сессии.</p>
                  </div>
                </div>
                <div class="detail-columns stacked">
                  <div>
                    <h4>Текстура</h4>
                    <ul v-if="mouthfeelStats.length" class="mini-list">
                      <li v-for="item in mouthfeelStats" :key="item.key">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                      </li>
                    </ul>
                    <p v-else class="mini-empty">Текстура чашки пока не заполнялась.</p>
                  </div>
                  <div>
                    <h4>Состояние</h4>
                    <ul v-if="energyStats.length" class="mini-list">
                      <li v-for="item in energyStats" :key="item.key">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                      </li>
                    </ul>
                    <p v-else class="mini-empty">Данных о состоянии после сессии пока нет.</p>
                  </div>
                  <div>
                    <h4>Цвет настоя</h4>
                    <ul v-if="liquorColorStats.length" class="mini-list">
                      <li v-for="item in liquorColorStats" :key="item.key">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                      </li>
                    </ul>
                    <p v-else class="mini-empty">Цвет настоя пока не указывался.</p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.card { max-width: 1200px; margin: 0 auto; background: #fff; border: 1px solid #deead8; border-radius: 16px; padding: 20px; }
.hero { display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: 14px; }
h2 { margin: 0 0 6px; }
.lead { margin: 0; color: #4d6651; max-width: 760px; line-height: 1.55; }
.filters { border: 1px solid #e3eee0; border-radius: 12px; padding: 14px; background: #fbfdf8; display: grid; gap: 12px; margin-bottom: 14px; }
.filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.filter-field { display: grid; gap: 6px; color: #4b6350; font-size: 13px; }
.filter-field span { font-weight: 700; color: #49654f; }
.filter-field select { border: 1px solid #cedec9; border-radius: 10px; padding: 10px 12px; background: #fff; font-size: 14px; }
.filter-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.filter-meta { color: #5d7460; font-size: 13px; }
.clear-btn { border: 1px solid #d7e5d2; border-radius: 10px; background: #fff; color: #285231; padding: 8px 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
.section-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.nav-chip { text-decoration: none; color: #275733; background: #eef7ea; border: 1px solid #d9e8d4; border-radius: 999px; padding: 7px 12px; font-size: 13px; font-weight: 700; }
.section-sidebar .section-nav { flex-direction: column; flex-wrap: nowrap; }
.section-sidebar .nav-chip { width: 100%; text-align: left; border-radius: 10px; border-color: #d8e7d3; background: #f5faf3; cursor: pointer; }
.section-sidebar .nav-chip.active { background: #2f7b3d; color: #fff; border-color: #2f7b3d; }
.criteria-block { display: grid; gap: 12px; margin-bottom: 14px; }
.criteria-head h3 { margin: 0 0 4px; }
.criteria-head p { margin: 0; color: #5d7460; font-size: 13px; line-height: 1.45; }
.overview-section .criteria-head h3,
.overview-section .section-head h3 {
  color: #173a20;
}
.overview-section .criteria-head p,
.overview-section .section-copy,
.overview-section .stat-label,
.overview-section .insight-label {
  color: #5d7460;
}
.overview-section .stat-value {
  color: #173a20;
}
.overview-section .insight-list strong {
  color: #173a20;
}
.geography-section .stat-box,
.geography-section .box {
  background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%);
}
.geography-section .stat-value,
.geography-section .section-head h3,
.geography-section .insight-list strong {
  color: #173a20;
}
.geography-section .section-copy,
.geography-section .stat-label,
.geography-section .insight-label {
  color: #5d7460;
}
.geography-section {
  min-width: 0;
}
.brewing-section .stat-box,
.brewing-section .box,
.passport-section .box {
  background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%);
}
.brewing-section .section-head h3,
.brewing-section .insight-list strong,
.passport-section .section-head h3 {
  color: #173a20;
}
.brewing-section .section-copy,
.brewing-section .insight-label,
.passport-section .section-copy {
  color: #5d7460;
}
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stat-box { border: 1px solid #e3eee0; border-radius: 12px; padding: 12px 14px; background: #fbfdf8; display: flex; flex-direction: column; gap: 4px; }
.stat-value { font-size: 22px; font-weight: 800; color: #1e4e29; }
.stat-label { color: #5d7460; font-size: 13px; }
.overview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.analytics-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; align-items: flex-start; }
.section-sidebar { border-radius: 12px; background: #fbfdf8; border: 1px solid #e3eee0; padding: 10px 12px; position: sticky; top: 76px; }
.analytics-main { display: grid; gap: 14px; }
.analytics-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.box { border: 1px solid #e3eee0; border-radius: 12px; padding: 14px; background: #fbfdf8; }
.empty { color: #4b6350; border: 1px dashed #c6dcc3; border-radius: 12px; padding: 16px; background: #fbfdf8; }
.section-head { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 10px; }
.section-head.compact { margin-bottom: 12px; }
.section-head h3 { margin: 0 0 4px; }
.section-copy { margin: 0; color: #5d7460; font-size: 13px; line-height: 1.45; }
.section-meta { min-width: 92px; border-radius: 12px; background: #eef6eb; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; text-align: right; }
.section-meta strong { color: #22502d; font-size: 22px; line-height: 1; }
.section-meta span { color: #5f7863; font-size: 12px; }
.geography-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.map-box { display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.geography-map,
.geography-top-box { width: auto; max-width: none; min-width: 0; margin: 0; grid-column: 1 / -1; }
.geography-section .box,
.geography-section .section-head > :first-child,
.map-row > * { min-width: 0; }
.geography-section .section-head { flex-wrap: wrap; }
.geography-map { overflow: hidden; }
.map-row { display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; min-width: 0; overflow: hidden; border-radius: 12px; background: #f7fbf5; }
.geography-top-box { display: grid; gap: 12px; }
.region-rating-group {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.region-rating-metric-box { display: grid; gap: 10px; }
.region-rating-head { margin-bottom: 0; }
.region-rating-list { align-content: start; }
.region-rating-name { color: #1b4926; font-weight: 700; }
.region-rating-notes { color: #617b65; font-size: 12px; }
.region-rating-meta { display: inline-grid; justify-items: end; gap: 2px; min-width: 76px; }
.region-rating-meta strong { color: #204f2b; }
.analytics-divider {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}
.analytics-divider::before,
.analytics-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(207, 224, 203, 0) 0%, rgba(207, 224, 203, 1) 35%, rgba(207, 224, 203, 1) 100%);
}
.analytics-divider::after {
  background: linear-gradient(90deg, rgba(207, 224, 203, 1) 0%, rgba(207, 224, 203, 1) 65%, rgba(207, 224, 203, 0) 100%);
}
.analytics-divider span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #a8c5a7;
  box-shadow: 0 0 0 4px #f7fbf4;
}
.region-descriptor-box {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
}
.passport-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.passport-origin-box,
.passport-source-box {
  grid-column: 1 / -1;
}
.passport-origin-layout,
.passport-source-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
  gap: 12px;
}
.passport-origin-summary {
  display: grid;
  gap: 12px;
  align-content: start;
}
.passport-year-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.wip-box {
  display: grid;
  gap: 8px;
}
.brewing-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.brewing-mode-box {
  grid-column: 1 / -1;
}
.brew-mode-strip {
  display: flex;
  width: 100%;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7efe4;
  margin-bottom: 12px;
}
.brew-mode-strip-segment {
  height: 100%;
}
.brew-mode-card-grid,
.brew-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.brew-mode-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e6efe3;
}
.brew-mode-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.brew-mode-label {
  color: #3b5d43;
  font-size: 13px;
}
.brew-mode-card strong {
  color: #1d4b27;
  font-size: 22px;
  line-height: 1;
}
.brew-mode-meta {
  color: #617b65;
  font-size: 12px;
}
.brew-metric-grid-compact {
  margin-top: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.region-descriptor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.region-descriptor-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e6efe3;
}
.region-descriptor-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
}
.region-descriptor-head strong {
  color: #1b4926;
  font-size: 16px;
}
.region-descriptor-head span {
  color: #617b65;
  font-size: 12px;
  text-align: right;
}
.descriptor-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.descriptor-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: #f6faf4;
  border: 1px solid #e3ede0;
  color: #36553d;
  font-size: 13px;
}
.province-top-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.province-top-card { position: relative; display: grid; gap: 6px; padding: 14px; border-radius: 12px; background: #fff; border: 1px solid #e6efe3; }
.province-rank { font-size: 12px; font-weight: 800; color: #5e7f65; letter-spacing: 0.04em; text-transform: uppercase; }
.province-rank-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
}
.province-rank-badge--1 {
  background: linear-gradient(180deg, #f6d878 0%, #d4a72c 100%);
  color: #5f4300;
}
.province-rank-badge--2 {
  background: linear-gradient(180deg, #edf1f5 0%, #b7c1cb 100%);
  color: #495866;
}
.province-rank-badge--3 {
  background: linear-gradient(180deg, #e8b38d 0%, #b56f42 100%);
  color: #5d3012;
}
.province-rank-badge--4 {
  background: linear-gradient(180deg, #b8d9bc 0%, #6fa279 100%);
}
.province-top-card strong { color: #1b4926; font-size: 17px; }
.province-top-meta { color: #5c7461; font-size: 13px; }
.province-top-share { color: #2f7b3d; font-size: 13px; font-weight: 700; }
.mini-card { border: 1px solid #e1ebde; border-radius: 12px; padding: 12px; background: #fff; display: grid; gap: 4px; }
.mini-card strong { color: #204f2b; font-size: 18px; }
.mini-label, .mini-meta { color: #617b65; font-size: 12px; }
.province-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 13px; align-content: start; }
.province-list li { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.chip { color: #fff; border-radius: 999px; padding: 6px 10px; font-size: 13px; }
.bars { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.bar-head { display: flex; justify-content: space-between; margin-bottom: 4px; color: #355b3d; }
.bar-track { height: 10px; border-radius: 999px; background: #e6efe3; overflow: hidden; }
.bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #4f975c 0%, #2f7b3d 100%); }
.bar-foot { margin-top: 5px; font-size: 12px; color: #657d69; }
.rank-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.rank-list li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #e6efe3; }
.rank-label { display: inline-flex; align-items: center; gap: 8px; }
.descriptor-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 10px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(87,112,92,0.12); }
.insight-box { display: grid; gap: 10px; }
.insight-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.insight-list li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #e6efe3; }
.insight-label { color: #627b66; font-size: 13px; }
.insight-strong { display: inline-flex; align-items: center; gap: 8px; }
.detail-box { display: grid; gap: 12px; }
.detail-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.detail-columns.stacked { grid-template-columns: 1fr; }
.detail-columns h4 { margin: 0 0 8px; font-size: 13px; color: #4a6a52; }
.mini-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.mini-list li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #e6efe3; font-size: 13px; }
.mini-empty { margin: 0; padding: 12px; border: 1px dashed #d9e6d5; border-radius: 10px; background: #fff; color: #6a816d; font-size: 13px; line-height: 1.45; }
@media (max-width: 860px) {
  .analytics-layout { grid-template-columns: 1fr; }
  .section-sidebar { position: static; }
  .filter-grid,
  .geography-grid,
  .passport-grid,
  .brewing-grid,
  .region-rating-group,
  .region-descriptor-grid,
  .brew-mode-card-grid,
  .brew-metric-grid,
  .stats, .overview-grid, .analytics-grid { grid-template-columns: 1fr; }
  .filter-footer { flex-direction: column; align-items: flex-start; }
  .passport-origin-layout,
  .passport-source-layout,
  .detail-columns { grid-template-columns: 1fr; }
  .province-top-grid { grid-template-columns: 1fr; }
}
</style>
