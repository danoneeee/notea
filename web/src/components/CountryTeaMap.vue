<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { MapChart } from 'echarts/charts';
import { TooltipComponent, VisualMapComponent } from 'echarts/components';
import { init, registerMap, use, type EChartsType } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

const props = withDefaults(
  defineProps<{
    /** Массив [название страны из заметки, количество выпитого чая] */
    countryStats: [string, number][];
    focusRegion?: 'world' | 'asia';
  }>(),
  {
    focusRegion: 'world',
  },
);

use([MapChart, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const MAP_NAME = 'notea-world-countries';

const containerRef = ref<HTMLDivElement | null>(null);
const isMapLoaded = ref(false);
const allCountryNames = ref<string[]>([]);
let chart: EChartsType | null = null;
let resizeObserver: ResizeObserver | null = null;
let destroyed = false;

let geoJsonLoadPromise: Promise<any> | null = null;

function loadWorldGeoJson() {
  if (!geoJsonLoadPromise) {
    geoJsonLoadPromise = import('geojson-world-map/lib/world.js').then((module) => module.default);
  }
  return geoJsonLoadPromise;
}

function normalizeCountryName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const countryAliasToMapCandidates: Record<string, string[]> = {
  'китай': ['China'],
  china: ['China'],
  'япония': ['Japan'],
  japan: ['Japan'],
  'корея': ['South Korea', 'Republic of Korea', 'Korea', 'Korea, South', 'S. Korea'],
  korea: ['South Korea', 'Republic of Korea', 'Korea', 'Korea, South', 'S. Korea'],
  'южная корея': ['South Korea', 'Republic of Korea', 'Korea', 'Korea, South', 'S. Korea'],
  'south korea': ['South Korea', 'Republic of Korea', 'Korea', 'Korea, South', 'S. Korea'],
  'индия': ['India'],
  india: ['India'],
  'непал': ['Nepal'],
  nepal: ['Nepal'],
  'шри-ланка': ['Sri Lanka'],
  'sri lanka': ['Sri Lanka'],
  'таиланд': ['Thailand'],
  thailand: ['Thailand'],
  'вьетнам': ['Vietnam'],
  vietnam: ['Vietnam'],
  'кения': ['Kenya'],
  kenya: ['Kenya'],
};

const mapNameToRussianName: Record<string, string> = {
  China: 'Китай',
  Japan: 'Япония',
  'South Korea': 'Корея',
  'Republic of Korea': 'Корея',
  Korea: 'Корея',
  'Korea, South': 'Корея',
  'S. Korea': 'Корея',
  India: 'Индия',
  Nepal: 'Непал',
  'Sri Lanka': 'Шри-Ланка',
  Thailand: 'Таиланд',
  Vietnam: 'Вьетнам',
  Kenya: 'Кения',
};

function resolveCountryMapName(rawName: string) {
  const available = new Set(allCountryNames.value);
  const normalizedName = normalizeCountryName(rawName);
  const candidates = countryAliasToMapCandidates[normalizedName] ?? [rawName.trim()];
  return candidates.find((candidate) => available.has(candidate));
}

const seriesData = computed(() => {
  const countsByCountry = new Map<string, number>();

  for (const [rawName, count] of props.countryStats) {
    const mappedName = resolveCountryMapName(rawName);
    if (!mappedName) continue;
    countsByCountry.set(mappedName, (countsByCountry.get(mappedName) ?? 0) + count);
  }

  return allCountryNames.value.map((countryName) => ({
    name: countryName,
    russianName: mapNameToRussianName[countryName] ?? countryName,
    value: countsByCountry.get(countryName) ?? 0,
  }));
});

const maxValue = computed(() => {
  const values = seriesData.value.map((item: { value: number }) => item.value);
  return Math.max(1, ...values);
});

const displaySeriesData = computed(() => {
  const max = maxValue.value;
  return seriesData.value.map((item) => {
    if (item.value <= 0) {
      return {
        ...item,
        actualValue: 0,
        value: 0,
      };
    }

    // Небольшие значения специально поднимаем выше, чтобы 1 заметка
    // визуально отличалась от полностью пустой страны.
    const normalized = item.value / max;
    const boostedValue = 0.28 + Math.sqrt(normalized) * 0.72;

    return {
      ...item,
      actualValue: item.value,
      value: Number(boostedValue.toFixed(3)),
    };
  });
});

const mapView = computed(() =>
  props.focusRegion === 'asia'
    ? {
        center: [104, 34] as [number, number],
        zoom: 2.2,
      }
    : {
        center: undefined,
        zoom: 1,
      },
);

function renderChart() {
  if (!chart || !isMapLoaded.value) return;

  chart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(24, 32, 24, 0.92)',
      borderWidth: 0,
      padding: 10,
      textStyle: {
        color: '#f7fbf5',
        fontSize: 12,
      },
      formatter: (params: { name: string; value?: number; data?: { russianName?: string } }) => {
        const value = Number((params.data as { actualValue?: number } | undefined)?.actualValue ?? params.value ?? 0);
        const russianName = params.data?.russianName ?? mapNameToRussianName[params.name] ?? params.name;
        return `${russianName}<br/>Заметок: <strong>${value}</strong>`;
      },
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      calculable: false,
      pieces: [
        { value: 0, color: '#edf1ee' },
        { min: 0.001, max: 0.38, color: '#eef7ed' },
        { min: 0.381, max: 0.62, color: '#cce9cd' },
        { min: 0.621, max: 0.82, color: '#8fd28f' },
        { min: 0.821, color: '#2f9a48' },
      ],
    },
    series: [
      {
        name: props.focusRegion === 'asia' ? 'Чай по странам Азии' : 'Чай по странам мира',
        type: 'map',
        map: MAP_NAME,
        roam: false,
        selectedMode: false,
        data: displaySeriesData.value,
        center: mapView.value.center,
        zoom: mapView.value.zoom,
        emphasis: {
          label: {
            show: true,
            color: '#17361f',
            fontSize: 10,
            fontWeight: 700,
          },
          itemStyle: {
            areaColor: '#2f9a48',
            borderColor: '#ffffff',
            borderWidth: 1.2,
          },
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 0.9,
        },
        label: {
          show: false,
        },
      },
    ],
  });
}

