<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import ContextTag from '../context/ContextTag.vue';

const store = useStore();
const { t } = useI18n(store);

const isCollapsed = ref(false);

interface Props {
  links?: string[];
}
const { links = [] } = defineProps<Props>();

const items = computed(() => {
  return links.map((value) => {
    // Remove trailing slash if present
    const url = value?.endsWith('/') ? value.slice(0, -1) : value;

    // Extract last chunk of the URL path for label and normalize it (e.g., "my-link-name" -> "My Link Name")
    const chunks = url?.split('/') || [];
    const lastChunk = chunks[chunks.length - 1] || '';
    const label = lastChunk
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      label: label || 'Link',
      value
    };
  });
});

function openLink(url: string) {
  window.open(url, '_blank');
}

</script>

<template>
  <div class="chat-source-container">
    <div class="chat-msg-source-label">
      <span>{{ t('ai.message.source.label') }}</span>
      <i
        class="icon icon-sm"
        :class="{
          'icon icon-chevron-up text-label': !isCollapsed,
          'icon icon-chevron-down text-label': isCollapsed
        }"
        @click="isCollapsed = !isCollapsed"
      />
    </div>
    <div
      v-if="!isCollapsed"
      class="chat-msg-source-tags"
    >
      <div
        v-for="(item, index) in items"
        :key="item.value"
        @click="openLink(item.value)"
      >
        <span class="sr-only">{{ t('ai.generic.opensInNewTab') }}</span>
        <ContextTag
          :data-testid="`rancher-ai-ui-chat-message-source-link-${ index }`"
          :remove-enabled="false"
          :item="{ value: item.label }"
          type="user"
          class="chat-msg-source-tag"
        />
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-msg-source-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9fabc6;

  span {
    font: 9px sans-serif;
    font-weight: 500;
  }
}

.chat-msg-source-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.chat-msg-source-tag {
  height: auto;
  color: #9fabc6;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 0.75rem;
  border: 1px solid #9fabc6;
  cursor: pointer;
  line-height: normal;
}

// Only display content to screen readers
.sr-only {
  visibility: hidden;
}
</style>
