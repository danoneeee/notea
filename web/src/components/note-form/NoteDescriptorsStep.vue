<script setup lang="ts">
import type { Ref } from 'vue';
import DescriptorWheel from '../DescriptorWheel.vue';

type WheelDescriptor = {
  id: string;
  label: string;
  color: string;
};

type SelectedDescriptor = {
  id: string;
  shortLabel: string;
  fullLabel: string;
  color: string;
};

defineProps<{
  state: {
    selectedDescriptorIds: Ref<string[]>;
    activeFamilyId: Ref<string | null>;
    activeGroupId: Ref<string | null>;
    expandingNodeId: Ref<string | null>;
  };
  wheelDescriptors: WheelDescriptor[];
  wheelCenterLabel: string;
  wheelCenterSubLabel: string;
  descriptorDepth: number;
  previewSubcategories: Record<string, string[]>;
  descriptorBreadcrumb: string[];
  selectedDescriptors: SelectedDescriptor[];
  selectedLimit: number;
  toggleDescriptor: (id: string) => void | Promise<void>;
  goDescriptorBack: () => void;
  clearSelectedDescriptors: () => void;
  removeSelectedDescriptor: (id: string) => void;
}>();
</script>

<template>
  <div class="step-shell descriptor-step">
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
          :selected-ids="state.selectedDescriptorIds.value"
          :center-label="wheelCenterLabel"
          :center-sub-label="wheelCenterSubLabel"
          :center-clickable="Boolean(state.activeFamilyId.value)"
          :expanding-id="state.expandingNodeId.value"
          :fade-others="Boolean(state.expandingNodeId.value)"
          :zoom-level="descriptorDepth"
          :preview-subcategories="previewSubcategories"
          :show-sub-preview="!state.activeGroupId.value"
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
            <span class="selected-count">{{ state.selectedDescriptorIds.value.length }}/{{ selectedLimit }}</span>
            <button v-if="state.selectedDescriptorIds.value.length" class="mini-btn ghost" type="button" @click="clearSelectedDescriptors">
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
</template>

<style scoped>
@import './noteFormShared.css';
</style>