onMounted(() => {
  if (!containerRef.value) return;

  chart = init(containerRef.value, undefined, { renderer: 'canvas' });

  resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  resizeObserver.observe(containerRef.value);

  void loadWorldGeoJson().then((worldGeoJson) => {
    if (destroyed) return;
    registerMap(MAP_NAME, worldGeoJson as any);
    const features = (worldGeoJson as any)?.features ?? [];
    allCountryNames.value = features
      .map((feature: any) => String(feature?.properties?.name ?? ''))
      .filter(Boolean);
    isMapLoaded.value = true;
    renderChart();
  });
});

watch([seriesData, maxValue, isMapLoaded, mapView], () => {
  renderChart();
});

onBeforeUnmount(() => {
  destroyed = true;
  resizeObserver?.disconnect();
  chart?.dispose();
  resizeObserver = null;
  chart = null;
});
</script>

<template>
  <div class="map-wrap">
    <div ref="containerRef" class="map-canvas" />
    <div class="map-caption">
      <div class="map-legend" aria-label="Легенда карты">
        <span class="legend-item">
          <i class="legend-swatch light" />
          Светлый тон: единичные заметки
        </span>
        <span class="legend-item">
          <i class="legend-swatch mid" />
          Средний тон: устойчивый интерес
        </span>
        <span class="legend-item">
          <i class="legend-swatch strong" />
          Насыщенный тон: страна-лидер
        </span>
      </div>
      <p class="hint">
        {{
          focusRegion === 'asia'
            ? 'Показан увеличенный фрагмент карты по Азии, если все отмеченные страны лежат в этом регионе.'
            : 'Страны без данных остаются почти нейтральными. Наведи курсор на область карты, чтобы увидеть точное число заметок.'
        }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.map-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  min-width: 0;
  box-sizing: border-box;
  border-radius: 12px;
  overflow: hidden;
}

.map-canvas {
  width: 100%;
  max-width: 100%;
  min-height: 460px;
  display: block;
  border-radius: 12px;
  background: linear-gradient(180deg, #f7fbf5 0%, #f1f8ee 100%);
  contain: layout paint;
  overflow: hidden;
}

.map-caption {
  display: grid;
  gap: 8px;
  padding: 2px 0 0;
  box-sizing: border-box;
  min-width: 0;
}

.map-canvas :deep(canvas) {
  display: block;
  max-width: 100%;
}

.map-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  min-width: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e0ecdd;
  color: #47614d;
  font-size: 12px;
  line-height: 1.35;
  min-width: 0;
}

.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex: 0 0 14px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(90,120,95,0.12);
}

.legend-swatch.light {
  background: #eef7ed;
}

.legend-swatch.mid {
  background: #8fd28f;
}

.legend-swatch.strong {
  background: #2f9a48;
}

@media (max-width: 860px) {
  .map-canvas {
    min-height: 360px;
  }
}

@media (max-width: 640px) {
  .map-canvas {
    min-height: 320px;
  }
}

.hint {
  margin: 0;
  font-size: 12px;
  color: #5b715e;
  line-height: 1.45;
}
</style>
