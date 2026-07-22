<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { base64Decode } from '@shell/utils/crypto';
import { SECRET } from '@shell/config/types';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import Password from '@shell/components/form/Password.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import DetailText from '@shell/components/DetailText.vue';
import formRulesGenerator from '@shell/utils/validators/formRules';
import { warn } from '../../../../utils/log';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_REST_API_PATH } from '../../../../product';
import { AIAgentAPIEvent } from '../../../../types';
import { AiAgentConfigOAuth2SecretPayload } from '../../types';
import DiscoveryBanner from '../../../../components/DiscoveryBanner/DiscoveryBanner.vue';
import { useAIAgentApiComposable } from '../../../../composables/useAIAgentApiComposable';

interface DiscoveryStatus {
  result?: 'success' | 'warning' | 'info' | null;
  message?: string;
}

const HOME_PAGE_URL = window.location.origin;
const CALLBACK_URL = `${ window.location.origin }/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ AGENT_NAME }:80/proxy/${ AGENT_REST_API_PATH }/oauth2/callback`;

const store = useStore();
const { t } = useI18n(store);

const validators = (key: string) => formRulesGenerator(t, { key });

const props = defineProps({
  secretName: {
    type:     String,
    default:  '',
  },
  value: {
    type:     Object as () => AiAgentConfigOAuth2SecretPayload | null,
    default:  null,
  },
  mcpUrl: {
    type:     String,
    default:  '',
  },
  apiComposable: {
    type:     Object as () => ReturnType<typeof useAIAgentApiComposable>,
    default:  () => ({}),
  },
});

const {
  fetchMcpAuthenticationMetadata,
  cancelFetchMcpAuthenticationMetadata,
  fetchMcpAuthenticationClientInfo,
  cancelFetchMcpAuthenticationClientInfo,
  fetchMcpAuthenticationScopes,
} = props.apiComposable;

const emit = defineEmits(['update:value']);

const mcpScopes = ref<string[] | null>(null);

const metadataDiscoveryStatus = ref<DiscoveryStatus>({});
const clientInfoDiscoveryStatus = ref<DiscoveryStatus>({});

const isRequiredRule = (key: string) => {
  const validator = validators(t(key));

  return [
    validator.required,
  ];
};

async function fetchSecret() {
  if (!props.secretName) {
    return;
  }

  if (!!props.value) {
    return;
  }

  try {
    const secret = await store.dispatch(`management/find`, {
      type: SECRET,
      id:   `${ AGENT_NAMESPACE }/${ props.secretName }`,
      opt:  { watch: true }
    });

    if (secret?.data) {
      updateSecretValues({
        metadataEndpoint: base64Decode(secret.data['metadataEndpoint'] || ''),
        clientID:         base64Decode(secret.data['clientID'] || ''),
        clientSecret:     base64Decode(secret.data['clientSecret'] || ''),
        scopes:           base64Decode(secret.data['scope'] || '')?.split(' ').filter((f: string) => !!f) || []
      });
    }
  } catch (err) {
    warn(`Unable to fetch the ${ props.secretName } secret: `, { err });
  }
};

/**
 * Fetches the scopes supported by the MCP (Multi-Cluster Platform) for OAuth2 authentication.
 * It uses the mcpScopesCache to avoid unnecessary API calls if the scopes have already been fetched
 * to populate the scopes dropdown.
 */
async function fetchMcpScopesOptions() {
  if (!props.mcpUrl || mcpScopes.value !== null || !props.value) {
    return;
  }

  metadataDiscoveryStatus.value = { result: null };

  mcpScopes.value = await fetchMcpAuthenticationScopes({ mcpUrl: props.mcpUrl });

  metadataDiscoveryStatus.value = { result: 'info' };
}

