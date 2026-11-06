<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DescriptorWheel from '../components/DescriptorWheel.vue';
import { describeDescriptorPath, descriptorWheelFamilies, getDescriptorGroupById } from '../data/descriptors';
import { listNotes, notesRevision } from '../services/notes';
import { listSetups, setupsRevision } from '../services/setups';

const ChinaTeaMap = defineAsyncComponent(() => import('../components/ChinaTeaMap.vue'));
const CountryTeaMap = defineAsyncComponent(() => import('../components/CountryTeaMap.vue'));
const router = useRouter();

const wheelDescriptors = descriptorWheelFamilies;

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
const harvestSeasonLabels: Record<string, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
};
const liquorColorLabels: Record<string, string> = {
  'very-light': 'Очень светлый',
  'green-gold': 'Зелёно-золотой',
  gold: 'Золотистый',
  amber: 'Янтарный',
  orange: 'Оранжево-медный',
  'red-brown': 'Красно-коричневый',
  dark: 'Тёмный',
};
const liquorColorPalette: Record<string, string> = {
  'very-light': '#f6f3d8',
  'green-gold': '#d8d37a',
  gold: '#d7a94a',
  amber: '#b8783b',
  orange: '#b85f2f',
  'red-brown': '#7f3d2d',
  dark: '#473a2f',
};
const mouthfeelLabels: Record<string, string> = {
  airy: 'Воздушное',
  silky: 'Шелковистое',
  juicy: 'Сочное',
  oily: 'Маслянистое',
  dense: 'Плотное',
  drying: 'Подсушивающее',
  creamy: 'Сливочное',
};
const energyEffectLabels: Record<string, string> = {
  quiet: 'Спокойное, созерцательное',
  warm: 'Тёплое, расслабляющее',
  focused: 'Собранное, фокусирующее',
  uplifting: 'Поднимающее, яркое',
  strong: 'Сильное, телесное',
};
const asianCountryNames = new Set(['Китай', 'Япония', 'Корея', 'Индия', 'Непал', 'Шри-Ланка', 'Таиланд', 'Вьетнам']);
const countryFlags: Record<string, string> = {
  Китай: '🇨🇳',
  Япония: '🇯🇵',
  Корея: '🇰🇷',
  Индия: '🇮🇳',
  Непал: '🇳🇵',
  'Шри-Ланка': '🇱🇰',
  Таиланд: '🇹🇭',
  Вьетнам: '🇻🇳',
  Кения: '🇰🇪',
};

type CountryRatingStat = { country: string; count: number; average: number; percent: number };

function isLeafDescriptorId(raw: string) {
  const meta = describeDescriptorPath(raw);
  return meta.fullLabel !== raw;
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
}

function averageStat(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function countStats(
  values: Array<string | null | undefined>,
  options?: { labelMap?: Record<string, string>; excludeEmpty?: boolean; limit?: number },
) {
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

function coveragePercent(predicate: (note: (typeof filteredNotes.value)[number]) => boolean) {
  return totalNotes.value ? Math.round((filteredNotes.value.filter(predicate).length / totalNotes.value) * 100) : 0;
}

function getCountryFlag(country: string) {
  return countryFlags[country.trim()] ?? '';
}

const notes = computed(() => {
  void notesRevision.value;
  return listNotes();
});

const activeSection = ref<'overview' | 'map' | 'relations' | 'brewing' | 'cup' | 'profile'>('overview');
const geographyMapMode = ref<'china' | 'countries'>('china');

const selectedTeaType = ref('');
const selectedCountry = ref('');
const selectedRegion = ref('');
const selectedBrewingMode = ref('');
const selectedHarvestSeason = ref('');

const teaTypeOptions = computed(() => uniqueOptions(notes.value.map((note) => note.teaType)));
const countryOptions = computed(() => uniqueOptions(notes.value.map((note) => note.country)));
const regionOptions = computed(() => {
  const base = selectedCountry.value
    ? notes.value.filter((note) => note.country.trim() === selectedCountry.value)
    : notes.value;
  return uniqueOptions(base.map((note) => note.originRegion || note.region));
});
const brewingModeOptions = computed(() => uniqueOptions(notes.value.map((note) => note.brewingMode)));
const harvestSeasonOptions = computed(() => uniqueOptions(notes.value.map((note) => note.harvestSeason)));
const activeFilterCount = computed(
  () =>
    [
      selectedTeaType.value,
      selectedCountry.value,
      selectedRegion.value,
      selectedBrewingMode.value,
      selectedHarvestSeason.value,
    ].filter(Boolean).length,
);

watch(selectedCountry, () => {
  if (selectedRegion.value && !regionOptions.value.includes(selectedRegion.value)) {
    selectedRegion.value = '';
  }
});

const filteredNotes = computed(() =>
  notes.value.filter((note) => {
    if (selectedTeaType.value && note.teaType.trim() !== selectedTeaType.value) return false;
    if (selectedCountry.value && note.country.trim() !== selectedCountry.value) return false;
    if (selectedRegion.value && (note.originRegion.trim() || note.region.trim()) !== selectedRegion.value) return false;
    if (selectedBrewingMode.value && note.brewingMode !== selectedBrewingMode.value) return false;
    if (selectedHarvestSeason.value && note.harvestSeason?.trim() !== selectedHarvestSeason.value) return false;
    return true;
  }),
);

const totalNotes = computed(() => filteredNotes.value.length);

const provinceStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    const province = note.originRegion.trim() || note.region.trim() || 'Не указан';
    map.set(province, (map.get(province) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

const chinaProvinceStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    const country = note.country.trim().toLowerCase();
    if (country && country !== 'китай') continue;
    const province = note.originRegion.trim() || note.region.trim();
    if (!province) continue;
    map.set(province, (map.get(province) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

const countryStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    const country = note.country.trim() || 'Не указана';
    map.set(country, (map.get(country) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

const teaTypeStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    const teaType = note.teaType.trim() || 'Не указан';
    map.set(teaType, (map.get(teaType) ?? 0) + 1);
  }
  const total = totalNotes.value || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }));
});

const uniqueRegions = computed(() => provinceStats.value.filter(([region]) => region !== 'Не указан').length);
const uniqueChinaRegions = computed(() => chinaProvinceStats.value.length);
const uniqueCountries = computed(() => countryStats.value.filter(([country]) => country !== 'Не указана').length);
const uniqueTeaTypes = computed(() => new Set(filteredNotes.value.map((note) => note.teaType.trim() || 'Не указан')).size);

const topCountry = computed(() => countryStats.value.find(([country]) => country !== 'Не указана') ?? null);
const topTeaType = computed(() => teaTypeStats.value[0] ?? null);

const topChinaProvinceCards = computed(() => {
  const total = totalNotes.value || 1;
  return chinaProvinceStats.value.slice(0, 4).map(([province, count], index) => ({
    province,
    count,
    rank: index + 1,
    percent: Math.round((count / total) * 100),
  }));
});
const topCountryCards = computed(() => {
  const total = totalNotes.value || 1;
  return countryStats.value
    .filter(([country]) => country !== 'Не указана')
    .slice(0, 4)
    .map(([country, count], index) => ({
      country,
      count,
      rank: index + 1,
      percent: Math.round((count / total) * 100),
    }));
});

const countryMapScope = computed<'world' | 'asia'>(() => {
  const countries = countryStats.value
    .map(([country]) => country)
    .filter((country) => country !== 'Не указана');
  if (!countries.length) return 'world';
  return countries.every((country) => asianCountryNames.has(country)) ? 'asia' : 'world';
});
const countryMapTitle = computed(() => (countryMapScope.value === 'asia' ? 'Карта стран Азии' : 'Карта мира'));
const countryMapCopy = computed(() =>
  countryMapScope.value === 'asia'
    ? 'Выборка полностью азиатская, поэтому мировая карта автоматически приближена к региону.'
    : 'Наведи на страну, чтобы увидеть плотность заметок по мировой карте.',
);
const countryMapMetaLabel = computed(() => (countryMapScope.value === 'asia' ? 'стран Азии отмечено' : 'стран отмечено'));

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

const descriptorSegmentIntensity = computed(() => {
  const usage = new Map<string, number>();
  for (const descriptor of wheelDescriptors) {
    usage.set(descriptor.id, 0);
  }
  for (const note of filteredNotes.value) {
    for (const descriptor of note.descriptors) {
      const familyId = descriptor.split(':')[0];
      if (usage.has(familyId)) {
        usage.set(familyId, (usage.get(familyId) ?? 0) + 1);
      }
    }
  }
  let max = 0;
  for (const value of usage.values()) {
    max = Math.max(max, value);
  }
  const out: Record<string, number> = {};
  for (const descriptor of wheelDescriptors) {
    const count = usage.get(descriptor.id) ?? 0;
    out[descriptor.id] = max > 0 ? count / max : 0;
  }
  return out;
});

const exactDescriptorStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    for (const id of note.descriptors) {
      if (!isLeafDescriptorId(id)) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const meta = describeDescriptorPath(id);
      return {
        id,
        count,
        shortLabel: meta.shortLabel,
        fullLabel: meta.fullLabel,
        color: meta.color,
      };
    });
});

