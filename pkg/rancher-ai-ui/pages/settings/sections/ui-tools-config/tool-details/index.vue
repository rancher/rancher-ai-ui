<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import { defineAsyncComponent, onMounted, shallowRef } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { UITool } from '../../../../../types';
import { warn } from '../../../../../utils/log';

const store = useStore();
const { t } = useI18n(store);

const BASE_PATH = 'https://raw.githubusercontent.com/torchiaf/rancher-ai-ui/feature-ui-tools-preview/assets/ui-tools/screenshots';

const props = defineProps({
  tool: {
    type:     Object as () => UITool,
    required: true,
  },
});

const component = shallowRef<any>(null);

function loadComponent() {
  const path = upperFirst(camelCase(props.tool.name));

  try {
    component.value = defineAsyncComponent(() => import(`./components/${ path }.vue`));
  } catch (error) {
    warn(`Tool component not found: ${ path }.vue`, error);
  }
}

function close() {
  store.commit('slideInPanel/close');
}

onMounted(loadComponent);
</script>

<template>
  <div
    id="tool-details-slide-in"
    class="tool-details"
  >
    <!-- Close button for focus-trap -->
    <button
      class="close-button"
      aria-label="Close panel"
      @click="close"
    >
      <i class="icon icon-close" />
    </button>

    <div class="details-container">
      <div class="info-section">
        <h2 class="tool-name">
          {{ t(`aiConfig.form.section.tools.fields.tools.name.${ props.tool.name }`) }}
        </h2>
        <div class="tool-description">
          {{ props.tool.description }}
        </div>
        <div class="tool-category">
          <span class="label">
            {{ t('aiConfig.form.section.tools.details.category') }}
          </span>
          <span class="value">
            {{ props.tool.category }}
          </span>
        </div>
        <component
          v-if="component"
          :is="component"
          :tool="props.tool"
          :img-path="BASE_PATH"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tool-details {
  position: relative;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 4px;
  min-height: 400px;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  .icon {
    font-size: 20px;
    color: #333;
  }
}

.details-container {
  display: flex;
  flex-direction: column;
  gap: 30px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tool-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.tool-description {
  color: #666;
  line-height: 1.5;
  font-size: 14px;
}

.tool-category {
  display: flex;
  gap: 8px;
  font-size: 14px;

  .label {
    font-weight: 600;
    color: #333;
  }

  .value {
    color: #666;
  }
}
</style>