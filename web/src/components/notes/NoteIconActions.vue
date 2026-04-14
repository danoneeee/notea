<script setup lang="ts">
defineProps<{
  removing?: boolean;
  editTitle?: string;
  removeTitle?: string;
}>();

const emit = defineEmits<{
  edit: [];
  remove: [];
}>();
</script>

<template>
  <div class="note-actions">
    <button
      class="icon-action"
      type="button"
      :title="editTitle ?? 'Редактировать заметку'"
      :aria-label="editTitle ?? 'Редактировать заметку'"
      @click="emit('edit')"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M13.9 3.1a2 2 0 0 1 2.8 2.8l-8.6 8.6-3.8 1 1-3.8 8.6-8.6Z" />
        <path d="M12.5 4.5l3 3" />
      </svg>
    </button>
    <button
      class="icon-action danger"
      type="button"
      :title="removeTitle ?? 'Удалить заметку'"
      :aria-label="removeTitle ?? 'Удалить заметку'"
      :disabled="removing"
      @click="emit('remove')"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4.5 5.5h11" />
        <path d="M7.5 5.5v-1a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
        <path d="M6.5 7.5v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-7" />
        <path d="M8.5 9v4.5" />
        <path d="M11.5 9v4.5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.note-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d6e5d3;
  background: #fbfdf8;
  color: #34533a;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}

.icon-action svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-action:hover {
  color: #1f4d28;
  border-color: #bfd4b8;
}

.icon-action.danger {
  color: #8e3142;
}

.icon-action.danger:hover {
  border-color: #e6c5cb;
}

.icon-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