const descriptorSubgroupStats = computed(() => {
  const map = new Map<string, number>();
  for (const note of filteredNotes.value) {
    for (const id of note.descriptors) {
      if (!isLeafDescriptorId(id)) continue;
      const parts = id.split(':');
      const familyId = parts[0];
      const groupId = parts[1];
      if (!familyId || !groupId) continue;
      const key = `${familyId}:${groupId}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => {
      const [familyId, groupId] = key.split(':');
      const group = getDescriptorGroupById(familyId, groupId);
      return {
        key,
        count,
        subgroupLabel: group?.label ?? groupId,
        color: descriptorMetaById[familyId]?.color ?? '#d9e5d6',
      };
    });
});

const exactDescriptorTeaTypeProfiles = computed(() =>
  teaTypeStats.value
    .filter((item) => item.label !== 'Не указан')
    .slice(0, 4)
    .map((item) => {
      const notesForType = filteredNotes.value.filter((note) => (note.teaType.trim() || 'Не указан') === item.label);
      const leafCounts = new Map<string, number>();
      let notesWithLeaf = 0;
      for (const note of notesForType) {
        const leaves = note.descriptors.filter((id) => isLeafDescriptorId(id));
        if (!leaves.length) continue;
        notesWithLeaf += 1;
        for (const lid of leaves) {
          leafCounts.set(lid, (leafCounts.get(lid) ?? 0) + 1);
        }
      }
      const topLeaves = [...leafCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([leafId]) => {
          const meta = describeDescriptorPath(leafId);
          return { id: leafId, label: meta.shortLabel, color: meta.color, fullLabel: meta.fullLabel };
        });
      return {
        teaType: item.label,
        notesCount: notesForType.length,
        notesWithLeaf,
        coverage: notesForType.length ? Math.round((notesWithLeaf / notesForType.length) * 100) : 0,
        topLeaves,
      };
    }),
);

const brewingModeStats = computed(() =>
  countStats(filteredNotes.value.map((note) => note.brewingMode), { labelMap: brewingModeLabels }).map((item) => ({
    ...item,
    percent: totalNotes.value ? Math.round((item.count / totalNotes.value) * 100) : 0,
    color: brewingModeColors[item.key] ?? '#4f975c',
  })),
);
const topBrewingMode = computed(() => brewingModeStats.value[0] ?? null);
const brewingPortraitCopy = computed(() => {
  const mode = topBrewingMode.value?.label;
  if (!mode) return 'Портрет заваривания появится, когда в заметках будет больше данных по самому процессу.';
  return `Преобладающий способ заваривания: ${mode}`;
});

const setupNameById = computed(() => {
  void setupsRevision.value;
  return Object.fromEntries(listSetups().map((setup) => [setup.id, setup.name]));
});
const setupStats = computed(() =>
  countStats(
    filteredNotes.value.map((note) => (note.setupId ? setupNameById.value[note.setupId]?.trim() || '—' : '')),
    { excludeEmpty: true, limit: 4 },
  ),
);
const waterSourceStats = computed(() => countStats(filteredNotes.value.map((note) => note.waterSource), { excludeEmpty: true, limit: 4 }));

const liquorColorStats = computed(() =>
  countStats(filteredNotes.value.map((note) => note.liquorColor), { labelMap: liquorColorLabels, excludeEmpty: true, limit: 4 }),
);
const mouthfeelStats = computed(() =>
  countStats(filteredNotes.value.map((note) => note.mouthfeel), { labelMap: mouthfeelLabels, excludeEmpty: true, limit: 4 }),
);
const energyEffectStats = computed(() =>
  countStats(filteredNotes.value.map((note) => note.energyEffect), { labelMap: energyEffectLabels, excludeEmpty: true, limit: 4 }),
);

const avgWaterTemp = computed(() => averageStat(filteredNotes.value.map((note) => note.waterTemp)));
const avgLeafGrams = computed(() => averageStat(filteredNotes.value.map((note) => note.leafGrams)));
const avgInfusions = computed(() => averageStat(filteredNotes.value.map((note) => note.infusionsCount)));
const avgWaterVolume = computed(() => averageStat(filteredNotes.value.map((note) => note.waterVolumeMl)));
const avgRinseCount = computed(() => averageStat(filteredNotes.value.map((note) => note.rinseCount)));

const topDescriptor = computed(() => descriptorStats.value[0] ?? null);
const topSetup = computed(() => setupStats.value[0]?.label ?? '—');
const topWaterSource = computed(() => waterSourceStats.value[0]?.label ?? '—');
const topLiquorColor = computed(() => liquorColorStats.value[0]?.label ?? '—');
const topMouthfeel = computed(() => mouthfeelStats.value[0]?.label ?? '—');
const topEnergyEffect = computed(() => energyEffectStats.value[0]?.label ?? '—');
const topLiquorColorKey = computed(() => liquorColorStats.value[0]?.key ?? '');
const topLiquorColorSwatch = computed(() => liquorColorPalette[topLiquorColorKey.value] ?? '#d9cfb0');

const namedSessions = computed(() => filteredNotes.value.filter((note) => note.sessionTitle?.trim()).length);
const favoriteNotes = computed(() => filteredNotes.value.filter((note) => note.isFavorite).length);
const namedSessionsPercent = computed(() => (totalNotes.value ? Math.round((namedSessions.value / totalNotes.value) * 100) : 0));
const favoritePercent = computed(() => (totalNotes.value ? Math.round((favoriteNotes.value / totalNotes.value) * 100) : 0));
const journalSpanDays = computed(() => {
  if (!filteredNotes.value.length) return null;
  const timestamps = filteredNotes.value.map((note) => new Date(note.updatedAt).getTime());
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
});

const setupCoverage = computed(() => coveragePercent((note) => Boolean(note.setupId || note.setupSummary.trim())));

const passportRichNotes = computed(
  () =>
    filteredNotes.value.filter((note) => {
      const filled = [
        Boolean(note.country.trim()),
        Boolean(note.originRegion.trim()),
        Boolean(note.harvestSeason?.trim()),
        typeof note.harvestYear === 'number',
        Boolean(note.passportNotes?.trim()),
      ].filter(Boolean).length;
      return filled >= 3;
    }).length,
);
const passportRichPercent = computed(() => (totalNotes.value ? Math.round((passportRichNotes.value / totalNotes.value) * 100) : 0));

const averageCupRating = computed(() =>
  averageStat(
    filteredNotes.value.map((note) => {
      const ratings = Object.values(note.ratings);
      return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
    }),
  ),
);
const averageRatingByMetric = computed(() => ({
  aroma: averageStat(filteredNotes.value.map((note) => note.ratings.aroma)),
  taste: averageStat(filteredNotes.value.map((note) => note.ratings.taste)),
  aftertaste: averageStat(filteredNotes.value.map((note) => note.ratings.aftertaste)),
  balance: averageStat(filteredNotes.value.map((note) => note.ratings.balance)),
}));
const ratingSummaryCards = computed(() => [
  {
    key: 'aroma',
    title: 'Аромат',
    average: averageRatingByMetric.value.aroma,
    percent: averageRatingByMetric.value.aroma ? Math.round((averageRatingByMetric.value.aroma / 5) * 100) : 0,
  },
  {
    key: 'taste',
    title: 'Вкус',
    average: averageRatingByMetric.value.taste,
    percent: averageRatingByMetric.value.taste ? Math.round((averageRatingByMetric.value.taste / 5) * 100) : 0,
  },
  {
    key: 'aftertaste',
    title: 'Послевкусие',
    average: averageRatingByMetric.value.aftertaste,
    percent: averageRatingByMetric.value.aftertaste ? Math.round((averageRatingByMetric.value.aftertaste / 5) * 100) : 0,
  },
  {
    key: 'balance',
    title: 'Баланс',
    average: averageRatingByMetric.value.balance,
    percent: averageRatingByMetric.value.balance ? Math.round((averageRatingByMetric.value.balance / 5) * 100) : 0,
  },
]);
const cupPortraitCopy = computed(() => {
  const parts = [topLiquorColor.value, topMouthfeel.value, topEnergyEffect.value].filter((item) => item && item !== '—');
  if (!parts.length) return 'Портрет чашки появится, когда в заметках будут оценки и ощущения после сессии.';
  return `Чаще всего это ${parts.join(', ').toLowerCase()} чашка.`;
});

function buildCountryRatingStats(metric: keyof (typeof filteredNotes.value)[number]['ratings']): CountryRatingStat[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const note of filteredNotes.value) {
    const country = note.country.trim();
    if (!country) continue;
    const current = map.get(country) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += note.ratings[metric];
    map.set(country, current);
  }
  return [...map.entries()]
    .map(([country, stats]) => ({
      country,
      count: stats.count,
      average: stats.total / stats.count,
      percent: Math.round((stats.total / stats.count / 5) * 100),
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 4);
}

const countryAromaStats = computed(() => buildCountryRatingStats('aroma'));
const countryTasteStats = computed(() => buildCountryRatingStats('taste'));
const countryAftertasteStats = computed(() => buildCountryRatingStats('aftertaste'));
const countryBalanceStats = computed(() => buildCountryRatingStats('balance'));

const regionDescriptorProfiles = computed(() => {
  const regionMap = new Map<string, { key: string; region: string; country: string; notesCount: number }>();
  for (const note of filteredNotes.value) {
    const region = note.originRegion.trim() || note.region.trim();
    if (!region) continue;
    const country = note.country.trim() || 'Страна не указана';
    const key = `${country}__${region}`;
    const current = regionMap.get(key) ?? { key, region, country, notesCount: 0 };
    current.notesCount += 1;
    regionMap.set(key, current);
  }

  return [...regionMap.values()]
    .sort((a, b) => b.notesCount - a.notesCount)
    .slice(0, 4)
    .map((entry) => {
      const familyCounts = new Map<string, number>();
      let notesWithDescriptorsCount = 0;
      for (const note of filteredNotes.value) {
        const region = note.originRegion.trim() || note.region.trim();
        const country = note.country.trim() || 'Страна не указана';
        if (`${country}__${region}` !== entry.key) continue;
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
        ...entry,
        notesWithDescriptorsCount,
        topDescriptors,
      };
    });
});

type InsightCard = {
  key: string;
  title: string;
  lead: string;
  detail: string;
  context?: string;
  accent?: string;
};

function formatShare(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

const setupTeaTypeInsight = computed<InsightCard | null>(() => {
  const setupMap = new Map<string, { total: number; teaTypes: Map<string, number> }>();
  for (const note of filteredNotes.value) {
    const setup = (note.setupId ? setupNameById.value[note.setupId] : '') || note.setupSummary.trim();
    const teaType = note.teaType.trim();
    if (!setup || !teaType) continue;
    const current = setupMap.get(setup) ?? { total: 0, teaTypes: new Map<string, number>() };
    current.total += 1;
    current.teaTypes.set(teaType, (current.teaTypes.get(teaType) ?? 0) + 1);
    setupMap.set(setup, current);
  }

  let best: InsightCard | null = null;
  let bestScore = 0;
  for (const [setup, stats] of setupMap.entries()) {
    if (stats.total < 2) continue;
    const top = [...stats.teaTypes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) continue;
    const [teaType, count] = top;
    const share = count / stats.total;
    const score = share * stats.total;
    if (share < 0.6 || score <= bestScore) continue;
    bestScore = score;
    best = {
      key: `setup-${setup}`,
      title: 'Паттерн посуды',
      lead: `В сетапе «${setup}» ты чаще всего пьёшь ${teaType}.`,
      detail: `${count} из ${stats.total} сессий с этим сетапом пришлись на этот тип чая.`,
      context: `${formatShare(count, stats.total)}% использования сетапа`,
      accent: 'setup',
    };
  }
  return best;
});

const regionDescriptorInsight = computed<InsightCard | null>(() => {
  let best: InsightCard | null = null;
  let bestScore = 0;
  for (const item of regionDescriptorProfiles.value) {
    if (!item.topDescriptors.length || item.notesCount < 2) continue;
    const score = item.notesWithDescriptorsCount / item.notesCount;
    if (score <= bestScore) continue;
    bestScore = score;
    best = {
      key: `region-descriptor-${item.key}`,
      title: 'Паттерн региона',
      lead: `${item.region} у тебя чаще всего звучит как ${item.topDescriptors.map((part) => part.label).join(', ')}.`,
      detail: `${item.country} · дескрипторы отмечены в ${item.notesWithDescriptorsCount} из ${item.notesCount} заметок по этому региону.`,
      context: `${formatShare(item.notesWithDescriptorsCount, item.notesCount)}% заметок с отмеченными нотами`,
      accent: 'region',
    };
  }
  return best;
});

const countryRatingInsight = computed<InsightCard | null>(() => {
  const countryLeaders = [
    { label: 'аромату', items: countryAromaStats.value },
    { label: 'вкусу', items: countryTasteStats.value },
    { label: 'послевкусию', items: countryAftertasteStats.value },
    { label: 'балансу', items: countryBalanceStats.value },
  ];

  let best: InsightCard | null = null;
  let bestAverage = 0;
  for (const group of countryLeaders) {
    const top = group.items[0];
    if (!top || top.count < 2) continue;
    if (top.average <= bestAverage) continue;
    bestAverage = top.average;
    best = {
      key: `country-rating-${group.label}`,
      title: 'Сильная страна',
      lead: `${top.country} в этой выборке лидирует по ${group.label}.`,
      detail: `Средняя оценка — ${top.average.toFixed(1)}/5 по ${top.count} заметкам.`,
      context: `Максимальный показатель внутри текущего среза`,
      accent: 'country',
    };
  }
  return best;
});

const teaTypeDescriptorInsight = computed<InsightCard | null>(() => {
  let best: InsightCard | null = null;
  let bestCoverage = 0;
  for (const item of exactDescriptorTeaTypeProfiles.value) {
    if (!item.topLeaves.length || item.notesCount < 2) continue;
    if (item.coverage <= bestCoverage) continue;
    bestCoverage = item.coverage;
    best = {
      key: `tea-type-${item.teaType}`,
      title: 'Паттерн типа чая',
      lead: `${item.teaType} у тебя чаще всего описывается как ${item.topLeaves.map((leaf) => leaf.label).join(', ')}.`,
      detail: `Точные ноты есть в ${item.notesWithLeaf} из ${item.notesCount} заметок этого типа.`,
      context: `${item.coverage}% заметок с точными нотами`,
      accent: 'teaType',
    };
  }
  return best;
});

const brewingModeEnergyInsight = computed<InsightCard | null>(() => {
  const modeMap = new Map<string, { total: number; effects: Map<string, number> }>();
  for (const note of filteredNotes.value) {
    const mode = brewingModeLabels[note.brewingMode] ?? note.brewingMode;
    const effect = energyEffectLabels[note.energyEffect?.trim() ?? ''] ?? '';
    if (!mode || !effect) continue;
    const current = modeMap.get(mode) ?? { total: 0, effects: new Map<string, number>() };
    current.total += 1;
    current.effects.set(effect, (current.effects.get(effect) ?? 0) + 1);
    modeMap.set(mode, current);
  }

  let best: InsightCard | null = null;
  let bestScore = 0;
  for (const [mode, stats] of modeMap.entries()) {
    if (stats.total < 2) continue;
    const top = [...stats.effects.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) continue;
    const [effect, count] = top;
    const share = count / stats.total;
    const score = share * stats.total;
    if (share < 0.6 || score <= bestScore) continue;
    bestScore = score;
    best = {
      key: `mode-${mode}`,
      title: 'Паттерн состояния',
      lead: `${mode} у тебя чаще всего связано с состоянием «${effect}».`,
      detail: `${count} из ${stats.total} заметок в этом режиме заканчиваются именно таким эффектом.`,
      context: `${formatShare(count, stats.total)}% заметок по режиму`,
      accent: 'energy',
    };
  }
  return best;
});

const analyticsInsights = computed(() =>
  [
    setupTeaTypeInsight.value,
    regionDescriptorInsight.value,
    countryRatingInsight.value,
    teaTypeDescriptorInsight.value,
    brewingModeEnergyInsight.value,
  ].filter((item): item is InsightCard => Boolean(item)),
);

function clearFilters() {
  selectedTeaType.value = '';
  selectedCountry.value = '';
  selectedRegion.value = '';
  selectedBrewingMode.value = '';
  selectedHarvestSeason.value = '';
}

function openFilteredNotes() {
  router.push({
    name: 'app-notes',
    query: {
      ...(selectedTeaType.value ? { teaType: selectedTeaType.value } : {}),
      ...(selectedCountry.value ? { country: selectedCountry.value } : {}),
      ...(selectedRegion.value ? { region: selectedRegion.value } : {}),
      ...(selectedBrewingMode.value ? { brewingMode: selectedBrewingMode.value } : {}),
      ...(selectedHarvestSeason.value ? { harvestSeason: selectedHarvestSeason.value } : {}),
    },
  });
}
</script>

<template>
  <section class="card">
    <div class="hero">
      <div>
        <h2>Аналитика</h2>
        <p class="lead">Раздел разбит по критериям: обзор записей, география, наблюдения, заваривание, профиль чашки и вкусовой профиль.</p>
      </div>
    </div>

    <div v-if="notes.length === 0" class="empty">
      Добавь несколько заметок, и здесь появятся личные графики и карта провинций.
    </div>
    <template v-else>
      <section class="filters">
        <div class="criteria-head">
          <h3>Фильтры и выборка</h3>
          <p>Собери срез сверху, а все секции ниже перестроятся под выбранный тип чая, страну, регион, сезон и способ заваривания.</p>
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
            <span>Страна</span>
            <select v-model="selectedCountry">
              <option value="">Все страны</option>
              <option v-for="option in countryOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>Провинция / регион</span>
            <select v-model="selectedRegion">
              <option value="">Все регионы</option>
              <option v-for="option in regionOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>Режим заваривания</span>
            <select v-model="selectedBrewingMode">
              <option value="">Все режимы</option>
              <option v-for="option in brewingModeOptions" :key="option" :value="option">{{ brewingModeLabels[option] ?? option }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span>Сезон сбора</span>
            <select v-model="selectedHarvestSeason">
              <option value="">Любой сезон</option>
              <option v-for="option in harvestSeasonOptions" :key="option" :value="option">{{ harvestSeasonLabels[option] ?? option }}</option>
            </select>
          </label>
        </div>
        <div class="filter-footer">
          <span class="filter-meta">В выборке: {{ totalNotes }} заметок{{ activeFilterCount ? ` · активных фильтров: ${activeFilterCount}` : '' }}</span>
          <div class="filter-actions">
            <button type="button" class="clear-btn" @click="openFilteredNotes">Открыть в заметках</button>
            <button type="button" class="clear-btn" @click="clearFilters">Сбросить фильтры</button>
          </div>
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
              :class="{ active: activeSection === 'brewing' }"
              @click="activeSection = 'brewing'"
            >
              Заваривание
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'cup' }"
              @click="activeSection = 'cup'"
            >
              Профиль чашки
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'profile' }"
              @click="activeSection = 'profile'"
            >
              Вкусовой профиль
            </button>
            <button
              type="button"
              class="nav-chip"
              :class="{ active: activeSection === 'relations' }"
              @click="activeSection = 'relations'"
            >
              Наблюдения
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
                    <span class="insight-label">Главная страна</span>
                    <strong v-if="topCountry" class="country-badge country-badge-inline">
                      <span v-if="getCountryFlag(topCountry[0])" class="country-flag" aria-hidden="true">{{ getCountryFlag(topCountry[0]) }}</span>
                      <span>{{ topCountry[0] }}</span>
                    </strong>
                    <strong v-else>—</strong>
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
                    <span class="insight-label">Избранных заметок</span>
                    <strong>{{ favoritePercent }}%</strong>
                  </li>
                  <li>
                    <span class="insight-label">Заметок с сетапом</span>
                    <strong>{{ setupCoverage }}%</strong>
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
              <p>Здесь остаётся чистая география: карты и лидеры по странам и провинциям без перекрёстных связей с вкусом.</p>
            </div>
            <div class="analytics-grid geography-grid">
              <article class="box map-box geography-map">
                <div class="section-head">
                  <div>
                    <h3>{{ geographyMapMode === 'china' ? 'Карта провинций' : countryMapTitle }}</h3>
                    <p class="section-copy">
                      {{
                        geographyMapMode === 'china'
                          ? 'Наведи на регион, чтобы увидеть плотность заметок по карте.'
                          : countryMapCopy
                      }}
                    </p>
                  </div>
                  <div class="map-mode-switch" role="tablist" aria-label="Режим географической карты">
                    <button
                      type="button"
                      class="map-mode-btn"
                      :class="{ active: geographyMapMode === 'china' }"
                      @click="geographyMapMode = 'china'"
                    >
                      Китай
                    </button>
                    <button
                      type="button"
                      class="map-mode-btn"
                      :class="{ active: geographyMapMode === 'countries' }"
                      @click="geographyMapMode = 'countries'"
                    >
                      {{ countryMapScope === 'asia' ? 'Азия' : 'Мир' }}
                    </button>
                  </div>
                  <div class="section-meta">
                    <strong>{{ geographyMapMode === 'china' ? uniqueChinaRegions : uniqueCountries }}</strong>
                    <span>{{ geographyMapMode === 'china' ? 'регионов отмечено' : countryMapMetaLabel }}</span>
                  </div>
                </div>
                <div class="map-row">
                  <ChinaTeaMap v-if="geographyMapMode === 'china'" :province-stats="chinaProvinceStats" />
                  <CountryTeaMap
                    v-else
                    :country-stats="countryStats"
                    :focus-region="countryMapScope"
                  />
                </div>
              </article>

              <article class="box geography-top-box">
                <div class="section-head compact">
                  <div>
                    <h3>{{ geographyMapMode === 'china' ? 'Топ по провинциям' : 'Топ по странам' }}</h3>
                    <p class="section-copy">
                      {{
                        geographyMapMode === 'china'
                          ? 'Короткая сводка по регионам, которые чаще всего встречаются в текущем срезе.'
                          : 'Короткая сводка по странам, которые чаще всего встречаются в текущем срезе.'
                      }}
                    </p>
                  </div>
                </div>
                <div v-if="geographyMapMode === 'china' && topChinaProvinceCards.length" class="province-top-grid">
                  <article v-for="item in topChinaProvinceCards" :key="item.province" class="province-top-card">
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
                <div v-else-if="geographyMapMode === 'countries' && topCountryCards.length" class="province-top-grid">
                  <article v-for="item in topCountryCards" :key="item.country" class="province-top-card">
                    <span
                      class="province-rank province-rank-badge"
                      :class="`province-rank-badge--${Math.min(item.rank, 4)}`"
                    >
                      {{ item.rank }}
                    </span>
                    <strong class="country-badge">
                      <span v-if="getCountryFlag(item.country)" class="country-flag" aria-hidden="true">{{ getCountryFlag(item.country) }}</span>
                      <span>{{ item.country }}</span>
                    </strong>
                    <span class="province-top-meta">{{ item.count }} заметок</span>
                    <span class="province-top-share">{{ item.percent }}% выборки</span>
                  </article>
                </div>
                <p v-else class="mini-empty">
                  {{
                    geographyMapMode === 'china'
                      ? 'Для текущего среза пока нет провинций Китая с заполненными данными.'
                      : 'Для текущего среза пока нет стран с заполненными данными.'
                  }}
                </p>
              </article>
            </div>
          </section>

          <section
            id="analytics-brewing"
            v-if="activeSection === 'brewing'"
            class="criteria-block brewing-section"
          >
            <div class="criteria-head">
              <h3>Практика заваривания</h3>
              <p>Раздел про сам ритуал: в каком режиме ты обычно завариваешь, на что опираешься по параметрам и какая посуда с водой чаще сопровождают сессию.</p>
            </div>
            <div class="analytics-grid brewing-grid">
              <article class="box brewing-portrait-box">
                <div class="section-head compact">
                  <div>
                    <h3>Почерк заваривания</h3>
                    <p class="section-copy">Короткая выжимка по режиму, базовым параметрам и общему характеру твоих сессий.</p>
                  </div>
                </div>
                <div class="brewing-portrait-layout">
                  <div class="brewing-portrait-copy">
                    <strong>{{ brewingPortraitCopy }}</strong>
                    <div class="brewing-summary-chips">
                      <span v-if="topSetup !== '—'" class="brewing-summary-chip">{{ topSetup }}</span>
                    </div>
                    <div v-if="brewingModeStats.length" class="brew-mode-strip" aria-hidden="true">
                      <span
                        v-for="item in brewingModeStats"
                        :key="`${item.key}-strip`"
                        class="brew-mode-strip-segment"
                        :style="{ width: `${Math.max(item.percent, 12)}%`, background: item.color }"
                      />
                    </div>
                    <div v-if="brewingModeStats.length" class="brew-mode-legend">
                      <span
                        v-for="item in brewingModeStats"
                        :key="`${item.key}-legend`"
                        class="brew-mode-legend-item"
                      >
                        <span class="brew-mode-dot" :style="{ background: item.color }" />
                        <span>{{ item.label }}</span>
                        <strong>{{ item.percent }}%</strong>
                      </span>
                    </div>
                  </div>
                  <div class="brew-metric-grid brewing-metric-grid-hero">
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
                    <article class="mini-card">
                      <span class="mini-label">Промывка</span>
                      <strong>{{ avgRinseCount ? avgRinseCount.toFixed(1) : '—' }}</strong>
                      <span class="mini-meta">среднее число промывок</span>
                    </article>
                    <article class="mini-card">
                      <span class="mini-label">Сетап указан</span>
                      <strong>{{ setupCoverage }}%</strong>
                      <span class="mini-meta">заметок с выбранной посудой</span>
                    </article>
                  </div>
                </div>
              </article>

              <article class="box brewing-tools-box">
                <div class="section-head compact">
                  <div>
                    <h3>Посуда и вода</h3>
                    <p class="section-copy">Чем обычно собрана сессия: какая посуда и какая вода чаще всего сопровождают твой привычный ритуал.</p>
                  </div>
                </div>
                <div class="brewing-tools-summary">
                  <article class="mini-card brewing-tools-summary-card">
                    <span class="mini-label">Частый сетап</span>
                    <strong>{{ topSetup }}</strong>
                    <span class="mini-meta">основа привычной сессии</span>
                  </article>
                  <article class="mini-card brewing-tools-summary-card">
                    <span class="mini-label">Частая вода</span>
                    <strong>{{ topWaterSource }}</strong>
                    <span class="mini-meta">самый частый выбор воды</span>
                  </article>
                </div>
                <div class="brewing-tools-layout">
                  <div class="brewing-tools-column">
                    <h4>Сетапы</h4>
                    <ul v-if="setupStats.length" class="mini-list">
                      <li v-for="item in setupStats" :key="item.key">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                      </li>
                    </ul>
                    <p v-else class="mini-empty">В текущем срезе сетапы пока не указаны.</p>
                  </div>
                  <div class="brewing-tools-column">
                    <h4>Вода</h4>
                    <ul v-if="waterSourceStats.length" class="mini-list">
                      <li v-for="item in waterSourceStats" :key="item.key">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                      </li>
                    </ul>
                    <p v-else class="mini-empty">Для этих заметок нет данных о воде.</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section
            id="analytics-cup"
            v-if="activeSection === 'cup'"
            class="criteria-block cup-section"
          >
            <div class="criteria-head">
              <h3>Профиль чашки и итоговая оценка</h3>
              <p>Раздел показывает, как обычно выглядит и ощущается чашка в текущей выборке: оттенок настоя, текстура, состояние и общий уровень впечатления.</p>
            </div>
            <div class="analytics-grid cup-grid">
              <article class="box cup-portrait-box">
                <div class="section-head compact">
                  <div>
                    <h3>Портрет чашки</h3>
                    <p class="section-copy">Один быстрый визуальный срез по главному оттенку, телу, состоянию и средним оценкам.</p>
                  </div>
                </div>
                <div class="cup-portrait-layout">
                  <div class="cup-main-column">
                    <div class="cup-hero">
                      <div class="cup-hero-swatch" :style="{ background: topLiquorColorSwatch }" aria-hidden="true" />
                      <div class="cup-hero-copy">
                        <span class="cup-hero-kicker">Доминирующий образ</span>
                        <strong>{{ cupPortraitCopy }}</strong>
                        <span class="cup-hero-meta">Средняя итоговая: {{ averageCupRating ? `${averageCupRating.toFixed(1)}/5` : '—' }}</span>
                      </div>
                    </div>
                    <div class="cup-rating-bars">
                      <article v-for="item in ratingSummaryCards" :key="item.key" class="cup-rating-bar">
                        <div class="cup-rating-head">
                          <span>{{ item.title }}</span>
                          <strong>{{ item.average ? `${item.average.toFixed(1)}/5` : '—' }}</strong>
                        </div>
                        <div class="cup-rating-track" aria-hidden="true">
                          <span class="cup-rating-fill" :style="{ width: `${item.percent}%` }" />
                        </div>
                      </article>
                    </div>
                  </div>
                  <div class="cup-side-column">
                    <div class="cup-highlight-grid">
                      <article class="mini-card cup-highlight-card">
                        <span class="mini-label">Оттенок настоя</span>
                        <strong>{{ topLiquorColor }}</strong>
                        <span class="mini-meta">самый частый цвет чашки</span>
                      </article>
                      <article class="mini-card cup-highlight-card">
                        <span class="mini-label">Текстура</span>
                        <strong>{{ topMouthfeel }}</strong>
                        <span class="mini-meta">главное телесное ощущение</span>
                      </article>
                      <article class="mini-card cup-highlight-card">
                        <span class="mini-label">Состояние</span>
                        <strong>{{ topEnergyEffect }}</strong>
                        <span class="mini-meta">самый частый эффект после сессии</span>
                      </article>
                    </div>
                  </div>
                </div>
              </article>

            </div>
          </section>

          <section
            id="analytics-profile"
            v-if="activeSection === 'profile'"
            class="criteria-block profile-section"
          >
            <div class="criteria-head">
              <h3>Вкусовой профиль</h3>
              <p>Круг по семействам, затем точные ноты и подгруппы — в рамках выбранных фильтров.</p>
            </div>
            <div class="analytics-grid profile-grid">
              <article class="box profile-wheel-box">
                <div class="section-head compact">
                  <div>
                    <h3>Дескрипторный круг</h3>
                    <p class="section-copy">Насыщенность сегмента — как часто в срезе встречаются отметки этого семейства.</p>
                  </div>
                </div>
                <DescriptorWheel
                  :descriptors="wheelDescriptors"
                  :selected-ids="[]"
                  :segment-intensity="descriptorSegmentIntensity"
                  center-label="НОТЫ"
                />
              </article>

              <div class="analytics-divider" aria-hidden="true">
                <span />
              </div>

              <article id="analytics-descriptors" class="box profile-deep-box">
                <div class="section-head compact">
                  <div>
                    <h3>Семейства (топ)</h3>
                    <p class="section-copy">Агрегат по большим секторам круга — как семейства чаще всего попадают в заметки.</p>
                  </div>
                </div>
                <div class="profile-leaders-scroll">
                  <ol class="rank-list">
                    <li v-for="item in descriptorStats" :key="item.id">
                      <span class="rank-label">
                        <span class="descriptor-dot" :style="{ background: item.color }" />
                        <span>{{ item.label }}</span>
                      </span>
                      <strong>{{ item.count }}</strong>
                    </li>
                  </ol>
                </div>
              </article>

              <article class="box profile-deep-box">
                <div class="section-head compact">
                  <div>
                    <h3>Сильные подгруппы</h3>
                    <p class="section-copy">Средний уровень круга — куда ты чаще «сужаешь» вкус внутри семейства.</p>
                  </div>
                </div>
                <div class="profile-leaders-scroll">
                  <ul v-if="descriptorSubgroupStats.length" class="rank-list">
                    <li v-for="item in descriptorSubgroupStats" :key="item.key">
                      <span class="rank-label">
                        <span class="descriptor-dot" :style="{ background: item.color }" />
                        <span>{{ item.subgroupLabel }}</span>
                      </span>
                      <strong>{{ item.count }}</strong>
                    </li>
                  </ul>
                  <p v-else class="mini-empty">Нужны точные ноты из круга — тогда можно посчитать подгруппы.</p>
                </div>
              </article>

              <article class="box profile-deep-box">
                <div class="section-head compact">
                  <div>
                    <h3>Точные ноты (лидеры)</h3>
                    <p class="section-copy">Конкретные отметки третьего уровня — самые частые в текущем срезе.</p>
                  </div>
                </div>
                <div class="profile-leaders-scroll">
                  <ol v-if="exactDescriptorStats.length" class="rank-list exact-descriptor-list">
                    <li v-for="item in exactDescriptorStats" :key="item.id">
                      <span class="rank-label exact-descriptor-main" :title="item.fullLabel">
                        <span class="descriptor-dot" :style="{ background: item.color }" />
                        <span>{{ item.shortLabel }}</span>
                      </span>
                      <span class="exact-descriptor-meta">
                        <strong>{{ item.count }}</strong>
                      </span>
                    </li>
                  </ol>
                  <p v-else class="mini-empty">Здесь появятся данные, когда в заметках будут выбраны точные ноты (не только семейство).</p>
                </div>
              </article>

            </div>
          </section>

          <section
            id="analytics-relations"
            v-if="activeSection === 'relations'"
            class="criteria-block relations-section"
          >
            <div class="criteria-head">
              <h3>Наблюдения</h3>
              <p>Раздел подмечает неочевидные паттерны внутри текущей выборки: что с чем у тебя чаще всего связано и какие сочетания повторяются.</p>
            </div>
            <div v-if="analyticsInsights.length" class="analytics-grid insights-grid">
              <article
                v-for="item in analyticsInsights"
                :key="item.key"
                class="box insight-story-card"
                :class="item.accent ? `insight-story-card--${item.accent}` : ''"
              >
                <div class="insight-story-head">
                  <span class="insight-story-label">{{ item.title }}</span>
                  <span v-if="item.context" class="insight-story-context">{{ item.context }}</span>
                </div>
                <strong class="insight-story-lead">{{ item.lead }}</strong>
                <p class="insight-story-detail">{{ item.detail }}</p>
              </article>
            </div>
            <p v-else class="mini-empty">
              Когда в выборке станет больше повторяющихся паттернов по посуде, регионам, типам чая и состояниям, здесь появятся персональные наблюдения.
            </p>
            <div v-if="analyticsInsights.length" class="insight-footnote">
              Наблюдения строятся только внутри текущего среза, поэтому фильтры сверху помогают смотреть на паттерны в нужном контексте, а не мешают им.
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
.filter-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.filter-field { display: grid; gap: 6px; color: #4b6350; font-size: 13px; }
.filter-field span { font-weight: 700; color: #49654f; }
.filter-field select { border: 1px solid #cedec9; border-radius: 10px; padding: 10px 12px; background: #fff; font-size: 14px; }
.filter-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.filter-actions { display: flex; gap: 8px; flex-wrap: wrap; }
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
.geography-section .box,
.relations-section .stat-box,
.relations-section .box,
.cup-section .stat-box,
.cup-section .box {
  background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%);
}
.geography-section .stat-value,
.geography-section .section-head h3,
.geography-section .insight-list strong,
.relations-section .section-head h3,
.relations-section .insight-list strong,
.cup-section .section-head h3,
.cup-section .insight-list strong {
  color: #173a20;
}
.geography-section .section-copy,
.geography-section .stat-label,
.geography-section .insight-label,
.relations-section .section-copy,
.relations-section .stat-label,
.relations-section .insight-label,
.cup-section .section-copy,
.cup-section .insight-label {
  color: #5d7460;
}
.geography-section,
.relations-section {
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
.profile-section .stat-box,
.profile-section .box {
  background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%);
}
.profile-section .section-head h3,
.profile-section .insight-list strong {
  color: #173a20;
}
.profile-section .section-copy,
.profile-section .insight-label {
  color: #5d7460;
}
.profile-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}
.profile-grid > .analytics-divider {
  grid-column: 1 / -1;
  margin-block: 6px 2px;
}
.profile-wheel-box {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
  min-width: 0;
}
.profile-wheel-box :deep(.wheel-wrap) {
  justify-content: center;
}
.profile-grid .profile-tea-leaf-box,
.profile-grid .profile-cup-box {
  grid-column: 1 / -1;
}
.exact-descriptor-list .exact-descriptor-main {
  min-width: 0;
}
.exact-descriptor-meta strong {
  color: #204f2b;
}
.profile-deep-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
}
.profile-leaders-scroll {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
  margin-right: -2px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #a8c5a7 #f0f5ee;
}
.profile-leaders-scroll::-webkit-scrollbar {
  width: 8px;
}
.profile-leaders-scroll::-webkit-scrollbar-thumb {
  background: #a8c5a7;
  border-radius: 999px;
  border: 2px solid #f7fbf4;
}
.profile-leaders-scroll::-webkit-scrollbar-track {
  background: #eef4ea;
  border-radius: 999px;
}
.profile-leaders-scroll .mini-empty {
  margin: 0;
}
.profile-leaders-scroll .rank-list {
  gap: 6px;
}
.profile-leaders-scroll .rank-list li {
  padding: 8px 10px;
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
.cup-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.cup-portrait-box {
  grid-column: 1 / -1;
}
.cup-portrait-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
  gap: 12px;
  align-items: start;
}
.cup-main-column,
.cup-side-column {
  display: grid;
  gap: 12px;
  align-content: start;
}
.cup-hero {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(244, 248, 241, 0.96));
  border: 1px solid #e2ece0;
}
.cup-hero-swatch {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  box-shadow: inset 0 0 0 1px rgba(69, 86, 54, 0.08);
}
.cup-hero-copy {
  display: grid;
  gap: 8px;
}
.cup-hero-kicker {
  color: #6d846f;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cup-hero-copy strong {
  color: #173a20;
  font-size: 22px;
  line-height: 1.35;
}
.cup-hero-meta {
  color: #5d7460;
  font-size: 13px;
}
.cup-highlight-grid {
  display: grid;
  gap: 10px;
}
.cup-highlight-card {
  min-height: 84px;
}
.cup-rating-bars {
  display: grid;
  gap: 10px;
}
.cup-rating-bar {
  display: grid;
  gap: 6px;
}
.cup-rating-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #4c6750;
  font-size: 13px;
}
.cup-rating-head strong {
  color: #204f2b;
}
.cup-rating-track {
  height: 10px;
  border-radius: 999px;
  background: #e6efe3;
  overflow: hidden;
}
.cup-rating-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #83b65d 0%, #2f7b3d 100%);
}
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
.relations-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.insights-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.map-box { display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.map-mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: #eef6eb;
  border: 1px solid #dbe9d6;
}
.map-mode-btn {
  border: 0;
  background: transparent;
  color: #56705c;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.map-mode-btn.active {
  background: #2f7b3d;
  color: #fff;
  box-shadow: 0 6px 16px rgba(47, 123, 61, 0.18);
}
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
.country-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f2f8ef;
  border: 1px solid #deead8;
  color: #204f2b;
  line-height: 1.1;
}
.country-badge-inline {
  padding: 3px 8px;
}
.country-badge-subtle {
  background: #fff;
  border-color: #e3eee0;
}
.country-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(87, 112, 92, 0.08);
  font-size: 13px;
  flex: 0 0 18px;
}
.insight-story-card {
  display: grid;
  gap: 12px;
  align-content: start;
  min-height: 180px;
  position: relative;
  overflow: hidden;
}
.insight-story-card::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 12px 0 0 12px;
  background: #a8c5a7;
}
.insight-story-card--country::after { background: #5f9bcf; }
.insight-story-card--region::after { background: #6eb0a0; }
.insight-story-card--teaType::after { background: #d88963; }
.insight-story-card--setup::after { background: #91816f; }
.insight-story-card--energy::after { background: #8c7ad8; }
.insight-story-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}
.insight-story-label {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef6eb;
  border: 1px solid #dbe9d6;
  color: #466049;
  font-size: 12px;
  font-weight: 700;
}
.insight-story-context {
  color: #6a816d;
  font-size: 12px;
  text-align: right;
}
.insight-story-lead {
  color: #173a20;
  font-size: 17px;
  line-height: 1.4;
}
.insight-story-detail {
  margin: 0;
  color: #5d7460;
  font-size: 14px;
  line-height: 1.55;
}
.insight-footnote {
  color: #6a816d;
  font-size: 13px;
  line-height: 1.45;
  padding: 0 2px;
}
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
.analytics-divider-labeled span {
  width: auto;
  height: auto;
  border-radius: 999px;
  background: #eef6eb;
  box-shadow: none;
  border: 1px solid #d7e5d2;
  color: #466049;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
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
.brew-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.brewing-portrait-box {
  grid-column: 1 / -1;
}
.brewing-portrait-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 12px;
  align-items: start;
}
.brewing-portrait-copy {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e2ece0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(244, 248, 241, 0.96));
}
.brewing-portrait-copy strong {
  color: #173a20;
  font-size: 22px;
  line-height: 1.35;
}
.brewing-summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.brewing-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e1ebe0;
  color: #34543c;
  font-size: 13px;
}
.brew-mode-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.brew-mode-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #e1ebe0;
  color: #3f5f47;
  font-size: 12px;
}
.brew-mode-legend-item strong {
  color: #1d4b27;
  font-size: 12px;
}
.brewing-metric-grid-hero {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.brew-mode-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.brew-metric-grid-compact {
  margin-top: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.brewing-tools-box {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
}
.brewing-tools-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.brewing-tools-summary-card {
  min-height: 92px;
}
.brewing-tools-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.brewing-tools-column {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid #e5efe2;
}
.brewing-tools-column h4 {
  margin: 0;
  color: #173a20;
  font-size: 14px;
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
.region-descriptor-title {
  display: grid;
  gap: 2px;
}
.region-descriptor-head strong {
  color: #1b4926;
  font-size: 16px;
}
.region-descriptor-country {
  color: #617b65;
  font-size: 12px;
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
  .brew-metric-grid,
  .profile-grid,
  .stats, .overview-grid, .analytics-grid { grid-template-columns: 1fr; }
  .filter-footer { flex-direction: column; align-items: flex-start; }
  .passport-origin-layout,
  .passport-source-layout,
  .detail-columns { grid-template-columns: 1fr; }
  .brewing-portrait-layout,
  .brewing-tools-layout,
  .brewing-tools-summary { grid-template-columns: 1fr; }
  .cup-portrait-layout,
  .cup-hero { grid-template-columns: 1fr; }
  .cup-hero-swatch { width: 100%; max-width: 160px; height: 120px; }
  .province-top-grid { grid-template-columns: 1fr; }
}
</style>