async function confirmMetadataDiscovery() {
  if (!props.mcpUrl) {
    return;
  }

  metadataDiscoveryStatus.value = { result: null };

  const data = await fetchMcpAuthenticationMetadata({ mcpUrl: props.mcpUrl });

  if (!data || data.code === AIAgentAPIEvent.Error) {
    mcpScopes.value = [];

    metadataDiscoveryStatus.value = {
      result:  'warning',
      message: data?.message || ''
    };

    return;
  }

  if (data.code === AIAgentAPIEvent.Abort) {
    metadataDiscoveryStatus.value = { result: 'info' };

    return;
  }

  mcpScopes.value = data.scopesSupported || [];

  updateSecretValues({ metadataEndpoint: data.metadataEndpoint });

  metadataDiscoveryStatus.value = { result: 'success' };
}

async function confirmClientInfoDiscovery() {
  if (!props.value?.metadataEndpoint) {
    return;
  }

  clientInfoDiscoveryStatus.value = { result: null };

  const data = await fetchMcpAuthenticationClientInfo({ metadataEndpoint: props.value.metadataEndpoint || '' });

  if (!data || data.code === AIAgentAPIEvent.Error) {
    clientInfoDiscoveryStatus.value = {
      result:  'warning',
      message: data?.message || ''
    };

    return;
  }

  if (data.code === AIAgentAPIEvent.Abort) {
    clientInfoDiscoveryStatus.value = { result: 'info' };

    return;
  }

  updateSecretValues({
    clientID:     data.clientId,
    clientSecret: data.clientSecret
  });

  clientInfoDiscoveryStatus.value = { result: 'success' };
}

function updateSecretValues(payload: Partial<AiAgentConfigOAuth2SecretPayload>) {
  const newValues = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  emit('update:value', {
    ...(props.value || {}),
    ...newValues
  });
}

function cancelMetadataDiscovery() {
  cancelFetchMcpAuthenticationMetadata();

  metadataDiscoveryStatus.value = { result: 'info' };
}

function cancelClientInfoDiscovery() {
  cancelFetchMcpAuthenticationClientInfo();

  clientInfoDiscoveryStatus.value = { result: 'info' };
}

onMounted(async() => {
  await fetchSecret();

  await fetchMcpScopesOptions();
});

onBeforeUnmount(() => {
  cancelMetadataDiscovery();
  cancelClientInfoDiscovery();
});
</script>

