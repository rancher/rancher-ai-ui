<script setup lang="ts">
import dayjs from 'dayjs';
import {
  ref,
  onMounted,
  watch,
} from 'vue';
import { useStore } from 'vuex';
import {
  RANCHER_AI_SCHEMA,
  AGENT_NAME,
  AGENT_NAMESPACE,
  AGENT_CONFIG_SECRET_NAME,
  AGENT_CONFIG_CONFIG_MAP_NAME,
  PERMISSIONS_DOCS_URL,
  TOOLS_CONFIG_NAME,
} from '../../product';
import { warn } from '../../utils/log';
import { CONFIG_MAP, SECRET, WORKLOAD_TYPES } from '@shell/config/types';
import { SECRET_TYPES } from '@shell/config/secret';
import { useI18n } from '@shell/composables/useI18n';
import { base64Decode, base64Encode } from '@shell/utils/crypto';
import Banner from '@components/Banner/Banner.vue';
import AsyncButton, { AsyncButtonCallback } from '@shell/components/AsyncButton.vue';
import Loading from '@shell/components/Loading.vue';
import RichTranslation from '@shell/components/RichTranslation.vue';
import AppModal from '@shell/components/AppModal.vue';
import {
  SettingsFormData, Settings, Workload, AiAgentConfigSecretPayload, AIAgentConfigAuthType,
  SettingsPermissions,
} from './types';
import { AgentSettings, AIAgentConfigCRD, UIToolsConfigs } from '../../types';
import { AI_AGENT_LABELS } from '../../labels-annotations';
import SettingsRow from './SettingsRow.vue';
import AIAgentConfigs from './sections/AIAgentConfigs.vue';
import UIToolsConfig from './sections/UIToolsConfig.vue';
import AIAgentSettings from './sections/AIAgentSettings.vue';
import ApplySettings from '../../dialog/ApplySettingsCard.vue';
import { useAIAgentApiComposable } from '../../composables/useAIAgentApiComposable';
import { useToolsComposable } from '../../composables/useToolsComposable';

/**
 * Settings page for configuring Rancher AI assistant.
 */

const store = useStore();
const { t } = useI18n(store);
// const shellApi = useShell();

// TODO: All settings will be fetched through the API in the future.
const { fetchSettings, saveSettings } = useAIAgentApiComposable();

const { uiToolsDefinitionAction, publishToolsDefinition } = useToolsComposable();

const isLoading = ref(true);
const isSaving = ref(false);

const applySettingsCb = ref<AsyncButtonCallback | null>(null);

const aiAgentDeployment = ref<Workload | null>(null);
const chatSettings = ref<AgentSettings | null>(null);
const aiAgentSettings = ref<SettingsFormData | null>(null);
const aiAgentConfigCRDs = ref<AIAgentConfigCRD[] | null>(null);
const uiToolsSettings = ref<UIToolsConfigs | null>(null);
const authenticationSecrets = ref<Record<string, AiAgentConfigSecretPayload | null>>({});

const permissions = ref<SettingsPermissions | null>(null);

const apiError = ref<string>('');
const hasAiAgentSettingsValidationErrors = ref<boolean>(false);
const hasAiAgentConfigsValidationErrors = ref<boolean>(false);

const buttonProps = ref({
  successLabel: t('asyncButton.apply.action'),
  successColor: 'bg-success',
});

/**
 * Fetches the rancher-ai-agent deployment.
 */
async function fetchAiAgentDeployment() {
  if (permissions.value?.list?.canListDeployments) {
    try {
      aiAgentDeployment.value = await store.dispatch('management/find', {
        type:    WORKLOAD_TYPES.DEPLOYMENT,
        id:      `${ AGENT_NAMESPACE }/${ AGENT_NAME }`
      });
    } catch (e) {
      warn('Error fetching AI agent deployment:', e);
    }
  }
}

/**
 * Fetches the chat settings from the API.
 */
async function fetchChatSettings() {
  try {
    chatSettings.value = await fetchSettings();
  } catch (e) {
    warn('Error fetching chat settings: ', e);
  }
}

