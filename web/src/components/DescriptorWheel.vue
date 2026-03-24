<script setup lang="ts">
import { computed, ref } from 'vue';

type Descriptor = {
  id: string;
  label: string;
  color: string;
};

const props = defineProps<{
  descriptors: Descriptor[];
  selectedIds: string[];
  centerLabel?: string;
  expandingId?: string | null;
  fadeOthers?: boolean;
  subMode?: boolean;
  previewSubcategories?: Record<string, string[]>;
  showSubPreview?: boolean;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();

function isSelected(id: string) {
  return props.selectedIds.includes(id);
}

const hoveredId = ref<string | null>(null);

function setHovered(id: string | null) {
  hoveredId.value = id;
}

const size = 420;
const center = size / 2;
const outerRadius = 190;
const innerRadius = 88;

function polarToCartesian(radius: number, angleRad: number) {
  return {
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
  };
}

function createSegmentPath(startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(outerRadius, startAngle);
  const endOuter = polarToCartesian(outerRadius, endAngle);
  const startInner = polarToCartesian(innerRadius, startAngle);
  const endInner = polarToCartesian(innerRadius, endAngle);

  const angleDelta = endAngle - startAngle;
  const largeArcFlag = angleDelta > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

const segments = computed(() => {
  const step = (Math.PI * 2) / props.descriptors.length;
  const startShift = -Math.PI / 2;

  return props.descriptors.map((item, index) => {
    const startAngle = startShift + index * step;
    const endAngle = startShift + (index + 1) * step;
    const middleAngle = startAngle + step / 2;

    const labelPoint = polarToCartesian((outerRadius + innerRadius) / 2, middleAngle);
    const previewPoint = polarToCartesian(outerRadius + 26, middleAngle);
    const textRotation = 0;

    return {
      ...item,
      path: createSegmentPath(startAngle, endAngle),
      labelX: labelPoint.x,
      labelY: labelPoint.y,
      previewX: previewPoint.x,
      previewY: previewPoint.y,
      textRotation,
    };
  });
});

const previewSegment = computed(() => {
  if (!props.showSubPreview) {
    return null;
  }
  const id = props.expandingId ?? hoveredId.value;
  if (!id) {
    return null;
  }
  const segment = segments.value.find((x) => x.id === id);
  const items = props.previewSubcategories?.[id];
  if (!segment || !items || items.length === 0) {
    return null;
  }
  return {
    title: segment.label,
    x: segment.previewX,
    y: segment.previewY,
    items,
  };
});
</script>

<template>
  <div class="wheel-wrap">
    <svg class="wheel" :viewBox="`0 0 ${size} ${size}`" role="img" aria-label="Круг дескрипторов">
      <g
        v-for="segment in segments"
        :key="segment.id"
        class="segment-group"
        :class="{
          'is-expanding': props.expandingId === segment.id,
          'is-faded': props.fadeOthers && props.expandingId && props.expandingId !== segment.id,
          'is-sub-mode': props.subMode,
        }"
        @mouseenter="setHovered(segment.id)"
        @mouseleave="setHovered(null)"
      >
        <path
          class="segment"
          :class="{ selected: isSelected(segment.id) }"
          :d="segment.path"
          :style="{ '--segment-color': segment.color }"
          @click="emit('toggle', segment.id)"
        />
        <text
          class="segment-label"
          :x="segment.labelX"
          :y="segment.labelY"
          :transform="`rotate(${segment.textRotation} ${segment.labelX} ${segment.labelY})`"
        >
          {{ segment.label }}
        </text>
      </g>
      <circle class="center-circle" :cx="center" :cy="center" :r="innerRadius - 8" />
      <text class="center-label" :x="center" :y="center + 4">{{ props.centerLabel ?? 'ВКУС' }}</text>
    </svg>
    <div
      v-if="previewSegment"
      class="preview"
      :style="{ left: `${previewSegment.x}px`, top: `${previewSegment.y}px` }"
    >
      <p class="preview-title">{{ previewSegment.title }}</p>
      <ul class="preview-list">
        <li v-for="item in previewSegment.items" :key="item">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.wheel-wrap {
  position: relative;
  display: flex;
  justify-content: center;
}

.wheel {
  width: min(560px, 100%);
  height: auto;
  overflow: visible;
  transition: transform 0.2s ease;
}

.is-sub-mode {
  transform: scale(0.93);
  transform-origin: center;
}

.segment-group {
  transition: opacity 0.2s ease, transform 0.22s ease;
  transform-origin: center;
}

.segment-group.is-expanding {
  transform: scale(1.06);
}

.segment-group.is-faded {
  opacity: 0.2;
}

.segment {
  fill: color-mix(in srgb, var(--segment-color), white 58%);
  stroke: #ffffff;
  stroke-width: 2;
  cursor: pointer;
  transition: filter 0.12s ease, fill 0.12s ease;
}

.segment:hover {
  filter: brightness(1.04);
  fill: color-mix(in srgb, var(--segment-color), white 42%);
}

.segment-group:hover {
  transform: scale(1.04);
}

.selected {
  fill: color-mix(in srgb, var(--segment-color), white 26%);
  stroke: #ffffff;
  stroke-width: 2;
}

.segment-label {
  font-size: 12px;
  font-weight: 800;
  fill: #2b4430;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

.center-circle {
  fill: #ffffff;
  stroke: #d8e5d5;
  stroke-width: 1.5;
}

.center-label {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 1px;
  fill: #35553d;
  text-anchor: middle;
  dominant-baseline: middle;
}

.preview {
  position: absolute;
  transform: translate(-50%, -50%);
  min-width: 140px;
  max-width: 180px;
  background: #ffffff;
  border: 1px solid #d9e7d6;
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: 0 8px 22px rgba(35, 58, 39, 0.12);
  z-index: 5;
  pointer-events: none;
}

.preview-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 800;
  color: #2f4d35;
}

.preview-list {
  margin: 0;
  padding-left: 16px;
  color: #3e6045;
  font-size: 12px;
  line-height: 1.35;
}
</style>
