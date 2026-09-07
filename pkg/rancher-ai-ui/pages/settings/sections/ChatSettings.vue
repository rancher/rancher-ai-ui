<script setup lang="ts">
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import { Settings, SettingsFormData } from '../types';
import { cloneDeep } from 'lodash';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:     Object as () => SettingsFormData,
    default:  () => ({}),
  },
  readOnly: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:value']);

const updateBooleanValue = (key: Settings, val: boolean) => {
  const newValue = cloneDeep(props.value);

  newValue[key] = val ? 'true' : 'false';

  emit('update:value', newValue);
};
</script>

<template>
  <div class="chat-settings">
    <!-- Multi-Step Planning -->
    <div class="form-values-row">
      <div class="row">
        <div class="col span-12">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.chat.multiStepPlanning.title') }}
            <i
              v-clean-tooltip="t('aiConfig.form.section.chat.multiStepPlanning.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <Checkbox
            class="form-value-checkbox"
            :value="props.value?.[Settings.PLAN_ENABLED] === 'true'"
            :label-key="'aiConfig.form.section.chat.multiStepPlanning.enableMultiStep.label'"
            :disabled="props.readOnly"
            @update:value="(val: boolean) => updateBooleanValue(Settings.PLAN_ENABLED, val)"
          />
        </div>
      </div>
      <div
        v-if="props.value?.[Settings.PLAN_ENABLED] === 'true'"
        class="row"
      >
        <div class="col span-12">
          <Checkbox
            class="form-value-checkbox nested"
            :value="props.value?.[Settings.PLAN_APPROVAL_ENABLED] === 'true'"
            :label="t('aiConfig.form.section.chat.multiStepPlanning.requireApproval.label')"
            :tooltip="t('aiConfig.form.section.chat.multiStepPlanning.requireApproval.tooltip')"
            :disabled="props.readOnly"
            @update:value="(val: boolean) => updateBooleanValue(Settings.PLAN_APPROVAL_ENABLED, val)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.form-values-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-value-checkbox {
  width: fit-content;
}

.tooltip-icon {
  color: var(--input-label);
  margin-left: 8px;
  cursor: pointer;
}

.nested {
  padding-left: 24px;
}
</style>
