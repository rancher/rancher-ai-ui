<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps({
  name: {
    type:    String,
    default: '',
  },
  path: {
    type:    String,
    default: '',
  },
  index: {
    type:    Number,
    default: 0,
  }
});

const path = computed(() => `${ props.path }/${ props.name }_${ props.index }.png`);

const isLoading = ref(true);
const isError = ref(false);

const handleImageLoad = () => {
  isLoading.value = false;
};

const handleImageError = () => {
  isLoading.value = false;
  isError.value = true;
};

const openImageFullScreen = () => {
  if (isError.value) {
    return;
  }

  window.open(path.value, '_blank');
};
</script>

<template>
  <button
    type="button"
    class="preview-section"
    :class="{ 'is-error': isError }"
    :aria-label="t('aiConfig.form.section.tools.details.image-preview.placeholder', { toolName: props.name, pos: props.index + 1 }, true)"
    @click="openImageFullScreen"
  >
    <div class="img-container">
      <div
        v-if="isLoading"
        class="spinner-wrapper"
        role="status"
        aria-live="polite"
      >
        <i class="icon icon-spinner icon-spin icon-3x" />
        <span class="sr-only">
          {{ t('aiConfig.form.section.tools.details.image-preview.loading') }}
        </span>
      </div>
      <div
        v-if="isError"
        class="preview-unavailable"
        role="alert"
        :aria-label="t('aiConfig.form.section.tools.details.image-preview.error')"
      >
        <i class="icon icon-warning" />
        <span>{{ t('aiConfig.form.section.tools.details.image-preview.error') }}</span>
      </div>
      <img
        v-else
        role="presentation"
        :src="path"
        :alt="`&nbsp;${ t('aiConfig.form.section.tools.details.image-preview.placeholder', { toolName: props.name, pos: props.index + 1 }, true) }`"
        class="preview-img"
        :class="{
          'is-loaded': !isLoading,
          'is-error': isError
        }"
        @load="handleImageLoad"
        @error="handleImageError"
      />
    </div>
  </button>
</template>

<style lang="scss" scoped>
.preview-section {
  background: transparent;
  width: 100%;
  padding: 12px 16px;

  .img-container {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    width: 100%;
    min-height: 250px;
  }

  .preview-img {
    max-width: 100%;
    max-height: 400px;
    object-fit: cover;
    width: 100%;
    height: 100%;
    cursor: pointer;
    margin-top: 4px;
    transform: scaleX(1.06) scaleY(1.09);
    transform-origin: center;
  }

  &.is-error {
    cursor: not-allowed;
  }

  &:focus-visible {
    @include focus-outline;
    outline-offset: -2px;
  }
}

.spinner-wrapper {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.preview-unavailable {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--warning-banner-bg);
  border-color: var(--warning);
  color: var(--body-text);
  padding: 8px 12px;
  border-radius: 4px;
  white-space: nowrap;
}

.preview-img.is-loaded {
  animation: fadeIn 0.3s ease-in;
}

.preview-img.is-error {
  width: 50%;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .preview-img.is-loaded {
    animation: none;
    opacity: 1;
  }
}
</style>