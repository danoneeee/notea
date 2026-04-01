<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { MapChart } from 'echarts/charts';
import { TooltipComponent, VisualMapComponent } from 'echarts/components';
import { init, registerMap, use, type EChartsType } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

const props = defineProps<{
  /** Массив [название провинции из заметки, количество выпитого чая] */
  provinceStats: [string, number][];
}>();

use([MapChart, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const MAP_NAME = 'notea-china-provinces';

const containerRef = ref<HTMLDivElement | null>(null);
const isMapLoaded = ref(false);
const allProvinceNames = ref<string[]>([]);
let chart: EChartsType | null = null;
let resizeObserver: ResizeObserver | null = null;
let destroyed = false;

let geoJsonLoadPromise: Promise<any> | null = null;

function loadChinaGeoJson() {
  if (!geoJsonLoadPromise) {
    geoJsonLoadPromise = import('china-map-geojson/lib/china').then((module) => module.default);
  }
  return geoJsonLoadPromise;
}

// Сопоставляем названия регионов из заметок к названиям провинций из GeoJSON карты.
const provinceAliasToMapName: Record<string, string> = {
  'юньнань': '云南',
  'yunnan': '云南',
  'фуцзянь': '福建',
  'fujian': '福建',
  'тайвань': '台湾',
  'taiwan': '台湾',
  'аньхой': '安徽',
  'анхой': '安徽',
  'anhui': '安徽',
  'гуанси': '广西',
  'guangxi': '广西',
  'гуандун': '广东',
  'guangdong': '广东',
  'гуйчжоу': '贵州',
  'guizhou': '贵州',
  'сычуань': '四川',
  'sichuan': '四川',
  'хунань': '湖南',
  'hunan': '湖南',
  'хубэй': '湖北',
  'hubei': '湖北',
  'цзянси': '江西',
  'jiangxi': '江西',
  'цзянсу': '江苏',
  'jiangsu': '江苏',
  'чжэцзян': '浙江',
  'zhejiang': '浙江',
  'хайнань': '海南',
  'hainan': '海南',
  'шаньдун': '山东',
  'shandong': '山东',
  'хэнань': '河南',
  'henan': '河南',
  'хэбэй': '河北',
  'hebei': '河北',
  'шанхай': '上海',
  'shanghai': '上海',
  'пекин': '北京',
  'beijing': '北京',
  'чунцин': '重庆',
  'chongqing': '重庆',
  'ганьсу': '甘肃',
  'gansu': '甘肃',
};

const mapNameToRussianName: Record<string, string> = {
  // Юг и восток
  '云南': 'Юньнань',
  '广西': 'Гуанси',
  '广东': 'Гуандун',
  '海南': 'Хайнань',
  '福建': 'Фуцзянь',
  '台湾': 'Тайвань',
  '浙江': 'Чжэцзян',
  '江苏': 'Цзянсу',
  '上海': 'Шанхай',
  '江西': 'Цзянси',
  '湖南': 'Хунань',
  '湖北': 'Хубэй',
  '安徽': 'Аньхой',
  '山东': 'Шаньдун',
  '河南': 'Хэнань',
  '河北': 'Хэбэй',

  // Центр и запад
  '四川': 'Сычуань',
  '贵州': 'Гуйчжоу',
  '重庆': 'Чунцин',
  '陕西': 'Шэньси',
  '甘肃': 'Ганьсу',
  '青海': 'Цинхай',
  '宁夏': 'Нинся-Хуэйский',
  '内蒙古': 'Внутренняя Монголия',
  '西藏': 'Тибет',
  '新疆': 'Синьцзян',

  // Северо-восток и север
  '辽宁': 'Ляонин',
  '吉林': 'Гирин',
  '黑龙江': 'Хэйлунцзян',
  '山西': 'Шаньси',
  '天津': 'Тяньцзинь',
  '北京': 'Пекин',

  // Спец. административные районы
  '香港': 'Гонконг',
  '澳门': 'Макао',
};

function normalizeProvinceName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const seriesData = computed(() => {
  const countsByProvince = new Map<string, number>();

  for (const [rawName, count] of props.provinceStats) {
    const mappedName = provinceAliasToMapName[normalizeProvinceName(rawName)];
    if (!mappedName) continue;
    countsByProvince.set(mappedName, (countsByProvince.get(mappedName) ?? 0) + count);
  }

  // Заполняем все провинции, чтобы tooltip и heatmap работали и для нулевых значений.
  return allProvinceNames.value.map((provinceName) => {
    return {
      name: provinceName,
      russianName: mapNameToRussianName[provinceName] ?? provinceName,
      value: countsByProvince.get(provinceName) ?? 0,
    };
  });
});

const maxValue = computed(() => {
  const values = seriesData.value.map((item: { value: number }) => item.value);
  return Math.max(1, ...values);
});

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
        const value = Number(params.value ?? 0);
        const russianName = params.data?.russianName ?? mapNameToRussianName[params.name] ?? params.name;
        return `${russianName}<br/>Выпито чая: <strong>${value}</strong>`;
      },
    },
    visualMap: {
      min: 0,
      max: maxValue.value,
      show: false,
      calculable: false,
      inRange: {
        color: ['#eef7ed', '#cce9cd', '#8fd28f', '#2f9a48'],
      },
    },
    series: [
      {
        name: 'Чай по провинциям',
        type: 'map',
        map: MAP_NAME,
        roam: false,
        selectedMode: false,
        data: seriesData.value,
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

  // Карта и ECharts-рендер грузятся только при открытии аналитики, а не в основном бандле.
  chart = init(containerRef.value, undefined, { renderer: 'canvas' });

  resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  resizeObserver.observe(containerRef.value);

  void loadChinaGeoJson().then((chinaGeoJson) => {
    if (destroyed) return;
    registerMap(MAP_NAME, chinaGeoJson as any);
    const features = (chinaGeoJson as any)?.features ?? [];
    allProvinceNames.value = features
      .map((feature: any) => String(feature?.properties?.name ?? ''))
      .filter(Boolean);
    isMapLoaded.value = true;
    renderChart();
  });
});

watch([seriesData, maxValue, isMapLoaded], () => {
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
    <p class="hint">
      Карта показывает провинции Китая. Чем ярче зелёный цвет, тем больше чая из этого региона ты пил.
    </p>
  </div>
</template>

<style scoped>
.map-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.map-canvas {
  width: 100%;
  min-height: 560px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f7fbf5 0%, #f1f8ee 100%);
}

@media (max-width: 860px) {
  .map-canvas {
    min-height: 420px;
  }
}

.hint {
  margin: 0;
  font-size: 12px;
  color: #5b715e;
  line-height: 1.45;
}
</style>