/**
 * Fetches the AI agent settings from the llmConfig Secret.
 */
async function fetchAiAgentSettings() {
  const settingsFormData = {} as SettingsFormData;

  let secret;
  let configMap;

  if (permissions.value?.list?.canListConfigMaps) {
    try {
      secret = await store.dispatch(`management/find`, {
        type: SECRET,
        id:   `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`,
        opt:  { watch: true }
      });
    } catch (err) {
      warn(`Unable to fetch the ${ AGENT_CONFIG_SECRET_NAME } secret: `, { err });
    }

    for (const entry in (secret?.data || {})) {
      settingsFormData[entry as keyof SettingsFormData] = base64Decode(secret.data[entry] || '');
    }
  }

  if (permissions.value?.list?.canListConfigMaps) {
    try {
      configMap = await store.dispatch(`management/find`, {
        type: CONFIG_MAP,
        id:   `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`,
        opt:  { watch: true }
      });
    } catch (err) {
      warn(`Unable to fetch the ${ AGENT_CONFIG_CONFIG_MAP_NAME } configMap: `, { err });
    }

    for (const entry in (configMap?.data || {})) {
      settingsFormData[entry as keyof SettingsFormData] = configMap.data[entry] || '';
    }
  }

  aiAgentSettings.value = settingsFormData;
};

/**
 * Fetches the AI agent config CRDs.
 */
async function fetchAiAgentConfigCRDs() {
  let crds: AIAgentConfigCRD[] = [];

  if (permissions.value?.list?.canListAiAgentCRDS) {
    try {
      crds = await store.dispatch(`management/findAll`, {
        type: RANCHER_AI_SCHEMA.AI_AGENT_CONFIG,
        opt:  { watch: true }
      });
    } catch (err) {
      warn('Unable to fetch AI Agent Config CRDs: ', { err });
    }
  }

  aiAgentConfigCRDs.value = crds;
}

/**
 * Fetches the UI tools config from the ConfigMap.
 */
async function fetchUIToolsConfigSettings() {
  let uiToolsConfigSettings;

  if (permissions.value?.list?.canListConfigMaps) {
    let configMap;

    try {
      configMap = await store.dispatch(`management/find`, {
        type: CONFIG_MAP,
        id:   `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`,
        opt:  { watch: true }
      });
    } catch (err) {
      warn('Unable to fetch UI Tools Config ConfigMap: ', { err });
    }

    try {
      uiToolsConfigSettings = JSON.parse(configMap?.data?.config || '{}');
    } catch (error) {
      warn('Failed to parse UI Tools Config ConfigMap data:', { error });
    }
  }

  uiToolsSettings.value = uiToolsConfigSettings;
}

/**
 * Merges the updated CRDs status to preserve reactivity and avoid losing status updates.
 */
function mergeAiAgentConfigCRDsStatusUpdate(updatedCrds: AIAgentConfigCRD[]) {
  if (!updatedCrds || !aiAgentConfigCRDs.value) {
    return;
  }

  updatedCrds.forEach((storeCrd) => {
    const crd = aiAgentConfigCRDs.value?.find((c) => c.metadata.name === storeCrd.metadata.name);

    if (crd) {
      crd.status = storeCrd.status;
    }
  });
}

/**
 * Saves the AI agent settings.
 */
async function saveAgentSettings() {
  const formDataToSave = {} as SettingsFormData;
  const formDataObject = aiAgentSettings.value as SettingsFormData;

  for (const key of Object.values(Settings) as Array<keyof SettingsFormData>) {
    const value = formDataObject[key];

    formDataToSave[key] = value || '';
  }

  await saveSettings(formDataToSave);
}

/**
 * Saves the AI agent config CRDs.
 */
