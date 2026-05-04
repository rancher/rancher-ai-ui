<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Banner from '@components/Banner/Banner.vue';
import RcButton from '@components/RcButton/RcButton.vue';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { ToolsDefinitionActionType } from '../../../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  requiredAction: {
    type:    String as () => ToolsDefinitionActionType,
    default: ToolsDefinitionActionType.None,
  },
  readOnly: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['publish:tools']);

const toolsDefinitionActionBanner = computed(() => {
  const user = props.readOnly ? 'user' : 'admin';
  const type = props.requiredAction;

  return {
    color: type === ToolsDefinitionActionType.Create ? 'info' : 'warning',
    key:   `aiConfig.form.section.tools.publish.message.${ user }.${ type }.label`,
  };
});

const docsUrl = 'https://rancher.github.io/rancher-ai-product-docs/rancher-ai/latest/en/introduction.html';
</script>

<template>
  <div class="ui-tools-definition-notice">
    <!-- Action Banner Section -->
    <div
      v-if="props.requiredAction !== ToolsDefinitionActionType.None"
      class="tools-action-section"
    >
      <Banner
        class="m-0"
        :color="toolsDefinitionActionBanner.color"
      >
        <RichTranslation :k="toolsDefinitionActionBanner.key">
          <template #documentation="{ content }">
            <a
              :href="docsUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ content }}
              <i class="icon icon-external-link" />
            </a>
          </template>
        </RichTranslation>
      </Banner>
      <RcButton
        v-if="!props.readOnly"
        primary
        @click="emit('publish:tools')"
      >
        {{ t(`aiConfig.form.section.tools.publish.message.admin.${ props.requiredAction }.action.label`, {}, true) }}
      </RcButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tools-action-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;

  .m-0 {
    margin: 0;
  }
}
</style>
