import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { warn } from '../utils/log';
import {
  AGENT_NAMESPACE, AGENT_NAME, AGENT_CONFIG_SECRET_NAME, PRODUCT_NAME, AGENT_CONFIG_CONFIG_MAP_NAME
} from '../product';
import { CONFIG_MAP, SECRET, WORKLOAD_TYPES } from '@shell/config/types';
import {
  ActionType, AIServiceState, ChatError, LLMConfig, LLMProvider
} from '../types';

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
      return AIServiceState.NotFound;
    }

    return deployment?.state;
  });

  function decodeModel(configMapData: any, activeLLM: string | null) {
    let model = '';

    try {
      if (activeLLM) {
        const modelKey = `${ activeLLM.toUpperCase() }_MODEL`;

        model = configMapData[modelKey] || '';
      }
    } catch (err) {
      warn(`Error decoding model for ${ activeLLM }:`, err);
    }

    return model;
  }

  function decodeLLMConfig(secretData: any, configMapData: any): LLMConfig | null {
    let activeLLM = '';
    let activeModel = '';

    const {
      OLLAMA_URL,
      GOOGLE_API_KEY,
      OPENAI_API_KEY,
      AWS_BEARER_TOKEN_BEDROCK,
    } = secretData;

    const { ACTIVE_LLM } = configMapData;

    if (ACTIVE_LLM) {
      activeLLM = ACTIVE_LLM;
    } else if (OLLAMA_URL) {
      activeLLM = LLMProvider.Local;
    } else if (GOOGLE_API_KEY) {
      activeLLM = LLMProvider.Gemini;
    } else if (OPENAI_API_KEY) {
      activeLLM = LLMProvider.OpenAI;
    } else if (AWS_BEARER_TOKEN_BEDROCK) {
      activeLLM = LLMProvider.Bedrock;
    }

    activeModel = decodeModel(configMapData, activeLLM);

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
    if (store.getters['management/canList'](SECRET) && store.getters['management/canList'](CONFIG_MAP)) {
      let secret;
      let configMap;

      try {
        secret = await store.dispatch('management/find', {
          type:    SECRET,
          id:      `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`
        });
      } catch (e) {
        warn('Error fetching llm-config secret:', e);
      }

      try {
        configMap = await store.dispatch('management/find', {
          type:    CONFIG_MAP,
          id:      `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`
        });
      } catch (e) {
        warn('Error fetching llm-config config map:', e);
      }

      if (secret?.data && configMap?.data) {
        llmConfig.value = decodeLLMConfig(secret.data, configMap.data);
      }

      if (!llmConfig.value) {
        error.value = {
          key:    'ai.error.services.settings.missingConfig',
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

    error.value = { key: 'ai.error.services.settings.noPermission' };
  }

  function resetError() {
    error.value = null;
  }

  watch(() => aiAgentDeploymentState.value, (newState) => {
    if (newState === AIServiceState.NotFound) {
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