async function saveAiAgentConfigCRDs() {
  let crds = [];

  try {
    crds = await store.dispatch(`management/findAll`, {
      type: RANCHER_AI_SCHEMA.AI_AGENT_CONFIG,
      opt:  { watch: true }
    });
  } catch (err) {
    warn('Unable to fetch AI Agent Config CRDs: ', { err });
  }

  const crdsToSave = aiAgentConfigCRDs.value || [];

  for (const crd of crds) {
    const existsInForm = crdsToSave.find((c) => c.metadata.name === crd.metadata.name);

    if (!existsInForm) {
      // Remove existing CRD not present in the form anymore
      try {
        await crd.remove();
      } catch (err) {
        warn(`Unable to delete AI Agent Config CRD ${ crd.metadata.name }: `, { err });
      }
    }
  }

  for (const crd of crdsToSave) {
    let aiAgentConfigCRD = crds.find((c: AIAgentConfigCRD) => c.metadata.name === crd.metadata.name);

    // Update existing CRD
    if (aiAgentConfigCRD) {
      // Preserve builtIn agents and only update enabled field
      if (aiAgentConfigCRD.spec.builtIn) {
        aiAgentConfigCRD.spec.enabled = crd.spec.enabled;
      } else {
        aiAgentConfigCRD.spec = crd.spec;
      }

    // Create new CRD
    } else {
      aiAgentConfigCRD = await store.dispatch('management/create', {
        type: RANCHER_AI_SCHEMA.AI_AGENT_CONFIG,
        ...crd,
      });
    }

    // Normalize authenticationSecret
    if (aiAgentConfigCRD.spec.authenticationType === AIAgentConfigAuthType.BASIC) {
      aiAgentConfigCRD.spec.authenticationSecret = aiAgentConfigCRD.spec.authenticationSecret?.replaceAll(`${ AGENT_NAMESPACE }/`, '');
    } else {
      delete aiAgentConfigCRD.spec.authenticationSecret;
    }

    try {
      await aiAgentConfigCRD.save();
    } catch (err) {
      warn(`Unable to create AI Agent Config CRD ${ crd.metadata.name }: `, { err });
    }
  }
}

/**
 * Saves the UI tools config to the ConfigMap.
 */
async function saveUIToolsConfig() {
  let configMap;

  try {
    configMap = await store.dispatch(`management/find`, {
      type: CONFIG_MAP,
      id:   `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`,
    });
  } catch (err) {
    warn('Unable to fetch UI Tools Config ConfigMap: ', { err });
  }

  if (configMap) {
    configMap.data = { config: JSON.stringify(uiToolsSettings.value || {}) };

    try {
      await configMap.save();
    } catch (err) {
      warn('Unable to save UI Tools Config ConfigMap: ', { err });
    }
  } else {
    warn('UI Tools Config ConfigMap not found, cannot save settings');
  }
}

/**
 * Saves the AI agent config authentication secrets.
 */
async function saveAiAgentConfigAuthenticationSecrets() {
  for (const agent of Object.keys(authenticationSecrets.value || {})) {
    const aiAgentConfigCRD = aiAgentConfigCRDs.value?.find((c) => c.metadata.name === agent);
    const secretPayload = authenticationSecrets.value[agent];

    if (!aiAgentConfigCRD || !secretPayload || (!secretPayload.privateKey && !secretPayload.publicKey)) {
      // No secret data to save
      continue;
    }

    const data = {
      password: base64Encode(secretPayload.privateKey || ''),
      username: base64Encode(secretPayload.publicKey || ''),
    };

    const secret = await store.dispatch('management/create', {
      type:     SECRET,
      metadata: {
        namespace:    AGENT_NAMESPACE,
        generateName: 'ai-agent-auth-',
        labels:       { [AI_AGENT_LABELS.MANAGED]: 'true' }
      },
      data,
    });

    secret._type = SECRET_TYPES.BASIC;

    try {
      const savedSecret = await secret.save();

      // Update reference to the new secret in the corresponding AI Agent Config CRD
      aiAgentConfigCRD.spec.authenticationType = AIAgentConfigAuthType.BASIC;
      aiAgentConfigCRD.spec.authenticationSecret = savedSecret.metadata.name;
    } catch (err) {
      warn(`Unable to save secret ${ secret.metadata.name } for agent ${ agent }: `, { err });
    }
  }
}

/**
 * Redeploys the rancher-ai-agent deployment to apply new settings.
 */