<template>
  <div class="row">
    <DiscoveryBanner
      :status="metadataDiscoveryStatus"
      translation-key="aiConfig.form.section.aiAgent.fields.oauth2.metadata.discoverInfo"
      @confirm="confirmMetadataDiscovery"
      @cancel="cancelMetadataDiscovery"
    />
  </div>
  <div class="row">
    <div class="col span-12 in-progress-badge">
      <LabeledInput
        :value="props.value?.metadataEndpoint || ''"
        :label="t('aiConfig.form.section.aiAgent.fields.oauth2.metadata.label')"
        :placeholder="t('aiConfig.form.section.aiAgent.fields.oauth2.metadata.placeholder')"
        :rules="isRequiredRule('aiConfig.form.section.aiAgent.fields.oauth2.metadata.label')"
        :required="true"
        :disabled="metadataDiscoveryStatus?.result === null"
        @update:value="(val: string) => updateSecretValues({ metadataEndpoint: val })"
      />
    </div>
  </div>
  <div class="row">
    <div class="col span-12 in-progress-badge">
      <LabeledSelect
        v-if="mcpScopes?.length"
        :value="props.value?.scopes || []"
        :label="t('aiConfig.form.section.aiAgent.fields.oauth2.scopes.label')"
        :options="mcpScopes || []"
        :taggable="true"
        :multiple="true"
        :placeholder="t('aiConfig.form.section.aiAgent.fields.oauth2.scopes.placeholder.select', { count: mcpScopes?.length || 0 }, true)"
        :disabled="metadataDiscoveryStatus?.result === null"
        @update:value="(val: string[]) => updateSecretValues({ scopes: val })"
      />
      <LabeledInput
        v-else
        :value="props.value?.scopes?.join(' ') || ''"
        :label="t('aiConfig.form.section.aiAgent.fields.oauth2.scopes.label')"
        :placeholder="t('aiConfig.form.section.aiAgent.fields.oauth2.scopes.placeholder.input')"
        :disabled="metadataDiscoveryStatus?.result === null"
        @update:value="(val: string) => updateSecretValues({ scopes: val?.split(' ').filter((f: string) => !!f) })"
      />
      <i
        v-if="metadataDiscoveryStatus?.result === null"
        class="icon icon-spinner icon-spin icon-lg"
      />
    </div>
  </div>

  <div class="row">
    <DiscoveryBanner
      :status="clientInfoDiscoveryStatus"
      translation-key="aiConfig.form.section.aiAgent.fields.oauth2.client.discoverInfo"
      @confirm="confirmClientInfoDiscovery"
      @cancel="cancelClientInfoDiscovery"
    />
  </div>
  <div class="row">
    <div class="col span-6">
      <LabeledInput
        :value="props.value?.clientID || ''"
        :label="t('aiConfig.form.section.aiAgent.fields.oauth2.clientId.label')"
        :placeholder="t('aiConfig.form.section.aiAgent.fields.oauth2.clientId.placeholder')"
        :required="true"
        :rules="isRequiredRule('aiConfig.form.section.aiAgent.fields.oauth2.clientId.label')"
        :disabled="clientInfoDiscoveryStatus?.result === null"
        @update:value="(val: string) => updateSecretValues({ clientID: val })"
      />
    </div>
    <div class="col span-6 in-progress-badge">
      <Password
        :class="{
          'in-progress-discovery': clientInfoDiscoveryStatus?.result === null,
        }"
        :value="props.value?.clientSecret || ''"
        :label="t('aiConfig.form.section.aiAgent.fields.oauth2.clientSecret.label')"
        :required="true"
        :rules="isRequiredRule('aiConfig.form.section.aiAgent.fields.oauth2.clientSecret.label')"
        :mode="clientInfoDiscoveryStatus?.result === null ? _VIEW : _EDIT"
        @update:value="(val: string) => updateSecretValues({ clientSecret: val })"
      />
      <i
        v-if="clientInfoDiscoveryStatus?.result === null"
        class="icon icon-spinner icon-spin icon-lg"
      />
    </div>
  </div>

  <div class="helper-box">
    <div class="helper-title">
      <h3 class="m-0">
        {{ t('aiConfig.form.section.aiAgent.fields.oauth2.helper.title') }}
      </h3>
    </div>
    <div class="row">
      <div class="col span-6">
        <DetailText
          class="helper-field"
          :value="HOME_PAGE_URL"
          label-key="aiConfig.form.section.aiAgent.fields.oauth2.homepageUrl.label"
        />
      </div>
      <div class="col span-6">
        <DetailText
          class="helper-field"
          :value="CALLBACK_URL"
          label-key="aiConfig.form.section.aiAgent.fields.oauth2.callbackUrl.label"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.helper-box {
  background-color: var(--box-bg);
  border-radius: var(--border-radius);
  padding: 16px;

  .helper-title {
    padding: 4px 0 20px 0;
  }

  .helper-field {
    :deep(h5) {
      margin-bottom: 8px;
    }
    :deep(.monospace) {
      display: block;
      white-space: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }
    :deep(.btn) {
      // btn-sm
      padding: 0 12px;
      min-height: 30px;
      line-height: 28px;
    }
  }
}

.in-progress-badge {
  display: flex;
  align-items: center;
  gap: 16px;

  div {
    width: 100%;
  }
}

.in-progress-discovery {
  :deep() .labeled-input {
    color: var(--input-disabled-text);
    background-color: var(--input-disabled-bg);
    outline-width: 0;
    border-color: var(--input-disabled-border);
    cursor: not-allowed;
  }
}
</style>
