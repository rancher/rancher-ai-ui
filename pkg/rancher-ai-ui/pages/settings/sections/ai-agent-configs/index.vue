<script setup lang="ts">
import { ref, computed, PropType, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { randomStr } from '@shell/utils/string';
import Tabbed from '@shell/components/Tabbed/index.vue';
import Tab from '@shell/components/Tabbed/Tab.vue';
import ArrayList from '@shell/components/form/ArrayList.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import Banner from '@components/Banner/Banner.vue';
import TextAreaAutoGrow from '@components/Form/TextArea/TextAreaAutoGrow.vue';
import SelectOrCreateAuthSecret from '@shell/components/form/SelectOrCreateAuthSecret.vue';
import SecretSelector from '@shell/components/form/SecretSelector.vue';
import FileSelector from '@shell/components/form/FileSelector.vue';
import formRulesGenerator from '@shell/utils/validators/formRules';
import { AGENT_NAMESPACE } from '../../../../product';
import { AIAgentConfigCRD } from '../../../../types';
import { AIAgentConfigAuthType, AiAgentConfigBasicSecretPayload, AiAgentConfigOAuth2SecretPayload } from '../../types';
import { DEFAULT_AI_AGENT } from '../../../../composables/useAgentComposable';
import Oauth2SecretForm from './Oauth2SecretForm.vue';
import { useAIAgentApiComposable } from '../../../../composables/useAIAgentApiComposable';

interface ValidationStatus {
  touched: boolean;
  focused: boolean;
}

const CA_BUNDLE_TLS_KEY = 'tls.crt';

const store = useStore();
const { t } = useI18n(store);

const apiComposable = useAIAgentApiComposable();

const validators = (key: string) => formRulesGenerator(t, { key });

const props = defineProps({
  value: {
    type:     Array as PropType<AIAgentConfigCRD[]>,
    default:  () => [],
  },
  initValue: {
    type:     Array as PropType<AIAgentConfigCRD[]>,
    default:  () => [],
  },
  models: {
    type:     Array as PropType<string[]>,
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
    label: t('aiConfig.form.section.aiAgent.options.mcp.authOptions.header'),
    value: AIAgentConfigAuthType.HEADER
  },
  {
    label: t('aiConfig.form.section.aiAgent.options.mcp.authOptions.oauth2'),
    value: AIAgentConfigAuthType.OAUTH2
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
  const custom = all
    .filter((a) => !a.spec.builtIn)
    .sort((a, b) => b.metadata.name.localeCompare(a.metadata.name));

  return [
    ...custom,
    ...builtIn,
  ];
});

const enabledAgentsCount = computed(() => agents.value.filter((c) => c.spec.enabled).length);
const availableAgentsCount = computed(() => agents.value.filter((c) => c.spec.enabled && !c.stateDescription).length);

const selectedAgentName = ref(agents.value[0]?.metadata?.name || '');
const selectedAgent = computed(() => agents.value.find((a) => a.metadata?.name === selectedAgentName.value) || agents.value[0]);
const isAgentLocked = computed(() => selectedAgent.value?.spec.builtIn);
const isAgentUnavailable = computed(() => {
  const errorMessage = getAgentErrorMessage(selectedAgent.value);

  return !!errorMessage;
});

const agentSecrets = ref<Record<string, AiAgentConfigBasicSecretPayload | AiAgentConfigOAuth2SecretPayload | null>>({});

const descriptionValidationStatus = ref<ValidationStatus>({
  touched: false,
  focused: false
});

const systemPromptValidationStatus = ref<ValidationStatus>({
  touched: false,
  focused: false
});

const isRequiredRule = (key: string) => {
  const validator = validators(t(key));

  return [
    validator.required,
  ];
};

const validationErrors = computed(() => {
  return agents.value.reduce((acc, agent) => {
    let hasErrors = false;

    if (
      !agent.spec.displayName ||
      !agent.spec.description ||
      !agent.spec.mcpURL ||
      !agent.spec.systemPrompt
    ) {
      hasErrors = true;
    }

    if (agent.spec.authenticationType === AIAgentConfigAuthType.OAUTH2) {
      const payload = agentSecrets.value[agent.metadata?.name || ''] as AiAgentConfigOAuth2SecretPayload;

      if (
        !payload ||
        !payload.metadataEndpoint ||
        !payload.clientID ||
        !payload.clientSecret
      ) {
        hasErrors = true;
      }
    }

    return {
      ...acc,
      [agent.metadata?.name || '']: hasErrors
    };
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

function updateAuthType(value: AIAgentConfigAuthType) {
  const updatedSpecValue = {
    spec: {
      ...selectedAgent.value.spec,
      authenticationType: value
    }
  };

  const initAgent = props.initValue.find((a) => a.metadata?.name === selectedAgentName.value);

  if (updatedSpecValue.spec.authenticationType !== initAgent?.spec.authenticationType) {
    // When the authentication type changes, we need to clear the authentication secret live value
    updatedSpecValue.spec.authenticationSecret = undefined;
  } else {
    // Else keep the initial value
    updatedSpecValue.spec.authenticationSecret = initAgent?.spec.authenticationSecret;
  }

  updateAgent(updatedSpecValue);

  // Cleaning up the agentSecrets
  delete agentSecrets.value[selectedAgentName.value];

  emit('update:authentication-secrets', undefined);
}

function updateBasicAuthSecret(value: AiAgentConfigBasicSecretPayload) {
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

function updateOauth2AuthSecret(agent: AIAgentConfigCRD, value: Partial<AiAgentConfigOAuth2SecretPayload>) {
  agentSecrets.value[agent.metadata?.name || ''] = value as AiAgentConfigOAuth2SecretPayload;

  emit('update:authentication-secrets', agentSecrets.value);
}

function updateLlmModelEnabled() {
  const llmModelEnabled = !selectedAgent.value.spec.llmModelEnabled;

  // When llmModelEnabled is reset, we clear the llmModel field to avoid having a model which is not in the available models list.
  const llmModel = props.models.includes(selectedAgent.value.spec.llmModel || '') ? selectedAgent.value.spec.llmModel : undefined;

  updateAgent({
    spec: {
      ...selectedAgent.value.spec,
      llmModelEnabled,
      llmModel
    }
  });
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

  // Random string is added to ensure the name is unique even when multiple agents are being added without saving in between
  const name = `agent-${ agents.value.length + 1 }-${ randomStr(8) }`.toLocaleLowerCase();

  const newAgentsCount = agents.value.filter((a) => a.spec?.displayName?.trim().startsWith('New Agent')).length;

  const newList: AIAgentConfigCRD[] = [
    {
      metadata: {
        name,
        namespace: AGENT_NAMESPACE
      },
      spec:     {
        displayName:          `New Agent${ newAgentsCount === 0 ? '' : ` ${ newAgentsCount }` }`,
        enabled:              true,
        mcpURL:               '',
        authenticationType:   AIAgentConfigAuthType.RANCHER,
        caBundleRef:          undefined,
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
    <div v-if="agents?.length > 0 && enabledAgentsCount === 0">
      <Banner
        class="m-0"
        :color="'error'"
      >
        <span
          v-clean-html="t('aiConfig.form.section.aiAgent.allAgentsDisabledBanner', {}, true)"
        />
      </Banner>
    </div>
    <div v-else-if="agents?.length > 0 && availableAgentsCount === 0">
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
        color="warning"
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
                :rules="isRequiredRule('aiConfig.form.section.aiAgent.fields.displayName.label')"
                required
                :disabled="isAgentLocked || props.readOnly"
                @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, displayName: val } })"
              />
            </div>
          </div>
          <Checkbox
            class="form-value-checkbox"
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
                :rules="isRequiredRule('aiConfig.form.section.aiAgent.sections.mcp.title')"
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
                @update:value="updateAuthType"
              />
            </div>
          </div>

          <template v-if="!isAgentLocked && !props.readOnly">
            <div
              v-if="selectedAgent.spec.authenticationType === AIAgentConfigAuthType.BASIC"
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
                  @inputauthval="updateBasicAuthSecret"
                />
              </div>
            </div>
            <div
              v-else-if="selectedAgent.spec.authenticationType === AIAgentConfigAuthType.HEADER"
              class="row"
            >
              <div class="col span-6">
                <SecretSelector
                  :value="selectedAgent.spec.authenticationSecret || undefined"
                  :secret-name-label="t('aiConfig.form.section.aiAgent.fields.authenticationSecret.label')"
                  :namespace="AGENT_NAMESPACE"
                  @update:value="(value: string) => updateAgent({ spec: { ...selectedAgent.spec, authenticationSecret: value || undefined } })"
                />
              </div>
            </div>
            <Oauth2SecretForm
              v-else-if="agent.spec.authenticationType === AIAgentConfigAuthType.OAUTH2"
              :value="agentSecrets[agent.metadata.name] as AiAgentConfigOAuth2SecretPayload"
              :secret-name="agent.spec.authenticationSecret"
              :mcp-url="agent.spec.mcpURL"
              :api-composable="apiComposable"
              @update:value="(value: Partial<AiAgentConfigOAuth2SecretPayload>) => updateOauth2AuthSecret(agent, value)"
            />
          </template>
        </div>

        <div
          v-if="!isAgentLocked && !props.readOnly"
          class="form-values-row"
        >
          <h3 class="m-0">
            {{ t('aiConfig.form.section.aiAgent.fields.caBundleRef.title') }}
            <i
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.fields.caBundleRef.tooltip')"
              class="icon icon-info tooltip-icon subrow-title-icon"
            />
          </h3>
          <div class="row">
            <div class="col span-6">
              <SecretSelector
                :value="selectedAgent.spec.caBundleRef?.name || undefined"
                :secret-name-label="t('aiConfig.form.section.aiAgent.fields.caBundleRef.label')"
                :namespace="AGENT_NAMESPACE"
                @update:value="(value: string) => updateAgent({ spec: { ...selectedAgent.spec, caBundleRef: value ? { name: value, key: CA_BUNDLE_TLS_KEY } : undefined } })"
              />
            </div>
          </div>
        </div>

        <div class="form-values-row">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.aiAgent.sections.llmModel.title') }}
            <span
              class="required"
              aria-hidden="true"
            >*</span>
            <i
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.llmModel.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
          <Checkbox
            class="form-value-checkbox"
            :value="!selectedAgent.spec.llmModelEnabled"
            :label="t('aiConfig.form.section.aiAgent.fields.llmModelEnabled.label')"
            :disabled="props.readOnly || !props.models.length"
            @update:value="updateLlmModelEnabled"
          />
          <div
            class="row"
          >
            <div class="col span-6">
              <LabeledSelect
                :value="selectedAgent.spec.llmModel"
                :disabled="props.readOnly || !selectedAgent.spec.llmModelEnabled"
                :label="t('aiConfig.form.section.aiAgent.fields.modelName.label')"
                :options="props.models"
                :clearable="true"
                @update:value="(value: string) => updateAgent({ spec: { ...selectedAgent.spec, llmModel: value } })"
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
            :add-label="t('aiConfig.form.section.aiAgent.fields.humanValidationTools.addLabel')"
            :show-header="true"
            :value-label="''"
            :value-placeholder="t('aiConfig.form.section.aiAgent.fields.humanValidationTools.placeholder')"
            @update:value="(value: string[]) => updateAgent({ spec: { ...selectedAgent.spec, humanValidationTools: value } })"
          >
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
            {{ t('aiConfig.form.section.aiAgent.sections.description.title') }}
            <span
              class="required"
              aria-hidden="true"
            >*</span>
            <i
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.description.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
          <div class="row textarea-with-validation">
            <TextAreaAutoGrow
              :key="selectedAgent.metadata.name"
              data-testid="rancher-ai-ui-settings-ai-agent-configs-description"
              :value="selectedAgent.spec.description || ''"
              :disabled="isAgentLocked || props.readOnly"
              :rules="isRequiredRule('aiConfig.form.section.aiAgent.fields.description.label')"
              :max-height="100"
              :min-height="100"
              @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, description: val } })"
              @focus="descriptionValidationStatus.focused = true"
              @blur="descriptionValidationStatus.touched = true; descriptionValidationStatus.focused = false"
            />
            <i
              v-if="descriptionValidationStatus.touched && !descriptionValidationStatus.focused && !selectedAgent.spec.description"
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.description.requiredTooltip')"
              class="icon icon-warning textarea-validation-icon"
            />
          </div>
        </div>

        <div class="form-values-row">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.aiAgent.sections.systemPrompt.title') }}
            <span
              class="required"
              aria-hidden="true"
            >*</span>
            <i
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.systemPrompt.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
          <div class="row textarea-with-validation">
            <TextAreaAutoGrow
              :key="selectedAgent.metadata.name"
              data-testid="rancher-ai-ui-settings-ai-agent-configs-system-prompt"
              :value="selectedAgent.spec.systemPrompt || ''"
              :disabled="isAgentLocked || props.readOnly"
              :placeholder="t('aiConfig.form.section.aiAgent.fields.systemPrompt.placeholder')"
              :rules="isRequiredRule('aiConfig.form.section.aiAgent.sections.systemPrompt.title')"
              :max-height="200"
              :min-height="200"
              @update:value="(val: string) => updateAgent({ spec: { ...selectedAgent.spec, systemPrompt: val } })"
              @focus="systemPromptValidationStatus.focused = true"
              @blur="systemPromptValidationStatus.touched = true; systemPromptValidationStatus.focused = false"
            />
            <i
              v-if="systemPromptValidationStatus.touched && !systemPromptValidationStatus.focused && !selectedAgent.spec.systemPrompt"
              v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.systemPrompt.requiredTooltip')"
              class="icon icon-warning textarea-validation-icon"
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
  flex-grow: 1;
}

.form-values-row {
  display: flex;
  flex-direction: column;
  gap: 16px
}

.form-value-checkbox {
  width: fit-content;
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

.subrow-title-icon {
  font-size: 12px;
}

.textarea-with-validation {
  position: relative;

  .textarea-validation-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--error);
    cursor: pointer;
    z-index: 10;
  }
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

  .icon-close {
    visibility: hidden;
  }
}

:deep(.conditions-alert-icon) {
  margin-left: auto;
}

.required {
  color: var(--error);
}
</style>