async function redeployAiAgent() {
  try {
    const deployment = await store.dispatch('management/find', {
      type: 'apps.deployment',
      id:   `${ AGENT_NAMESPACE }/${ AGENT_NAME }`,
    }) as Workload;

    const metadata = deployment.spec.template.metadata ??= {};
    const annotations = metadata.annotations ??= {};

    annotations['cattle.io/timestamp'] = dayjs().toISOString();

    await deployment.save();
  } catch (err) {
    warn('Unable to fetch rancher-ai-agent deployment: ', { err });
  }
}

/**
 * Saves the AI agent settings and redeploys the rancher-ai-agent deployment.
 *
 * @param btnCB Callback function to notify the result of the save operation.
 */
const save = async(btnCB: (arg: boolean) => void) => { // eslint-disable-line no-unused-vars
  try {
    if (permissions?.value?.create.canCreateSecrets) {
      // Save AI Agent Settings to Secret
      await saveAgentSettings();

      if (permissions?.value?.create.canCreateAiAgentCRDS) {
        // Save AI Agent Config authentication secrets created for the agents
        await saveAiAgentConfigAuthenticationSecrets();

        // Save AI Agent Config CRDs
        await saveAiAgentConfigCRDs();
      }

      if (permissions?.value?.create.canCreateConfigMaps) {
        await saveUIToolsConfig();
      }

      // Redeploy the rancher-ai-agent deployment after save
      await redeployAiAgent();
    }

    apiError.value = '';
    btnCB(true);
  } catch (error) {
    apiError.value = t('aiConfig.form.save.apiError', { error }, true);
    btnCB(false);
  }
};

function applySettings() {
  buttonProps.value.successLabel = t('asyncButton.done.success');
  buttonProps.value.successColor = 'bg-success';

  if (!!applySettingsCb.value) {
    save(applySettingsCb.value);

    isSaving.value = false;
  }
}

function discardSettings() {
  buttonProps.value.successLabel = t('asyncButton.apply.action');
  buttonProps.value.successColor = 'bg-primary';

  if (!!applySettingsCb.value) {
    applySettingsCb.value(true);
  }

  isSaving.value = false;
}

async function publishToolsDefinitionAndRefetch() {
  await publishToolsDefinition();

  fetchUIToolsConfigSettings();
}

function fetchPermissions() {
  const canListConfigMaps = store.getters['management/canList'](CONFIG_MAP);
  const canListSecrets = store.getters['management/canList'](SECRET);
  const canListDeployments = store.getters['management/canList'](WORKLOAD_TYPES.DEPLOYMENT);
  const canListAiAgentCRDS = canListSecrets && store.getters['management/canList'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);

  let schema = store.getters['management/schemaFor'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);
  const canCreateAiAgentCRDS = !!schema?.resourceMethods?.find((verb: any) => 'PUT' === verb);

  schema = store.getters['management/schemaFor'](SECRET);
  const canCreateSecrets = !!schema?.resourceMethods?.find((verb: any) => 'PUT' === verb);

  schema = store.getters['management/schemaFor'](CONFIG_MAP);
  const canCreateConfigMaps = !!schema?.resourceMethods?.find((verb: any) => 'PUT' === verb);

  permissions.value = {
    list:   {
      canListConfigMaps,
      canListSecrets,
      canListDeployments,
      canListAiAgentCRDS,
    },
    create: {
      canCreateSecrets,
      canCreateAiAgentCRDS,
      canCreateConfigMaps,
    }
  };
}

onMounted(async() => {
  fetchPermissions();

  await fetchAiAgentDeployment();

  if (!!aiAgentDeployment.value) {
    await fetchChatSettings();

    await fetchAiAgentSettings();

    await fetchAiAgentConfigCRDs();
    await fetchUIToolsConfigSettings();

    // Watch for status updates of AI Agent Config CRDs
    watch(
      () => store.getters['management/all'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG),
      mergeAiAgentConfigCRDsStatusUpdate,
      { deep: true }
    );
  }

  isLoading.value = false;
});
</script>

