<script setup lang="ts">
import { type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { MessageActionSuggestion } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  label: {
    type:    String,
    default: () => '',
  },
  suggestions: {
    type:    Array as PropType<MessageActionSuggestion[]>,
    default: () => ([] as MessageActionSuggestion[]),
  }
});

const emit = defineEmits(['select']);
</script>

<template>
  <div class="suggestions-container">
    <div class="suggestions-header">
      {{ props.label || t('ai.message.suggestions.label') }}
    </div>
    <ul class="suggestions-list">
      <li
        v-for="(suggestion, index) in props.suggestions"
        :key="index"
        class="suggestion-item"
      >
        <RcButton
          tertiary
          small
          :data-testid="`rancher-ai-ui-chat-message-suggestion-${index}`"
          @click="() => emit('select', suggestion)"
        >
          <span class="rc-button-label">
            {{ suggestion }}
          </span>
        </RcButton>
      </li>
    </ul>
  </div>
</template>

<style lang='scss' scoped>
.suggestions-header {
  margin-bottom: 8px;
  font-weight: 600;
}
.suggestions-list {
  padding: 0;
  margin: 0;
  padding-left: 24px;

  li {
    padding: 0;
    margin: 0;
  }
}
.suggestion-item {
  padding: 0;
  margin: 0;
}
.rc-button-label {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}
</style>