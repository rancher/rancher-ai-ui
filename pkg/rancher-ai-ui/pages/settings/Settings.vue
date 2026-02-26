<script setup lang="ts">
import dayjs from 'dayjs';
import {
  ref, onBeforeMount,
  onMounted,
} from 'vue';
import { useStore } from 'vuex';
import { useShell } from '@shell/apis';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_CONFIG_SECRET_NAME } from '../../product';
import { warn } from '../../utils/log';
import { SECRET } from '@shell/config/types';
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

const { fetchSettings } = useChatApiComposable();

const aiAgentSettings = ref<SettingsFormData | null>(null);
const aiAgentConfigCRDs = ref<AIAgentConfigCRD[] | null>(null);
const authenticationSecrets = ref<Record<string, AiAgentConfigSecretPayload | null>>({});

const permissions = ref<SettingsPermissions | null>(null);
const hasErrors = ref<boolean>(false);

const buttonProps = ref({
  successLabel: t('asyncButton.apply.action'),
  successColor: 'bg-success',
});

/**
 * Fetches the AI agent settings from the llmConfig Secret.
 */
async function fetchAiAgentSettings() {
  let secret;

  try {
    secret = await store.dispatch(`management/find`, {
      type: SECRET,
      id:   `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`,
      opt:  { watch: true }
    });
  } catch (err) {
    warn('Unable to fetch secret: ', { err });
  }

  const settingsFormData: SettingsFormData = {};

  for (const entry in (secret?.data || {})) {
    settingsFormData[entry as keyof SettingsFormData] = base64Decode(secret.data[entry] || '');
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
 * Saves the AI agent settings to the llmConfig Secret.
 *
 * If the Secret does not exist, it creates a new one.
 */
async function saveAgentSettings() {
  const formDataToSave: { [key: string]: string } = {};
  const formDataObject = aiAgentSettings.value as SettingsFormData;

  for (const key of Object.values(Settings) as Array<keyof SettingsFormData>) {
    const value = formDataObject[key];

    formDataToSave[key] = base64Encode(value || '');
  }

  let secret;

  try {
    secret = await store.dispatch(`management/find`, {
      type: SECRET,
      id:   `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`,
      opt:  { watch: true }
    });
  } catch (err) {
    warn('Unable to fetch secret: ', { err });
  } finally {
    if (secret) {
      // Update existing secret
      secret.data = {
        ...secret.data,
        ...formDataToSave,
      };
    } else {
      // Create a new secret if one does not exist
      secret = await store.dispatch('management/create', {
        type:     SECRET,
        metadata: {
          namespace: AGENT_NAMESPACE,
          name:      AGENT_CONFIG_SECRET_NAME,
        },
        data: formDataToSave,
      });
    }

    try {
      // AI assistant namespace may not exist yet, so wrap save in try/catch
      await secret.save();
    } catch (err) {
      warn('Unable to create llmConfig secret: ', { err });
    }
  }
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

    btnCB(true);
  } catch (err) { // eslint-disable-line no-unused-vars
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

function getPermissions() {
  const canListSecrets = store.getters['management/canList'](SECRET);
  const canListAiAgentCRDS = store.getters['management/canList'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);

  let schema = store.getters['management/schemaFor'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);
  const canCreateAiAgentCRDS = !!schema?.resourceMethods.find((verb: any) => 'PUT' === verb);

  schema = store.getters['management/schemaFor'](SECRET);
  const canCreateSecrets = !!schema?.resourceMethods.find((verb: any) => 'PUT' === verb);

  return {
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

onBeforeMount(() => {
  permissions.value = getPermissions();
});

onMounted(() => {
  const listPermissions = permissions.value?.list;

  if (listPermissions?.canListSecrets) {
    fetchAiAgentSettings();
  }
  if (listPermissions?.canListAiAgentCRDS) {
    fetchAiAgentConfigCRDs();
  }
});
</script>

<template>
  <loading v-if="(permissions?.list.canListSecrets && !aiAgentSettings) || (permissions?.list.canListAiAgentCRDS && !aiAgentConfigCRDs)" />
  <div
    v-else
    class="ai-configs-container"
    data-testid="rancher-ai-ui-settings-container"
  >
    <h1 class="m-0">
      {{ t('aiConfig.form.header') }}
    </h1>

    <settings-row
      :title="t('aiConfig.form.section.provider.header')"
      :description="t('aiConfig.form.section.provider.description')"
      data-testid="rancher-ai-ui-settings-ai-agent-settings"
    >
      <AIAgentSettings
        v-if="aiAgentSettings"
        :value="aiAgentSettings"
        :read-only="!permissions?.create.canCreateSecrets"
        @update:value="aiAgentSettings = $event"
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
        @update:validation-error="hasErrors = $event"
      />
      <Banner
        v-else-if="!permissions?.list.canListAiAgentCRDS"
        class="m-0"
        color="warning"
        :label="t('aiConfig.form.section.aiAgent.noPermission.list')"
      />
    </settings-row>

    <div class="form-footer">
      <async-button
        v-if="permissions?.create.canCreateAiAgentCRDS || permissions?.create.canCreateSecrets"
        action-label="Apply"
        data-testid="rancher-ai-ui-settings-save-button"
        :success-label="buttonProps.successLabel"
        :success-color="buttonProps.successColor"
        :disabled="hasErrors"
        @click="openApplySettingsDialog"
      />
    </div>
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
