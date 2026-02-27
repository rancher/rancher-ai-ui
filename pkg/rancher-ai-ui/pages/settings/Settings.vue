<script setup lang="ts">
import dayjs from 'dayjs';
import {
  ref,
  onMounted,
} from 'vue';
import { useStore } from 'vuex';
import { useShell } from '@shell/apis';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_CONFIG_SECRET_NAME, AGENT_CONFIG_CONFIG_MAP_NAME } from '../../product';
import { warn } from '../../utils/log';
import { CONFIG_MAP, SECRET, WORKLOAD_TYPES } from '@shell/config/types';
import { SECRET_TYPES } from '@shell/config/secret';
import { useI18n } from '@shell/composables/useI18n';
import { base64Decode, base64Encode } from '@shell/utils/crypto';
import Banner from '@components/Banner/Banner.vue';
import AsyncButton from '@shell/components/AsyncButton.vue';
import Loading from '@shell/components/Loading.vue';
import {
  SettingsFormData, Settings, Workload, AiAgentConfigSecretPayload, AIAgentConfigAuthType,
  SettingsPermissions
} from './types';
import { AIAgentConfigCRD, RANCHER_AI_SCHEMA } from '../../types';
import { AI_AGENT_LABELS } from '../../labels-annotations';
import SettingsRow from './SettingsRow.vue';
import AIAgentConfigs from './sections/AIAgentConfigs.vue';
import AIAgentSettings from './sections/AIAgentSettings.vue';
import ApplySettings from '../../dialog/ApplySettingsCard.vue';
import { useChatApiComposable } from '../../composables/useChatApiComposable';

/**
 * Settings page for configuring Rancher AI assistant.
 */

const store = useStore();
const { t } = useI18n(store);
const shellApi = useShell();

// TODO: All settings will be fetched through the API in the future.
const { fetchSettings, saveSettings } = useChatApiComposable();

const isLoading = ref(true);
const aiAgentDeployment = ref<Workload | null>(null);
const aiAgentSettings = ref<SettingsFormData | null>(null);
const aiAgentConfigCRDs = ref<AIAgentConfigCRD[] | null>(null);
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
 * Fetches the rancher-ai-agent deployment to check if the AI agent is installed.
 */
async function fetchAiAgentDeployment() {
  try {
    return await store.dispatch('management/find', {
      type:    WORKLOAD_TYPES.DEPLOYMENT,
      id:      `${ AGENT_NAMESPACE }/${ AGENT_NAME }`
    });
  } catch (e) {
    warn('Error fetching AI agent deployment:', e);
  }

  return null;
}

/**
 * Fetches the AI agent settings from the llmConfig Secret.
 */
async function fetchAiAgentSettings() {
  const settingsFormData = {} as SettingsFormData;

  let secret;
  let configMap;

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

  aiAgentSettings.value = settingsFormData;
};

/**
 * Fetches the AI agent config CRDs.
 */
async function fetchAiAgentConfigCRDs() {
  let crds: AIAgentConfigCRD[] = [];

  try {
    crds = await store.dispatch(`management/findAll`, {
      type: RANCHER_AI_SCHEMA.AI_AGENT_CONFIG,
      opt:  { watch: true }
    });
  } catch (err) {
    warn('Unable to fetch AI Agent Config CRDs: ', { err });
  }

  aiAgentConfigCRDs.value = crds;
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

        // Re-watch configs to get any changes made in the backend (status updates)
        fetchAiAgentConfigCRDs();
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

async function openApplySettingsDialog(btnCB: (arg: boolean) => void) { // eslint-disable-line no-unused-vars
  const chatSettings = await fetchSettings();

  shellApi.modal.open(ApplySettings, {
    props: {
      storageType: chatSettings?.storageType || '',
      onConfirm:   () => {
        buttonProps.value.successLabel = t('asyncButton.done.success');
        buttonProps.value.successColor = 'bg-success';
        save(btnCB);
      },
      onCancel: () => {
        buttonProps.value.successLabel = t('asyncButton.apply.action');
        buttonProps.value.successColor = 'bg-primary';
        btnCB(true);
      },
    },
    closeOnClickOutside: false,
    width:               '400px',
  });
}

function fetchPermissions() {
  const canListSecrets = store.getters['management/canList'](SECRET);
  const canListAiAgentCRDS = store.getters['management/canList'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);

  let schema = store.getters['management/schemaFor'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);
  const canCreateAiAgentCRDS = !!schema?.resourceMethods.find((verb: any) => 'PUT' === verb);

  schema = store.getters['management/schemaFor'](SECRET);
  const canCreateSecrets = !!schema?.resourceMethods.find((verb: any) => 'PUT' === verb);

  permissions.value = {
    list:   {
      canListSecrets,
      canListAiAgentCRDS
    },
    create: {
      canCreateSecrets,
      canCreateAiAgentCRDS
    }
  };
}

onMounted(async() => {
  aiAgentDeployment.value = await fetchAiAgentDeployment();

  isLoading.value = false;

  if (aiAgentDeployment.value === null) {
    return;
  }

  fetchPermissions();

  if (permissions.value?.list?.canListSecrets) {
    fetchAiAgentSettings();
  }
  if (permissions.value?.list?.canListAiAgentCRDS) {
    fetchAiAgentConfigCRDs();
  }
});
</script>

<template>
  <loading v-if="isLoading || (permissions?.list.canListSecrets && !aiAgentSettings) || (permissions?.list.canListAiAgentCRDS && !aiAgentConfigCRDs)" />
  <div
    v-else
    class="ai-configs-container"
    data-testid="rancher-ai-ui-settings-container"
  >
    <h1 class="m-0">
      {{ t('aiConfig.form.header') }}
    </h1>

    <Banner
      v-if="aiAgentDeployment === null"
      class="m-0"
      color="warning"
      :label="t('aiConfig.form.warning.noDeployment', { namespace: AGENT_NAMESPACE, name: AGENT_NAME })"
    />

    <template v-else>
      <settings-row
        :title="t('aiConfig.form.section.provider.header')"
        :description="t('aiConfig.form.section.provider.description')"
        data-testid="rancher-ai-ui-settings-ai-agent-settings"
      >
        <AIAgentSettings
          v-if="aiAgentSettings"
          :value="aiAgentSettings"
          :read-only="!permissions?.create.canCreateSecrets"
          @update:value="aiAgentSettings = $event; apiError = ''"
          @update:validation-error="hasAiAgentSettingsValidationErrors = $event"
        />
        <Banner
          v-else-if="!permissions?.list.canListSecrets"
          class="m-0"
          color="warning"
          :label="t('aiConfig.form.section.provider.noPermission.list')"
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
        <Banner
          v-else-if="!permissions?.list.canListAiAgentCRDS"
          class="m-0"
          color="warning"
          :label="t('aiConfig.form.section.aiAgent.noPermission.list')"
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
          @click="openApplySettingsDialog"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.ai-configs-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-footer {
  display: flex;
  flex-direction: row-reverse;
  margin-top: 16px;
}
</style>
