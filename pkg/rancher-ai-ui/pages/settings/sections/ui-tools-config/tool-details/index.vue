<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { PRODUCT_NAME } from '../../../../../product';
import { createFocusTrap, FocusTrap } from 'focus-trap';
import { UITool } from '../../../../../types';
import { remoteAssetsBasePath } from '../../../../../utils/version';
import Preview from './Preview.vue';

const store = useStore();
const { t } = useI18n(store);

const isDev = (store as any).$extension.getPlugins()?.[PRODUCT_NAME];
const BASE_PATH = `${ remoteAssetsBasePath(isDev) }/ui-tools/screenshots`;

const tool = ref<UITool | null>(null);
const slideInPanel = ref<HTMLElement | null>(null);
const showSlideInPanel = ref(false);
const isActive = ref(false);
const focusTrap = ref<FocusTrap | null>(null);
const triggerElement = ref<HTMLElement | null>(null);

function show(value: UITool, sourceElement: HTMLElement) {
  triggerElement.value = sourceElement;
  tool.value = value;

  showSlideInPanel.value = true;

  activateFocusTrap();
}

function hide() {
  deactivateFocusTrap();
  showSlideInPanel.value = false;

  // Restore focus to the source element
  nextTick(() => {
    if (triggerElement.value) {
      triggerElement.value.focus();
    }
  });
}

function onEnter() {
  isActive.value = true;
}

function onLeave() {
  isActive.value = false;
}

function activateFocusTrap() {
  nextTick(() => {
    if (slideInPanel.value && !focusTrap.value) {
      focusTrap.value = createFocusTrap(slideInPanel.value, {
        escapeDeactivates: false,
        allowOutsideClick: true,
      });

      focusTrap.value.activate();
    }
  });
}

function deactivateFocusTrap() {
  if (focusTrap.value) {
    focusTrap.value.deactivate();
    focusTrap.value = null;
  }

  slideInPanel.value = null;
}

defineExpose({
  show,
  hide
});

onBeforeUnmount(() => {
  deactivateFocusTrap();
});
</script>

<template>
  <div class="tool-info-panel">
    <div
      v-if="showSlideInPanel"
      class="glass"
      @click="hide()"
    />
    <transition
      name="slide"
      @after-enter="onEnter"
      @after-leave="onLeave"
    >
      <aside
        v-show="showSlideInPanel && tool"
        ref="slideInPanel"
        class="slideIn"
        :class="{'active': isActive}"
        @keydown.esc="hide()"
      >
        <div
          class="tool-info-container"
          data-testid="rancher-ai-ui-tool-info-panel-detail"
        >
          <div class="tool-header">
            <div class="tool-title">
              <h2 class="tool-name">
                {{ t(`aiConfig.form.section.tools.fields.tools.name.${ tool?.name }`) }}
              </h2>
              <p class="tool-description">
                {{ tool?.description }}
              </p>
            </div>
            <div class="tool-close">
              <div class="slideIn__header__buttons">
                <button
                  class="slideIn__header__button"
                  role="button"
                  :aria-label="t('generic.close')"
                  tabindex="0"
                  @click="hide()"
                  @keydown.enter.space="hide()"
                >
                  <i
                    class="icon icon-close"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>

          <div class="tool-category">
            <i
              class="category-icon icon icon-category-alt"
              aria-hidden="true"
            />
            <span class="category-value">
              {{ tool?.category }}
            </span>
          </div>

          <div class="tool-revision-section">
            <h3>{{ t('aiConfig.form.section.tools.details.revision') }}</h3>
            <span class="tool-revision">
              v{{ tool?.revision }}
            </span>
          </div>

          <div class="tool-detail-section">
            <h3>{{ t('aiConfig.form.section.tools.details.detail') }}</h3>
          </div>

          <div
            class="tool-scrollable-content"
            role="region"
            :aria-label="t('aiConfig.form.section.tools.details.detail')"
            tabindex="0"
          >
            <div class="tool-detail-section">
              <span
                v-clean-html="t(`aiConfig.form.section.tools.details.tools.${ tool?.name }.detail`)"
                class="detail-content"
              />
            </div>

            <div class="tool-preview-container">
              <Preview
                :key="`${tool?.name}_0`"
                :name="tool?.name"
                :path="BASE_PATH"
                :index="0"
                tabindex="0"
              />
            </div>

            <div class="tool-usage-section">
              <h2>{{ t('aiConfig.form.section.tools.details.usage') }}</h2>
              <span
                v-clean-html="t(`aiConfig.form.section.tools.details.tools.${ tool?.name }.usage`)"
                class="usage-content"
              />
            </div>

            <div class="tool-preview-container">
              <Preview
                :key="`${tool?.name}_1`"
                :name="tool?.name"
                :path="BASE_PATH"
                :index="1"
                tabindex="0"
              />
            </div>
          </div>
        </div>
      </aside>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
  .tool-info-panel {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 25;

    $slideout-width: 35%;
    $header-height: 54px;

    .glass {
      z-index: 9;
      position: fixed;
      top: $header-height;
      height: calc(100% - $header-height);
      left: 0;
      width: 100%;
      opacity: 0;
    }

    .slideIn {
      border-left: var(--header-border-size) solid var(--header-border);
      border-top: var(--header-border-size) solid var(--header-border);
      position: fixed;
      top: $header-height;
      right: -$slideout-width;
      height: calc(100% - $header-height);
      background-color: var(--topmenu-bg);
      width: $slideout-width;
      z-index: 10;
      display: flex;
      flex-direction: column;
      padding: 12px;

      &.active {
        right: 0;
      }

      /* Enter animation */
      &.slide-enter-active {
        transition: right 0.5s ease;
      }

      &.slide-leave-active {
        transition: right 0.5s ease;
      }

      &.slide-enter-from,
      &.slide-leave-to {
        right: -$slideout-width;
      }

      &.slide-enter-to,
      &.slide-leave-from {
        right: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        &.slide-enter-active,
        &.slide-leave-active {
          transition: none;
        }
      }

      &__header__buttons {
        display: flex;
      }

      &__header__button {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        background-color: transparent;

        line-height: 0;
        min-height: 0;

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
  }

  .tool-info-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    padding: 2px; // + 10px from main-panel = 12px total
    user-select: text;
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

    .tool-title {
      flex: 1;
    }

    .tool-name {
      text-transform: capitalize;
    }
  }

  .tool-close {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    user-select: text;
  }

  .tool-scrollable-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;

    &:focus-visible {
      @include focus-outline;
    }
  }

  .tool-revision-section,
  .tool-detail-section,
  .tool-usage-section {
    margin-bottom: 8px;
    user-select: text;
  }

  .tool-revision-section,
  .tool-detail-section {
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