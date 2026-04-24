<script setup lang="ts">
import { type PropType } from 'vue';
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import BubbleButton from '../components/message/BubbleButton.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  label: {
    type:    String,
    default: () => '',
  },
  icon: {
    type:    String,
    default: () => '',
  },
  options: {
    type:    Array as PropType<string[]>,
    default: () => ([] as string[]),
  },
  showEdit: {
    type:    Boolean,
    default: false,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['select', 'edit']);

const hoveredIndex = ref<number | null>(null);
</script>

<template>
  <div class="list-options-container">
    <div class="list-options-header">
      <span v-clean-html="props.label" />
      <i
        v-if="props.icon"
        :class="`icon ${props.icon}`"
      />
    </div>
    <ul class="list-options-list">
      <li
        v-for="(option, index) in props.options"
        :key="index"
        class="list-options-item"
      >
        <div
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = null"
        >
          <div class="button-group">
            <RcButton
              class="button-group-label"
              tertiary
              small
              :data-testid="`rancher-ai-ui-chat-message-suggestion-${index}`"
              :disabled="props.disabled"
              @click="() => emit('select', option)"
            >
              <span class="rc-button-label">
                {{ option }}
              </span>
            </RcButton>
            <BubbleButton
              v-clean-tooltip="{ content: t('ai.tools.suggestions.action.edit'), delay: { show: 300 } }"
              class="button-group-action"
              :class="{ hidden: !(props.showEdit && hoveredIndex === index) }"
              :icon="'icon-edit'"
              @click="() => emit('edit', option)"
            />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style lang='scss' scoped>
.list-options-header {
  margin-bottom: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;

  .icon {
    font-weight: 600;
  }
}

.list-options-list {
  padding: 0 0 0 24px;
  margin: 0;
  list-style-position: outside;
  list-style-type: disc;

  li {
    padding: 0;
    margin: 0;

    &::marker {
      color: var(--primary);
      font-size: 15px;
    }

    .btn-sm {
      line-height: 24px;
      min-height: 24px;
    }
  }
}

.list-options-item {
  padding: 0;
  margin: 0;
  // width: fit-content;
}

.button-group {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 2px;

  &-action {
    &.hidden {
      visibility: hidden;
    }
  }
}

.rc-button-label {
  word-break: break-word;
  white-space: normal;
  text-align: left;
}

.bubble-action-btn {
  width: 26px;
  height: 26px;
  min-width: 26px;
  max-width: 26px;
}
</style>