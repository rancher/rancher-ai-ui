<script setup lang="ts">
import { ref, computed, PropType, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { AGENT_NAMESPACE } from '../../../product';
import { AIAgentConfigCRD, AIAgentConfigHumanValidationTools } from '../../../types';
import { AIAgentConfigAuthType, AiAgentConfigSecretPayload, AIAgentConfigValidationType } from '../types';
import Tabbed from '@shell/components/Tabbed/index.vue';
import Tab from '@shell/components/Tabbed/Tab.vue';
import ArrayList from '@shell/components/form/ArrayList.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import Banner from '@components/Banner/Banner.vue';
import TextAreaAutoGrow from '@components/Form/TextArea/TextAreaAutoGrow.vue';
import SelectOrCreateAuthSecret from '@shell/components/form/SelectOrCreateAuthSecret.vue';
import FileSelector from '@shell/components/form/FileSelector.vue';
import formRulesGenerator from '@shell/utils/validators/formRules';

const DEFAULT_AI_AGENT = 'rancher';

const store = useStore();
const { t } = useI18n(store);

const validators = (key: string) => formRulesGenerator(t, { key });

const props = defineProps({
  value: {
    type:     Array as PropType<AIAgentConfigCRD[]>,
    default:  () => [],
  },
  readOnly: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits([
  'update:value',
  'update:authentication-secrets',
  'update:validation-error'
]);

const authOptions = [
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.authOptions.basic'),
    value: AIAgentConfigAuthType.BASIC
  },
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.authOptions.rancher'),
    value: AIAgentConfigAuthType.RANCHER
  },
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.authOptions.none'),
    value: AIAgentConfigAuthType.NONE
  }
];

const validationTypes = [
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.validationTypes.create'),
    value: AIAgentConfigValidationType.CREATE
  },
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.validationTypes.update'),
    value: AIAgentConfigValidationType.UPDATE
  },
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.validationTypes.delete'),
    value: AIAgentConfigValidationType.DELETE
  }
];

const agents = computed(() => {
  /**
   * Sorting logic for agents:
   *
   * 1. New custom agents in progress of being added
   * 2. Custom agents already added
   * 3. Default built-in agent
   * 4. Other built-in agents
   */
  const all = [...props.value];

  const builtIn = all
    .filter((a) => a.spec.builtIn)
    .sort((a) => a.metadata.name === DEFAULT_AI_AGENT ? -1 : 1);
  const custom = all.filter((a) => !a.spec.builtIn);

  return [
    ...custom,
    ...builtIn,
  ];
});

const availableAgentsCount = computed(() => agents.value.filter((c) => c.spec.enabled && !c.stateDescription).length);

const selectedAgentName = ref(agents.value[0]?.metadata?.name || '');
const selectedAgent = computed(() => agents.value.find((a) => a.metadata?.name === selectedAgentName.value) || agents.value[0]);
const isAgentLocked = computed(() => selectedAgent.value?.spec.builtIn);
const isAgentUnavailable = computed(() => {
  if (selectedAgent.value?.spec.enabled === false) {
    return false;
  }

  const errorMessage = getAgentErrorMessage(selectedAgent.value);

  return !!errorMessage;
});

const agentSecrets = ref<Record<string, AiAgentConfigSecretPayload | null>>({});

const mcpUrlRules = () => {
  const validator = validators(t('aiConfig.form.section.aiAgent.sections.mcp.title'));

  return [
    validator.required,
  ];
};

const nameRules = () => {
  const validator = validators(t('aiConfig.form.section.aiAgent.fields.displayName.label'));

  return [
    validator.required,
  ];
};

const validationErrors = computed(() => {
  return agents.value.reduce((acc, agent) => {
    for (const rule of mcpUrlRules()) {
      const res = rule(agent.spec.mcpURL);

      if (res) {
        return {
          ...acc,
          [agent.metadata?.name || '']: true
        };
      }
    }

    for (const rule of nameRules()) {
      const res = rule(agent.spec.displayName);

      if (res) {
        return {
          ...acc,
          [agent.metadata?.name || '']: true
        };
      }
    }

    return acc;
  }, {} as Record<string, boolean>);
});

function getAgentErrorMessage(agent: AIAgentConfigCRD) {
  return agent.stateDescription || agent.status?.conditions.find((c) => c.error)?.message;
}

