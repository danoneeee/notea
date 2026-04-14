<script setup lang="ts">
import type { NoteSyncStatus } from '../../services/notes';
import { getNoteSyncLabel, getNoteSyncMarkerTone, shouldShowNoteSyncMarker } from '../../services/notePresentation';

const props = defineProps<{
  status?: NoteSyncStatus | null;
  className?: string;
}>();
</script>

<template>
  <span
    v-if="shouldShowNoteSyncMarker(props.status)"
    class="sync-marker"
    :class="className"
    :title="getNoteSyncLabel(props.status)"
    :aria-label="getNoteSyncLabel(props.status)"
  >
    <svg v-if="props.status === 'local'" viewBox="0 0 20 20" class="sync-cloud" aria-hidden="true">
      <path d="M6.4 15.2a3.6 3.6 0 1 1 .8-7.1 4.2 4.2 0 0 1 8 1.6 2.7 2.7 0 1 1 .4 5.5H6.4Z" />
      <path d="M4 4l12 12" />
    </svg>
    <span v-else class="sync-dot" :class="getNoteSyncMarkerTone(props.status)"></span>
  </span>
</template>

<style scoped>
.sync-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sync-cloud {
  width: 16px;
  height: 16px;
  stroke: #c77c11;
  fill: rgba(224, 154, 47, 0.15);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sync-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.sync-dot.local {
  background: #e09a2f;
}

.sync-dot.syncing {
  background: #4b8ac0;
}

.sync-dot.error {
  background: #a93646;
}
</style>
