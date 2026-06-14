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
      <div class="tool-actions">
        <div class="header__buttons">
          <div
            class="header__button"
            role="button"
            tabindex="0"
            @click="close()"
            @keydown.enter.space="close()"
          >
            <i class="icon icon-close" />
          </div>
        </div>
      </div>
    </div>

    <div class="tool-category">
      <i class="category-icon icon icon-category-alt" />
      <span class="category-value">
        {{ props.tool.category }}
      </span>
    </div>

    <div class="tool-revision-section">
      <h3>{{ t('aiConfig.form.section.tools.details.revision') }}</h3>
      <span class="tool-revision">
        v{{ props.tool.revision }}
      </span>
    </div>

    <div class="tool-scrollable-content">
      <div class="tool-detail-section">
        <h3>{{ t('aiConfig.form.section.tools.details.detail') }}</h3>
        <span
          v-clean-html="t(`aiConfig.form.section.tools.details.tools.${ props.tool.name }.detail`)"
          class="detail-content"
        />
      </div>

      <div class="tool-preview-container">
        <Preview
          :name="props.tool.name"
          :path="BASE_PATH"
          :index="0"
        />
      </div>

      <div class="tool-usage-section">
        <h3>{{ t('aiConfig.form.section.tools.details.usage') }}</h3>
        <span
          v-clean-html="t(`aiConfig.form.section.tools.details.tools.${ props.tool.name }.usage`)"
          class="usage-content"
        />
      </div>

      <div class="tool-preview-container">
        <Preview
          :name="props.tool.name"
          :path="BASE_PATH"
          :index="1"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tool-info-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 2px; // + 10px from main-panel = 12px total
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

.tool-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header__buttons {
    display: flex;
  }

  .header__button {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;

    > i {
      font-size: 20px;
      opacity: 0.5;
    }

    &:hover {
      background-color: var(--wm-closer-hover-bg);
    }

    &:focus-visible {
      @include focus-outline;
      outline-offset: -2px;
    }
  }
}

.tool-description {
  font-size: 15px;
}

.tool-category {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  margin-bottom: 24px;

  .category-icon {
    font-size: 16px;
    color: var(--link-text-secondary);
    margin-right: 8px;
  }

  .category-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--link-text-secondary);
    user-select: none;
    text-transform: capitalize;
  }
}

.tool-revision {
  display: block;
  color: var(--info-text);
  background: var(--info);
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
  user-select: none;
}

.tool-scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.tool-revision-section,
.tool-detail-section,
.tool-usage-section {
  margin-bottom: 8px;

  h3 {
    font-size: 14px;
    text-transform: uppercase;
    color: var(--disabled-text);
    margin: 0 0 12px 0;
  }
}

.tool-revision-section {
  margin-bottom: 32px;
}

.detail-content,
.usage-content {
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

.tool-preview-container {
  margin-bottom: 28px;
}
</style>