function tabLabelIcon(agent: AIAgentConfigCRD) {
  if (agent.spec?.enabled) {
    return 'icon-confirmation-alt';
  }

  return 'icon-close';
}

function updateAuthenticationSecret(value: AiAgentConfigSecretPayload) {
  const { selected, privateKey, publicKey } = value;

  // Clear the authenticationSecret fields
  if (selected === '_none') {
    updateAgent({
      spec: {
        ...selectedAgent.value.spec,
        authenticationSecret: undefined
      }
    });
    delete agentSecrets.value[selectedAgentName.value];

  // Create new secret
  } else if (selected === '_basic') {
    updateAgent({
      spec: {
        ...selectedAgent.value.spec,
        authenticationSecret: undefined
      }
    });
    agentSecrets.value[selectedAgentName.value] = {
      selected,
      privateKey,
      publicKey
    };

  // Select existing secret, no creation needed
  } else {
    updateAgent({
      spec: {
        ...selectedAgent.value.spec,
        authenticationSecret: selected
      }
    });
    delete agentSecrets.value[selectedAgentName.value];
  }

  emit('update:authentication-secrets', agentSecrets.value);
}

function updateValidationTools(index: number, field: string, val: string) {
  const humanValidationTools = [...(selectedAgent.value.spec.humanValidationTools || [])];

  humanValidationTools[index] = {
    ...humanValidationTools[index],
    [field]: val
  };

  updateAgent({
    spec: {
      ...selectedAgent.value.spec,
      humanValidationTools
    }
  });
}

function removeValidationTools(args: { row: { value: AIAgentConfigHumanValidationTools } }) {
  const humanValidationTools = [...(selectedAgent.value.spec.humanValidationTools || [])];
  const index = humanValidationTools.indexOf(args.row.value);

  if (index > -1) {
    humanValidationTools.splice(index, 1);

    updateAgent({
      spec: {
        ...selectedAgent.value.spec,
        humanValidationTools
      }
    });
  }
}

function updateAgent(patch: Partial<AIAgentConfigCRD>) {
  const newList = agents.value.map((agent) => {
    if (agent.metadata?.name === selectedAgentName.value) {
      return {
        ...agent,
        ...patch
      };
    }

    return agent;
  });

  emit('update:value', newList);
}

function addAgent() {
  if (props.readOnly) {
    return;
  }

  const name = `agent-${ agents.value.length + 1 }`;

  const newList: AIAgentConfigCRD[] = [
    {
      metadata: {
        name,
        namespace: AGENT_NAMESPACE
      },
      spec:     {
        displayName:          'New Agent',
        enabled:              true,
        mcpURL:               '',
        authenticationType:   AIAgentConfigAuthType.RANCHER,
        humanValidationTools: [],
        description:          '',
        systemPrompt:         '',
        toolSet:              ''
      }
    },
    ...agents.value
  ];

  selectedAgentName.value = name;
  window.location.hash = selectedAgentName.value;

  emit('update:value', newList);
}

function removeAgent() {
  if (isAgentLocked.value || props.readOnly) {
    return;
  }

  const index = agents.value.indexOf(selectedAgent.value);

  if (index === -1) {
    return;
  }

  selectedAgentName.value = agents.value[index + 1]?.metadata?.name || agents.value[0]?.metadata?.name || DEFAULT_AI_AGENT || '';
  window.location.hash = selectedAgentName.value;

  const newList = agents.value.filter((_, i) => i !== index);

  delete agentSecrets.value[agents.value[index].metadata?.name];

  emit('update:value', newList);
  emit('update:authentication-secrets', agentSecrets.value);
}

function onFileSelected(fileContent: string) {
  updateAgent({
    spec: {
      ...selectedAgent.value.spec,
      systemPrompt: fileContent
    }
  });
}

function tabChanged(newTab: { selectedName: string }) {
  selectedAgentName.value = newTab.selectedName;
}

watch(validationErrors, (errors) => {
  const hasErrors = Object.values(errors).some((v) => v === true);

  emit('update:validation-error', hasErrors);
}, { deep: true });
</script>

