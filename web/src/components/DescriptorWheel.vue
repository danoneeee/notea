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
  /** 0..1 насыщенность по id семейства: блеклый → цвет; если передан, заливка heatmap вместо selected. */
  segmentIntensity?: Record<string, number>;
  centerLabel?: string;
  centerSubLabel?: string;
  centerClickable?: boolean;
  expandingId?: string | null;
  fadeOthers?: boolean;
  zoomLevel?: number;
  previewSubcategories?: Record<string, string[]>;
  showSubPreview?: boolean;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  centerClick: [];
}>();

function isSelected(id: string) {
  return props.selectedIds.includes(id);
}

function heatMixWhitePct(id: string): string {
  const raw = props.segmentIntensity?.[id] ?? 0;
  const t = Math.min(1, Math.max(0, raw));
  // Не встречались (t≈0) — почти серо-белые «призраки»; насыщение нарастает нелинейно.
  const curved = Math.pow(t, 1.2);
  const pct = Math.round(98 - curved * 92);
  return `${Math.min(98, Math.max(4, pct))}%`;
}

/** Цвет и плотность подписи по той же шкале, что и заливка сегмента */
function labelHeatStyle(id: string): Record<string, string> {
  const raw = props.segmentIntensity?.[id] ?? 0;
  const t = Math.min(1, Math.max(0, raw));
  const curved = Math.pow(t, 1.15);
  const faint = '#bcc8c0';
  const strong = '#0d2818';
  return {
    fill: `color-mix(in srgb, ${strong} ${(curved * 100).toFixed(1)}%, ${faint})`,
    opacity: String(0.38 + curved * 0.62),
    fontWeight: curved > 0.22 ? '800' : '600',
  };
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

const wheelScale = computed(() => {
  const level = Math.min(2, Math.max(0, props.zoomLevel ?? 0));
  return 1 + level * 0.1;
});

const segmentRenderKey = computed(() => props.descriptors.map((segment) => segment.id).join('|'));
</script>

<template>
  <div class="wheel-wrap">
    <svg
      class="wheel"
      :viewBox="`0 0 ${size} ${size}`"
      :style="{ '--wheel-scale': String(wheelScale) }"
      role="img"
      aria-label="Круг дескрипторов"
    >
      <circle class="halo-ring" :cx="center" :cy="center" :r="outerRadius + 10" />
      <transition-group :key="segmentRenderKey" name="segment-swap" tag="g">
        <g
          v-for="segment in segments"
          :key="segment.id"
          class="segment-group"
          :class="{
            'is-expanding': props.expandingId === segment.id,
            'is-faded': props.fadeOthers && props.expandingId && props.expandingId !== segment.id,
          }"
          @mouseenter="setHovered(segment.id)"
          @mouseleave="setHovered(null)"
        >
          <path
            class="segment"
            :class="{
              selected: isSelected(segment.id) && !props.segmentIntensity,
              heat: !!props.segmentIntensity,
            }"
            :d="segment.path"
            :style="{
              '--segment-color': segment.color,
              '--heat-white': props.segmentIntensity ? heatMixWhitePct(segment.id) : undefined,
            }"
            @click="emit('toggle', segment.id)"
          />
          <text
            class="segment-label"
            :style="props.segmentIntensity ? labelHeatStyle(segment.id) : undefined"
            :x="segment.labelX"
            :y="segment.labelY"
            :transform="`rotate(${segment.textRotation} ${segment.labelX} ${segment.labelY})`"
          >
            {{ segment.label }}
          </text>
        </g>
      </transition-group>
      <g
        class="center-action"
        :class="{ clickable: props.centerClickable }"
        @click="props.centerClickable ? emit('centerClick') : undefined"
      >
        <circle class="center-shadow" :cx="center" :cy="center" :r="innerRadius - 2" />
        <circle class="center-circle" :cx="center" :cy="center" :r="innerRadius - 8" />
        <text class="center-label" :x="center" :y="center - (props.centerSubLabel ? 8 : 0)">
          {{ props.centerLabel ?? 'ВКУС' }}
        </text>
        <text v-if="props.centerSubLabel" class="center-sublabel" :x="center" :y="center + 18">
          {{ props.centerSubLabel }}
        </text>
      </g>
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
  transform: scale(var(--wheel-scale, 1));
  transform-origin: center;
  transition: transform 0.28s ease-in-out;
}

.halo-ring {
  fill: none;
  stroke: rgba(163, 190, 166, 0.28);
  stroke-width: 10;
}

.segment-group {
  transition: opacity 0.22s ease-in-out, transform 0.24s ease-in-out;
  transform-origin: center;
}

.segment-group.is-expanding {
  transform: scale(1.14);
}

.segment-group.is-faded {
  opacity: 0.2;
}

.segment {
  fill: color-mix(in srgb, var(--segment-color), white 58%);
  stroke: rgba(255, 255, 255, 0.96);
  stroke-width: 2.4;
  cursor: pointer;
  transition: fill 0.18s ease-in-out, stroke-width 0.18s ease-in-out, opacity 0.18s ease-in-out;
}

.segment.heat {
  fill: color-mix(in srgb, var(--segment-color), white var(--heat-white, 98%));
  transition: fill 0.32s ease-in-out, opacity 0.2s ease-in-out;
}

.segment:not(.heat):hover {
  fill: color-mix(in srgb, var(--segment-color), white 40%);
}

.segment.heat:hover {
  opacity: 0.94;
}

.segment-group:hover {
  transform: scale(1.025);
}

.selected {
  fill: color-mix(in srgb, var(--segment-color), white 18%);
  stroke: #ffffff;
  stroke-width: 2.8;
}

.segment.heat.selected {
  /* в режиме heat не используем .selected */
  fill: color-mix(in srgb, var(--segment-color), white var(--heat-white, 98%));
}

.segment-label {
  font-size: 12px;
  font-weight: 800;
  fill: #2b4430;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  transition: fill 0.4s ease, opacity 0.4s ease, font-weight 0.25s ease;
  letter-spacing: 0.01em;
}

.center-action {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.18s ease-in-out;
}

.center-action.clickable {
  cursor: pointer;
}

.center-action.clickable:hover {
  transform: scale(1.018);
}

.center-shadow {
  fill: rgba(47, 123, 61, 0.08);
}

.center-circle {
  fill: #ffffff;
  stroke: #d8e5d5;
  stroke-width: 1.8;
}

.center-label {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 1px;
  fill: #35553d;
  text-anchor: middle;
  dominant-baseline: middle;
}

.center-sublabel {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  fill: #78917d;
  text-anchor: middle;
  dominant-baseline: middle;
}

.preview {
  position: absolute;
  transform: translate(-50%, -50%);
  min-width: 170px;
  max-width: 220px;
  background: #ffffff;
  border: 1px solid #d9e7d6;
  border-radius: 10px;
  padding: 10px 12px;
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

.segment-swap-enter-active,
.segment-swap-leave-active {
  transition: opacity 0.22s ease-in-out, transform 0.22s ease-in-out;
  transform-origin: center;
}

.segment-swap-enter-from,
.segment-swap-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
