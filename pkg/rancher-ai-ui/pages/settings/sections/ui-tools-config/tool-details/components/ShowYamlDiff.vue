<script setup lang="ts">
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Preview from '../Preview.vue';
import { UITool } from '../../../../../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:     Object as () => UITool,
    required: true,
  },
  imgPath: {
    type:     String,
    required: true,
  },
});
</script>

<template>
  <div>
    <Preview
      :name="props.tool.name"
      :path="props.imgPath"
      :index="0"
    />
    <Preview
      :name="props.tool.name"
      :path="props.imgPath"
      :index="1"
    />
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

  &-chat-window {
    .img-container {
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      width: 300px;
      height: 369px;
      position: relative;
    }

    .preview-img {
      width: 118%;
      height: 116%;
      object-fit: cover;
      object-position: 100% 11%;
      transform: translateY(-21px);
    }
  }

  &-full-screen {
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
      transform: scale(1.055);
      margin-left: 2px;
      margin-bottom: 2px;
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