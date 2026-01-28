import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { RANCHER_AI, type Agent } from '../types';

/**
 * Composable for managing the AI agents.
 */
export function useAgentComposable(chatId: string) {
  const store = useStore();

  const agents = computed<Agent[]>(() => store.getters['management/all'](RANCHER_AI.AI_AGENT_CONFIG));

  const agentId = computed<string>(() => store.getters['rancher-ai-ui/chat/agentId'](chatId));

  async function fetchAgents() {
    await store.dispatch('management/findAll', { type: RANCHER_AI.AI_AGENT_CONFIG });
  }

  function selectAgent(agentId: string) {
    store.commit('rancher-ai-ui/chat/setAgentId', {
      chatId,
      agentId,
    });
  }

  onMounted(() => {
    fetchAgents();
  });

  return {
    agents,
    selectAgent,
    agentId,
  };
}
