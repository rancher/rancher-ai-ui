<script setup lang="ts">
import { useI18n } from '@shell/composables/useI18n';
import { useStore } from 'vuex';
import { UITool } from '../../../../../types';
import Preview from './Preview.vue';

const store = useStore();
const { t } = useI18n(store);

const BASE_PATH = 'https://raw.githubusercontent.com/torchiaf/rancher-ai-ui/feature-ui-tools-preview/assets/ui-tools/screenshots';

const props = defineProps({
  tool: {
    type:     Object as () => UITool,
    required: true,
  },
});

function close() {
  store.commit('slideInPanel/close');
}
</script>

<template>
  <div class="tool-info-container">
    <div class="tool-header">
      <div class="tool-title">
        <h2 class="tool-name">
          {{ t(`aiConfig.form.section.tools.fields.tools.name.${ props.tool.name }`) }}
        </h2>
        <p class="tool-description">
          {{ props.tool.description }}
        </p>
      </div>
      <button
        class="tool-close-btn"
        :aria-label="t('common.closePanel')"
        @click="close()"
      >
        <i class="icon icon-close" />
      </button>
    </div>

    <div class="tool-category">
      <i class="category-icon icon icon-category-alt" />
      <span class="category-value">
        {{ props.tool.category }}
      </span>
    </div>

    <div class="tool-scrollable-content">
      <div class="tool-detail-section">
        <h3>{{ t('aiConfig.form.section.tools.details.detail', 'DETAIL') }}</h3>
        <span
          v-clean-html="t(`aiConfig.form.section.tools.details.tools.${ props.tool.name }.detail`)"
          class="detail-content"
        ></span>
      </div>

      <div class="tool-content-section">
        <Preview
          :name="props.tool.name"
          :path="BASE_PATH"
          :index="0"
        />
      </div>

      <div class="tool-metadata-section">
        <h3>{{ t('aiConfig.form.section.tools.details.usage', 'Usage') }}</h3>
        <span
          v-clean-html="t(`aiConfig.form.section.tools.details.tools.${ props.tool.name }.usage`)"
          class="metadata-content"
        ></span>
      </div>

      <div class="tool-content-section">
        <Preview
          :name="props.tool.name"
          :path="BASE_PATH"
          :index="1"
        />
      </div>

      <div class="tool-metadata-section">
        <h3>{{ t('aiConfig.form.section.tools.details.support', 'Support') }}</h3>
        <span
          v-clean-html="''"
          class="metadata-content"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.slide-in-open {
  height: 100vh !important;
}
</style>

<style lang="scss" scoped>
.tool-info-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tool-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tool-title {
  flex: 1;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text, #333);
    text-transform: capitalize;
  }
}

.tool-close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  i {
    font-size: 20px;
    color: var(--text, #333);
    opacity: 0.6;
  }

  &:hover {
    background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));

    i {
      opacity: 0.8;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--focus, #0066cc);
    outline-offset: -2px;
  }
}

.tool-description {
  font-size: 14px;
  color: var(--text, #666);
  line-height: 1.5;
  margin: 8px 0 0 0;
}

.tool-category {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  margin-bottom: 24px;
  border: 1px solid transparent;
  border-radius: 20px;
  flex-shrink: 0;

  .category-icon {
    font-size: 16px;
    color: var(--link-text-secondary);
  }

  .category-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--link-text-secondary);
    user-select: none;
    text-transform: capitalize;
  }
}

.tool-scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.tool-detail-section,
.tool-metadata-section {
  margin-bottom: 32px;

  h3 {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--disabled-text, #999);
    margin: 0 0 12px 0;
  }
}

.detail-content,
.metadata-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text, #333);

  a {
    color: var(--link, #0066cc);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  p {
    margin: 0 0 12px 0;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.tool-content-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
}
</style>