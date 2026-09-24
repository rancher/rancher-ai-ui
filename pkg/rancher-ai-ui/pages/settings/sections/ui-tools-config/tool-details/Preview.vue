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
  <div
    class="preview-section"
    @click="openImageFullScreen"
    @keydown.enter.stop="openImageFullScreen"
  >
    <div class="img-container">
      <div
        v-if="isLoading"
        class="spinner-wrapper"
        role="status"
        aria-live="polite"
      >
        <i class="icon icon-spinner icon-spin icon-3x" />
        <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;">Loading preview...</span>
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
  </div>
</template>

<style lang="scss" scoped>
.preview-section {
  padding: 12px 16px;

  .img-container {
    min-height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
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