<template>
  <div class="ai-agent-container">
    <div v-if="availableAgentsCount === 0">
      <Banner
        class="m-0"
        :color="'error'"
      >
        <span
          v-clean-html="t('aiConfig.form.section.aiAgent.allAgentsFailedBanner', {}, true)"
        />
      </Banner>
    </div>

    <div v-if="!props.readOnly && availableAgentsCount > 1">
      <Banner
        class="m-0"
        :color="'info'"
      >
        <span
          v-clean-html="t('aiConfig.form.section.aiAgent.adaptiveModeBanner', {}, true)"
        />
      </Banner>
    </div>

    <div v-if="props.readOnly">
      <Banner
        class="m-0"
        :color="'warning'"
        :label="t('aiConfig.form.section.aiAgent.noPermission.edit')"
      />
    </div>

    <Tabbed
      :side-tabs="true"
      :weight="99"
      :use-hash="true"
      :show-tabs-add-remove="true"
      :default-tab="selectedAgentName"
      :class="{ 'remove-btn-disabled': isAgentLocked }"
      @changed="tabChanged"
      @addTab="addAgent"
      @removeTab="removeAgent"
    >
      <Tab
        v-for="(agent, index) in agents"
        :key="agent.metadata?.name"
        :label="agent.spec.displayName || agent.metadata?.name"
        :name="agent.metadata?.name"
        :label-icon="tabLabelIcon(agent)"
        :weight="99 - index"
        :show-header="false"
        :display-alert-icon="getAgentErrorMessage(agent)?.length"
        :error="validationErrors[agent.metadata?.name]"
        :error-icon-tooltip="!validationErrors[agent.metadata?.name] && getAgentErrorMessage(agent)?.length ? t('ai.error.agent.unavailable.tooltip') : ''"
        class="form-values"
      >
        <div
          v-if="isAgentUnavailable"
          class="row"
        >
          <Banner
            class="m-0"
            color="error"
          >
            <span
              v-clean-html="t('ai.error.agent.unavailable.label', { message: getAgentErrorMessage(selectedAgent) }, true)"
            />
          </Banner>
        </div>
        <div
          v-if="isAgentLocked && !props.readOnly"
          class="row"
        >
          <Banner
            class="m-0"
            color="warning"
          >
            <span
              v-clean-html="t('aiConfig.form.section.aiAgent.locked', {}, true)"
            />
          </Banner>
        </div>
        <div class="form-values-row">
          <div class="row mb-16">
            <div class="col span-6">
              <LabeledInput
                :value="selectedAgent.spec.displayName"
                :label="t('aiConfig.form.section.aiAgent.fields.displayName.label')"
                :rules="nameRules()"
                required
                :disabled="isAgentLocked || props.readOnly"
                @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, displayName: val } })"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                :value="selectedAgent.spec.description"
                :disabled="isAgentLocked || props.readOnly"
                :label="t('aiConfig.form.section.aiAgent.fields.description.label')"
                @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, description: val } })"
              />
            </div>
          </div>
          <Checkbox
            :value="selectedAgent.spec.enabled"
            :label="t('aiConfig.form.section.aiAgent.fields.enabled.label')"
            :tooltip="t('aiConfig.form.section.aiAgent.fields.enabled.tooltip')"
            :disabled="props.readOnly"
            @update:value="(val: boolean) => updateAgent({ spec: { ...selectedAgent.spec, enabled: val } })"
          />
        </div>

        <div class="form-values-row">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.aiAgent.sections.mcp.title') }}
          </h3>
          <div class="row">
            <div class="col span-6">
              <LabeledInput
                required
                :value="selectedAgent.spec.mcpURL"
                :rules="mcpUrlRules()"
                :disabled="isAgentLocked || props.readOnly"
                :label="t('aiConfig.form.section.aiAgent.fields.mcpURL.label')"
                :placeholder="t('aiConfig.form.section.aiAgent.fields.mcpURL.placeholder')"
                @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, mcpURL: val } })"
              />
            </div>
            <div class="col span-6">
              <LabeledSelect
                :value="selectedAgent.spec.authenticationType"
                :disabled="isAgentLocked || props.readOnly"
                :label="t('aiConfig.form.section.aiAgent.fields.authenticationType.label')"
                :options="authOptions"
                @update:value="(val: AIAgentConfigAuthType) => updateAgent({ spec: { ...selectedAgent.spec, authenticationType: val } })"
              />
            </div>
          </div>
          <div
            v-if="selectedAgent.spec.authenticationType === AIAgentConfigAuthType.BASIC && !isAgentLocked && !props.readOnly"
            class="row"
          >
            <div class="col span-12">
              <SelectOrCreateAuthSecret
                :key="selectedAgent.metadata.name + selectedAgent.spec.authenticationSecret"
                :value="selectedAgent.spec.authenticationSecret || undefined"
                :pre-select="agentSecrets[selectedAgentName]"
                :namespace="AGENT_NAMESPACE"
                :allow-ssh="false"
                :delegate-create-to-parent="true"
                :cache-secrets="true"
                :register-before-hook="() => {}"
                in-store="management"
                label-key="aiConfig.form.section.aiAgent.fields.authenticationSecret.label"
                @inputauthval="updateAuthenticationSecret"
              />
            </div>
          </div>
        </div>

        <div class="form-values-row">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.aiAgent.sections.humanValidationTools.title') }}
            <i
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.humanValidationTools.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
          <ArrayList
            :value="selectedAgent.spec.humanValidationTools"
            :disabled="isAgentLocked || props.readOnly"
            :remove-allowed="!isAgentLocked && !props.readOnly"
            :add-allowed="!isAgentLocked && !props.readOnly"
            :show-header="true"
            :add-label="t('aiConfig.form.section.aiAgent.fields.humanValidationTools.addLabel')"
            @remove="removeValidationTools"
          >
            <template #column-headers>
              <div class="array-list-headers">
                <div class="row">
                  <span class="col span-6 text-label">
                    {{ t('aiConfig.form.section.aiAgent.fields.humanValidationTools.fields.name.label') }}
                  </span>
                  <span class="col span-6 text-label">
                    {{ t('aiConfig.form.section.aiAgent.fields.humanValidationTools.fields.type.label') }}
                  </span>
                </div>
              </div>
            </template>
            <template #columns="{ row, i }">
              <div class="row">
                <div class="col span-6">
                  <LabeledInput
                    :value="row.value.name"
                    :disabled="isAgentLocked || props.readOnly"
                    @update:value="updateValidationTools(i, 'name', $event)"
                  />
                </div>
                <div class="col span-6">
                  <LabeledSelect
                    :value="row.value.type"
                    :options="validationTypes"
                    :disabled="isAgentLocked || props.readOnly"
                    @update:value="updateValidationTools(i, 'type', $event)"
                  />
                </div>
              </div>
            </template>
            <template #empty>
              <div class="row">
                <span class="col span-12 text-label tools-empty-label">
                  {{ t('aiConfig.form.section.aiAgent.fields.humanValidationTools.emptyLabel') }}
                </span>
              </div>
            </template>
          </ArrayList>
        </div>

        <div class="form-values-row">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.aiAgent.sections.systemPrompt.title') }}
            <i
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.systemPrompt.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
          <div class="row">
            <TextAreaAutoGrow
              :key="selectedAgent.metadata.name"
              :value="selectedAgent.spec.systemPrompt || ''"
              :disabled="isAgentLocked || props.readOnly"
              :placeholder="t('aiConfig.form.section.aiAgent.fields.systemPrompt.placeholder')"
              :max-height="200"
              :min-height="200"
              @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, systemPrompt: val } })"
            />
          </div>
          <div
            v-if="!isAgentLocked && !props.readOnly"
            class="row"
          >
            <div class="col span-4">
              <FileSelector
                role="button"
                class="btn role-tertiary pull-left"
                :label="t('aiConfig.form.section.aiAgent.fields.systemPrompt.uploadButton')"
                @selected="onFileSelected"
              />
            </div>
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>

<style scoped lang="scss">
.ai-agent-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-values {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 70rem;
  flex-grow: 1;
}

.form-values-row {
  display: flex;
  flex-direction: column;
  gap: 16px
}

.array-list-headers {
  display: grid;
  grid-template-columns: auto 75px;
  align-items: center;
  margin-bottom: 4px;
}

.text-label {
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

.tooltip-icon {
  color: var(--input-label);
  margin-left: 8px;
  cursor: pointer;
}

.remove-btn-disabled {
  :deep(.tab-list-footer) {
    li > button:nth-of-type(2) {
      visibility: hidden;
    }
  }
}

.tools-empty-label {
  font-size: 14px;
}

:deep(.select-or-create-auth-secret .mt-20) {
  margin-top: 0 !important;
}

:deep(.tab) {
  a {
    padding-left: 8px !important;

    span {
      word-break: break-word;
      white-space: pre-line;
      list-style-position: inside;
    }
  }

  .icon-endpoints_disconnected {
    color: var(--error);
  }

  .icon-close {
    visibility: hidden;
  }
}

:deep(.conditions-alert-icon) {
  margin-left: auto;
}
</style>
