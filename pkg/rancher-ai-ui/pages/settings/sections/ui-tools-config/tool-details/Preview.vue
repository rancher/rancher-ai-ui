<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps({
  name: {
    type:     String,
    required: true,
  },
  path: {
    type:     String,
    required: true,
  },
  index: {
    type:     Number,
    default: 0,
  }
});

const path = computed(() => `${ props.path }/${ props.name }_${ props.index }.png`);

const isLoading = ref(true);

const isHovering = ref(false);

const mouseX = ref(0);

const mouseY = ref(0);

const handleImageLoad = () => {
  isLoading.value = false;
};

const handleImageError = () => {
  isLoading.value = false;
};

const handleMouseEnter = () => {
  isHovering.value = true;
};

const handleMouseLeave = () => {
  isHovering.value = false;
};

const handleMouseMove = (e: MouseEvent) => {
  const img = e.currentTarget as HTMLImageElement;
  const rect = img.getBoundingClientRect();

  // Calculate mouse position relative to image (0 to 1)
  mouseX.value = (e.clientX - rect.left) / rect.width;
  mouseY.value = (e.clientY - rect.top) / rect.height;
};

const openImageFullScreen = () => {
  window.open(path.value, '_blank');
};
</script>

<template>
  <div
    class="preview-section"
  >
    <div class="img-container">
      <div
        v-if="isLoading"
        class="spinner-wrapper"
      >
        <i class="icon icon-spinner icon-spin icon-3x" />
      </div>
      <img
        :src="path"
        :alt="`${props.name} preview`"
        class="preview-img"
        :class="{ 'is-loaded': !isLoading, 'is-hovering': isHovering }"
        :style="isHovering ? { transformOrigin: `${mouseX * 100}% ${mouseY * 100}%` } : {}"
        @load="handleImageLoad"
        @error="handleImageError"
        @click="openImageFullScreen"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @mousemove="handleMouseMove"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-section {
  padding: 12px 16px;

  .img-container {
    background: var(--body-bg);
    border: 1px solid var(--disabled-text);
    border-radius: 4px;
    min-height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .preview-img {
    max-width: 100%;
    max-height: 400px;
    object-fit: cover;
    width: 100%;
    height: 100%;
    transform: scale(1.055); // Slight zoom to cover the container better
    margin-left: 2px;
    margin-bottom: 2px;
    cursor: zoom-in;
    transition: transform 0.3s ease;

    &.is-hovering {
      transform: scale(1.4);
      cursor: zoom-out;
    }
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

.preview-img.is-loaded {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>