<template>
  <loading v-if="isLoading" />
  <div
    v-else
    class="ai-configs-container"
    data-testid="rancher-ai-ui-settings-container"
  >
    <h1 class="m-0">
      {{ t('aiConfig.form.header') }}
    </h1>

    <Banner
      v-if="!permissions?.list?.canListDeployments || !permissions?.list?.canListConfigMaps || !permissions?.list?.canListAiAgentCRDS"
      class="m-0"
      color="warning"
    >
      <RichTranslation
        :k="'aiConfig.form.warning.missingPermissions'"
      >
        <template #docsUrl="{ content }">
          <a
            :href="`${ PERMISSIONS_DOCS_URL }`"
            tabindex="0"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {{ content }} <i class="icon icon-external-link" />
            <span class="sr-only">{{ t('generic.opensInNewTab') }}</span>
          </a>
        </template>
      </RichTranslation>
    </Banner>

    <template
      v-else-if="!aiAgentDeployment || !aiAgentSettings"
    >
      <Banner
        v-if="!aiAgentDeployment"
        class="m-0"
        color="error"
        :label="t('aiConfig.form.warning.noDeployment')"
      />
      <Banner
        v-if="!aiAgentSettings"
        class="m-0"
        color="error"
        :label="t('aiConfig.form.section.provider.noSecret')"
      />
    </template>

    <template v-else>
      <settings-row
        :title="t('aiConfig.form.section.provider.header')"
        :description="t('aiConfig.form.section.provider.description')"
        data-testid="rancher-ai-ui-settings-ai-agent-settings"
      >
        <AIAgentSettings
          :value="aiAgentSettings"
          :read-only="!permissions?.create.canCreateSecrets"
          @update:value="aiAgentSettings = $event; apiError = ''"
          @update:validation-error="hasAiAgentSettingsValidationErrors = $event"
        />
      </settings-row>

      <settings-row
        :title="t('aiConfig.form.section.aiAgent.header')"
        :description="t('aiConfig.form.section.aiAgent.description')"
        data-testid="rancher-ai-ui-settings-ai-agent-configs"
      >
        <AIAgentConfigs
          v-if="aiAgentConfigCRDs"
          :value="aiAgentConfigCRDs"
          :read-only="!permissions?.create.canCreateSecrets || !permissions?.create.canCreateAiAgentCRDS"
          @update:value="aiAgentConfigCRDs = $event"
          @update:authentication-secrets="authenticationSecrets = $event"
          @update:validation-error="hasAiAgentConfigsValidationErrors = $event"
        />
      </settings-row>

      <settings-row
        :title="t('aiConfig.form.section.tools.header')"
        :description="t('aiConfig.form.section.tools.description')"
        data-testid="rancher-ai-ui-settings-tools"
      >
        <UIToolsConfig
          v-if="uiToolsSettings"
          :value="uiToolsSettings"
          :read-only="!permissions?.create.canCreateConfigMaps"
          :required-action="uiToolsDefinitionAction"
          @update:value="uiToolsSettings = $event"
          @publish:tools="publishToolsDefinitionAndRefetch"
        />
      </settings-row>

      <Banner
        v-if="!!apiError"
        class="m-0"
        color="error"
        :label="apiError"
      />

      <div class="form-footer">
        <async-button
          v-if="permissions?.create.canCreateAiAgentCRDS || permissions?.create.canCreateSecrets"
          action-label="Apply"
          data-testid="rancher-ai-ui-settings-save-button"
          :success-label="buttonProps.successLabel"
          :success-color="buttonProps.successColor"
          :disabled="hasAiAgentSettingsValidationErrors || hasAiAgentConfigsValidationErrors"
          @click="applySettingsCb = $event; isSaving = true"
        />
      </div>
    </template>
  </div>
  <app-modal
    v-if="isSaving"
    :width="400"
    :click-to-close="false"
    height="auto"
  >
    <ApplySettings
      :storage-type="chatSettings?.storageType || ''"
      @confirm="applySettings"
      @cancel="discardSettings"
    />
  </app-modal>
</template>

<style lang="scss" scoped>
.ai-configs-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
}

.form-footer {
  display: flex;
  flex-direction: row-reverse;
  margin-top: 16px;
}
</style>
