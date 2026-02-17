import { onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { base64Decode } from '@shell/utils/crypto';
import { warn } from '../utils/log';
import { AGENT_NAMESPACE, AGENT_NAME, AGENT_CONFIG_SECRET_NAME, PRODUCT_NAME } from '../product';
import { SECRET, WORKLOAD_TYPES } from '@shell/config/types';
import { ActionType, ChatError, LLMConfig } from '../types';

/**
 * Composable for managing the AI service configuration.
 *
 * The llm-config secret is used to determine which AI model is being used (shown in the Console panel)
 * and to handle any errors related to the AI service's availability or configuration.
 *
 * @returns Composable for managing the AI service configuration.
 */
export function useAIServiceComposable() {
  const store = useStore();
  const { t } = useI18n(store);

  const llmConfig = ref<LLMConfig | null>(null);
  const error = ref<ChatError | null>(null);

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

  async function checkAgentDeploymentAvailability() {
    if (!store.getters['management/canList'](WORKLOAD_TYPES.DEPLOYMENT)) {
      error.value = { key: 'ai.error.services.deployment.noPermission' };

      return false;
    } else {
      try {
        const agent = await store.dispatch('management/find', {
          type: WORKLOAD_TYPES.DEPLOYMENT,
          id:   `${ AGENT_NAMESPACE }/${ AGENT_NAME }`
        });

        if (agent && agent.state !== 'active') {
          error.value = {
            key:    'ai.error.services.deployment.notActive',
            action: {
              label:    t('ai.installation.goToDeployment'),
              type:     ActionType.Button,
              resource: {
                cluster:   'local',
                type:      WORKLOAD_TYPES.DEPLOYMENT,
                namespace: AGENT_NAMESPACE,
                name:      AGENT_NAME
              }
            }
          };
        }
      } catch (e) {
        warn('\'rancher-ai-agent\' deployment not found', e);
        error.value = {
          key:    'ai.error.services.deployment.notFound',
          action: {
            label:    t('ai.installation.goToInstall'),
            type:     ActionType.Button,
            resource: {
              cluster:        'local',
              detailLocation: { name: 'c-cluster-apps-charts' }
            }
          }
        };
      }
    }

    return !error.value;
  }

  async function getLLMConfigs() {
    if (!store.getters['management/canList'](SECRET)) {
      error.value = { key: 'ai.error.services.secret.noPermission' };

      return;
    }

    try {
      const secret = await store.dispatch('management/find', {
        type:    SECRET,
        id:      `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`
      });

      if (secret?.data) {
        llmConfig.value = decodeLLMConfig(secret.data);
      }
    } catch (e) {
      warn('Error fetching agent configuration secret:', e);
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
  }

  onMounted(async() => {
    const available = await checkAgentDeploymentAvailability();

    if (available) {
      getLLMConfigs();
    }
  });

  return {
    llmConfig,
    error
  };
}
