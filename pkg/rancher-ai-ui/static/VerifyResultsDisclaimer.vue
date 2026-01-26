<script lang="ts" setup>
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';

const store = useStore();
const { t } = useI18n(store);
</script>

<template>
  <div class="disclaimer">
    <div class="disclaimer-section">
      <span class="disclaimer-section-title">
        {{ t('ai.agent.verifyResults.disclaimer.section1.title') }}
      </span>
      <span class="disclaimer-section-body">
        {{ t('ai.agent.verifyResults.disclaimer.section1.body') }}
      </span>
    </div>
    <div class="disclaimer-section">
      <span class="disclaimer-section-title">
        {{ t('ai.agent.verifyResults.disclaimer.section2.title') }}
      </span>
      <span class="disclaimer-section-body">
        {{ t('ai.agent.verifyResults.disclaimer.section2.body') }}
      </span>
    </div>
    <div class="disclaimer-section">
      <span class="disclaimer-section-title">
        {{ t('ai.agent.verifyResults.disclaimer.section3.title') }}
      </span>
      <span class="disclaimer-section-body">
        {{ t('ai.agent.verifyResults.disclaimer.section3.body') }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.disclaimer, .disclaimer-section {
  display: flex;
  flex-direction: column;
}

.disclaimer {
 gap: 16px;
}

.disclaimer-section {
  gap: 8px;
}

.disclaimer-section-title {
  font-family: Lato;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 24px;
}

.disclaimer-section-body {
  font-family: Lato;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 21px;
}
</style>