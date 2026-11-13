<script lang="ts" setup>
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import TextLabelPopover from '../popover/TextLabel.vue';
import { Agent, ChatUsage, UsageTotals } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  usage: {
    type:    Object as PropType<ChatUsage | null>,
    default: null,
  },
  agents: {
    type:    Array as PropType<Agent[]>,
    default: () => [],
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

// Compact in the label (e.g. 1.2M), exact values in the popover
const compactFormat = new Intl.NumberFormat(undefined, {
  notation:              'compact',
  maximumFractionDigits: 1
});

const totalLabel = computed(() => t('ai.console.tokenUsage.inTotal', { total: compactFormat.format(props.usage?.totalTokens || 0) }));

const overallRows = computed(() => [
  {
    key:   'inputTokens',
    label: t('ai.console.tokenUsage.input'),
    value: (props.usage?.inputTokens || 0).toLocaleString(),
  },
  {
    key:   'outputTokens',
    label: t('ai.console.tokenUsage.output'),
    value: (props.usage?.outputTokens || 0).toLocaleString(),
  },
  {
    key:   'totalTokens',
    label: t('ai.console.tokenUsage.total'),
    value: (props.usage?.totalTokens || 0).toLocaleString(),
  },
]);

function agentLabel(name: string) {
  const agent = props.agents.find((a) => a.name === name);

  return agent?.displayName || name;
}

function sourceLabel(source: string) {
  const key = `aiConfig.form.section.usage.sources.${ source }`;

  return store.getters['i18n/exists'](key) ? t(key) : source;
}

// eslint-disable-next-line no-unused-vars
function toRows(group: Record<string, UsageTotals> | undefined, label: (key: string) => string) {
  return Object.entries(group || {})
    .map(([key, totals]) => ({
      key,
      label: label(key),
      value: totals.totalTokens.toLocaleString(),
      total: totals.totalTokens,
    }))
    .sort((a, b) => b.total - a.total);
}

const sections = computed(() => [
  {
    key:   'overall',
    title: t('ai.console.tokenUsage.title'),
    rows:  overallRows.value,
  },
  {
    key:   'byAgent',
    title: t('ai.console.tokenUsage.byAgent'),
    rows:  toRows(props.usage?.byAgent, agentLabel),
  },
  {
    key:   'bySource',
    title: t('ai.console.tokenUsage.bySource'),
    rows:  toRows(props.usage?.bySource, sourceLabel),
  },
].filter((section) => section.rows.length));
</script>

<template>
  <div
    class="token-usage label text-deemphasized"
    data-testid="rancher-ai-ui-chat-console-token-usage"
  >
    <span class="token-usage-label">{{ t('ai.console.tokenUsage.label') }}</span>
    <TextLabelPopover
      :label="totalLabel"
      :disabled="props.disabled || !props.usage?.totalTokens"
      data-testid="rancher-ai-ui-chat-console-token-usage-button"
    >
      <div
        class="token-usage-content"
        data-testid="rancher-ai-ui-chat-console-token-usage-content"
      >
        <div
          v-for="section in sections"
          :key="section.key"
          class="token-usage-section"
          :data-testid="`rancher-ai-ui-chat-console-token-usage-${ section.key }`"
        >
          <span class="token-usage-section-title">{{ section.title }}</span>
          <div
            v-for="row in section.rows"
            :key="row.key"
            class="token-usage-row"
            :data-testid="`rancher-ai-ui-chat-console-token-usage-${ section.key }-${ row.key }`"
          >
            <span
              class="token-usage-row-label"
              :title="row.label"
            >{{ row.label }}</span>
            <span
              class="token-usage-row-value"
              :title="row.value"
            >{{ row.value }}</span>
          </div>
        </div>
      </div>
    </TextLabelPopover>
  </div>
</template>

<style lang="scss" scoped>
.token-usage {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  font-size: 12px;

  .token-usage-label {
    flex-shrink: 0;
    white-space: nowrap;
  }

  // Truncate the clickable count instead of overflowing the panel; the popover itself must not be clipped
  :deep(.textlabel-popper) {
    min-width: 0;
  }

  :deep(.textlabel-popper .btn) {
    max-width: 100%;
  }

  :deep(.textlabel-popper .inline-button) {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :deep(.textlabel-popper .v-popper__wrapper) {
    width: auto;
    flex: 1;
    margin: 0 12px;
  }
}

.token-usage-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 200px;
  max-width: 320px;

  .token-usage-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .token-usage-section-title {
    font-family: Lato;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  }

  .token-usage-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-family: Lato;
    font-size: 14px;
    font-weight: 400;
    line-height: 21px;

    .token-usage-row-label {
      flex: 1 1 auto;
      min-width: 100px;
      color: var(--input-label);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .token-usage-row-value {
      flex: 0 1 auto;
      min-width: 0;
      color: var(--body-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
