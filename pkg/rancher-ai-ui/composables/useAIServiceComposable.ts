import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { base64Decode } from '@shell/utils/crypto';
import { warn } from '../utils/log';
import { AGENT_NAMESPACE, AGENT_NAME, AGENT_CONFIG_SECRET_NAME, PRODUCT_NAME } from '../product';
import { SECRET, WORKLOAD_TYPES } from '@shell/config/types';
import { ActionType, ChatError, LLMConfig } from '../types';

/**
 * Composable for fetching AI service configuration and monitoring the AI agent state.
 *
 * The AI agent's deployment state is monitored to determine if the AI service is available.
 *  - If the deployment is not found, an error is set indicating that the service is unavailable.
 *  - If the deployment exists, the llm-config secret is fetched to determine the active LLM and model being used.
 *
 * The llm-config secret is used to determine which AI model is being used (shown in the Console panel)
 * and to handle any errors related to the AI service's availability or configuration.
 *
 * @returns Composable for managing the AI service configuration.
 */
export function useAIServiceComposable() {
  const store = useStore();
  const { t } = useI18n(store);

  const initiated = ref(false);
  const llmConfig = ref<LLMConfig | null>(null);
  const error = ref<ChatError | null>(null);

  const aiAgentDeploymentState = computed(() => {
    const deployments = store.getters['management/all'](WORKLOAD_TYPES.DEPLOYMENT);

    const deployment = deployments.find((d: any) => d.metadata?.name === AGENT_NAME && d.metadata?.namespace === AGENT_NAMESPACE);

    if (!initiated.value) {
      return undefined;
    }

    if (!deployment) {
      return 'not-found';
    }

    return deployment?.state;
  });

  function decodeLLM(ACTIVE_LLM: string): string {
    try {
      return base64Decode(ACTIVE_LLM);
    } catch (error) {
      warn('Error decoding ACTIVE_LLM:', error);
    }

    return '';
  }

  function decodeModel(data: any, activeLLM: string | null) {
    let model = '';

    try {
      if (activeLLM) {
        const modelKey = `${ activeLLM.toUpperCase() }_MODEL`;

        model = base64Decode(data[modelKey] || '');
      }

      if (!model) {
        const { MODEL } = data;

        model = base64Decode(MODEL || '');
      }
    } catch (err) {
      warn(`Error decoding model for ${ activeLLM }:`, err);
    }

    return model;
  }

  function decodeLLMConfig(data: any): LLMConfig | null {
    let activeLLM = '';
    let activeModel = '';

    const {
      ACTIVE_LLM,
      OLLAMA_URL,
      GOOGLE_API_KEY,
      OPENAI_API_KEY,
      AWS_SECRET_ACCESS_KEY,
      AWS_BEARER_TOKEN_BEDROCK,
    } = data;

    if (ACTIVE_LLM) {
      activeLLM = decodeLLM(ACTIVE_LLM);
    } else if (OLLAMA_URL) {
      activeLLM = 'ollama';
    } else if (GOOGLE_API_KEY) {
      activeLLM = 'gemini';
    } else if (OPENAI_API_KEY) {
      activeLLM = 'openai';
    } else if (AWS_SECRET_ACCESS_KEY || AWS_BEARER_TOKEN_BEDROCK) {
      activeLLM = 'bedrock';
    }

    activeModel = decodeModel(data, activeLLM);

    if (activeLLM && activeModel) {
      return {
        name:  t(`ai.configurations.models.${ activeLLM }`),
        model: activeModel
      };
    }

    return null;
  }

  async function fetchDeployments() {
    if (store.getters['management/canList'](WORKLOAD_TYPES.DEPLOYMENT)) {
      await store.dispatch('management/findAll', { type: WORKLOAD_TYPES.DEPLOYMENT });

      return;
    }

    error.value = { key: 'ai.error.services.deployment.noPermission' };
  }

  async function fetchLLMConfigs() {
    if (store.getters['management/canList'](SECRET)) {
      try {
        const secret = await store.dispatch('management/find', {
          type:    SECRET,
          id:      `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`
        });

        if (secret?.data) {
          llmConfig.value = decodeLLMConfig(secret.data);
        }
      } catch (e) {
        warn('Error fetching llm-config secret:', e);
      }

      if (!llmConfig.value) {
        error.value = {
          key:    'ai.error.services.secret.missingConfig',
          action: {
            label:    t('ai.settings.goToSettings'),
            type:     ActionType.Button,
            resource: {
              cluster:        'local',
              detailLocation: { name: `c-cluster-settings-${ PRODUCT_NAME }` }
            }
          }
        };
      }

      return;
    }

    error.value = { key: 'ai.error.services.secret.noPermission' };
  }

  function resetError() {
    error.value = null;
  }

  watch(() => aiAgentDeploymentState.value, (newState) => {
    if (newState === 'not-found') {
      error.value = { key: 'ai.error.services.deployment.notFound' };
    } else {
      error.value = null;

      fetchLLMConfigs();
    }
  });

  onMounted(async() => {
    await fetchDeployments();

    initiated.value = true;
  });

  return {
    aiAgentDeploymentState,
    llmConfig,
    error,
    resetError
  };
}
