<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';

const store = useStore();
const { t } = useI18n(store);

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

const path = computed(() => `${props.path}/${props.name}_${props.index}.png`);

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
  console.log('Opening image in full screen:', path.value);
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
        <div class="spinner" />
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
  h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .img-container {
    background: white;
    border: 1px solid #ddd;
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
    cursor: pointer;



    transition: transform 0.3s ease;

    &.is-hovering {
      transform: scale(1.4);
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

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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