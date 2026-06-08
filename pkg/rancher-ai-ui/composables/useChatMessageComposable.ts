import { ref, computed, onMounted, ComputedRef } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { NORMAN } from '@shell/config/types';
import { PRODUCT_NAME } from '../product';
import {
  ActionType,
  Agent,
  AgentSelectionMode,
  ChatError,
  ChatMetadata,
  ConfirmationResponse,
  ConfirmationStatus,
  Message,
  MessageAction,
  MessageInternalSource,
  MessageLabelKey,
  MessagePhase,
  MessageProcessingState,
  MessageTag,
  MessageTemplateComponent,
  Role,
  Tag
} from '../types';
import { ToolName } from '../components/tools/types';
import { warn } from '../utils/log';
import {
  formatWSInputMessage, formatMessageRelatedResourcesActions, formatConfirmationActions, formatFileMessages,
  formatErrorMessage, formatSourceLinks,
  formatChatMetadata,
  formatChatErrorMessage,
  formatTools,
  formatSubAgentProcessingMetadata,
  formatAgentMetadata,
} from '../utils/format';
import { downloadFile } from '@shell/utils/download';
import { useContextComposable } from './useContextComposable';
import { useAIAgentApiComposable } from './useAIAgentApiComposable';
import { useToolsComposable } from './useToolsComposable';

const EXPAND_THINKING = false;

const DISMISS_RECOMMENDED_AGENT_KEY = 'dismissed-agent-recommendation';
const MAX_MESSAGES_BEFORE_RECOMMENDATION = 5;

/**
 * Composable for managing chat messages within the AI chat.
 *
 * It's designed to handle message sending, receiving, updating, and confirming,
 * as well as managing the chat phase and error states.
 *
 * It exposes methods to interact with WebSocket events and to manipulate chat messages.
 *
 * @returns Composable for managing chat messages within the AI chat.
 */
export function useChatMessageComposable(
  chatId: string,
  hasPermissions: ComputedRef<boolean>,
  agents: ComputedRef<Agent[]>,
  agentName: ComputedRef<string>,
  selectAgent: (name: string) => void // eslint-disable-line no-unused-vars
) {
  const store = useStore();
  const { t } = useI18n(store);

  const { selectContext, selectedContext } = useContextComposable();
  const { toolsSelector } = useToolsComposable();
  const { fetchUIToolsCalls } = useAIAgentApiComposable();

  const principal = store.getters['rancher/byId'](NORMAN.PRINCIPAL, store.getters['auth/principalId']) || {};

  const messageBox = computed(() => store.getters['rancher-ai-ui/chat/messageBox'](chatId));
  const messages = computed(() => Object.values(store.getters['rancher-ai-ui/chat/messages'](chatId)) as Message[]);
  const currentMsg = ref<Message>({} as Message);
  const error = computed(() => store.getters['rancher-ai-ui/chat/error'](chatId));

  const chatMetadata = computed<ChatMetadata>(() => store.getters['rancher-ai-ui/chat/metadata'] || {});
  const isChatInitialized = computed(() => !!chatMetadata.value.chatId);

  const processingState = computed(() => store.getters['rancher-ai-ui/chat/processingState'](chatId) || { phase: MessagePhase.Initializing });

  const setProcessingState = (processingState: MessageProcessingState) => {
    store.commit('rancher-ai-ui/chat/setProcessingState', {
      chatId,
      processingState
    });
  };

  function wsSend(ws: WebSocket, value: string) {
    if (!ws) {
      return;
    }

    ws.send(value);
  }

  function sendMessage(msg: string | Message, ws: WebSocket) {
    let role = Role.User;

    let summaryContent = '';
    let messageContent = msg as string;
    let contextContent = selectedContext.value;
    let labels = undefined;
    let source;

    // msg is type of Message
    if (msg && typeof msg === 'object' && msg.messageContent) {
      role = msg.role;

      summaryContent = msg.summaryContent || '';
      if (summaryContent) {
        labels = { [MessageLabelKey.Summary]: summaryContent };
      }

      messageContent = msg.messageContent || '';
      contextContent = msg.contextContent || [];
      source = msg.source;
    } else { /* msg is type of string */ }

    wsSend(ws, formatWSInputMessage({
      prompt:  messageContent,
      context: selectedContext.value,
      agent:   agentName.value,
      tools:   toolsSelector.value,
      labels
    }));

    const agentMetadata = { agent: agents.value.find((a) => a.name === agentName.value) || {} as Agent };

    addMessage({
      role,
      agentMetadata,
      summaryContent,
      messageContent,
      contextContent,
      source
    });

    if (source === MessageInternalSource.MessageBox) {
      clearMessageBox();
    }

    setProcessingState({ phase: MessagePhase.Processing });
  }

  async function addMessage(message: Message) {
    return await store.dispatch('rancher-ai-ui/chat/addMessage', {
      chatId,
      message
    });
  }

  function updateMessage(message: Partial<Message>) {
    store.commit('rancher-ai-ui/chat/updateMessage', {
      chatId,
      message
    });
  }

  function confirmMessage({ message, result }: { message: Message; result: boolean }, ws: WebSocket) {
    wsSend(ws, formatWSInputMessage({
      prompt: result ? ConfirmationResponse.Yes : ConfirmationResponse.No,
      tags:   [MessageTag.Confirmation]
    }));

    updateMessage({
      id:           message.id,
      confirmation: {
        actions: message.confirmation?.actions || null,
        status:  result ? ConfirmationStatus.Confirmed : ConfirmationStatus.Canceled
      },
    });

    if (message.source === MessageInternalSource.MessageBox) {
      clearMessageBox();
    }
  }

  function getMessage(messageId: string) {
    return store.getters['rancher-ai-ui/chat/message']({
      chatId,
      messageId
    });
  }

  function buildMessage(agentName?: string): Message {
    const agent = agentName ? agents.value.find((a) => a.name === agentName) : null;

    return {
      role:                     Role.Assistant,
      thinkingContent: '',
      messageContent:  '',
      showThinking:             EXPAND_THINKING,
      thinking:                 false,
      agentMetadata:   {
        agent:         agent || null,
        selectionMode: agentName ? AgentSelectionMode.Manual : AgentSelectionMode.Auto,
      },
      completed: false
    };
  }

  function buildWelcomeMessage(): Message {
    return {
      role:            Role.System,
      templateContent: {
        component: MessageTemplateComponent.Welcome,
        content:   {
          principal,
          message: t('ai.message.system.welcome.info.message', {}, true),
        }
      },
      source:    MessageInternalSource.Welcome,
      completed: false,
    };
  }

  function buildNoPermissionMessage(): Message {
    return {
      role:            Role.System,
      templateContent: {
        component: MessageTemplateComponent.NoPermission,
        content:   {
          principal,
          message: 'empty',
        }
      },
      completed: false,
    };
  }

  function buildSystemRequestMessage(args: { content: any; component?: MessageTemplateComponent; actions: MessageAction[] }): Message {
    const {
      component = MessageTemplateComponent.SystemRequest,
      content,
      actions
    } = args;

    return {
      role:            Role.System,
      completed:       true,
      templateContent: {
        component,
        content
      },
      actions
    };
  }

  async function ensureSwitchAgentSuggestion(agentName = '') {
    if (
      agentName &&
      !store.getters['rancher-ai-ui/chat/session']?.[DISMISS_RECOMMENDED_AGENT_KEY] &&
      currentMsg.value.agentMetadata?.selectionMode === AgentSelectionMode.Auto &&
      Number(currentMsg.value.id) > MAX_MESSAGES_BEFORE_RECOMMENDATION
    ) {
      const agent = agents.value.find((a) => a.name === agentName);

      const content = { message: t('ai.message.system.switchAgent.info', { agent: agent?.displayName || agentName }, true) };
      const actions = [
        {
          label:  t('ai.message.system.switchAgent.actions.confirm'),
          type:   ActionType.Button,
          action: () => {
            selectAgent(agentName);

            return {
              label:  t('ai.message.system.switchAgent.results.confirm', { agent: agent?.displayName || agentName }, true),
              status: ConfirmationStatus.Confirmed,
              icon:   'icon-checkmark'
            };
          },
        },
        {
          label:  t('ai.message.system.switchAgent.actions.dismiss'),
          type:   ActionType.Button,
          action: () => {
            // Dismiss future recommendations for this session (for all chats)
            store.commit('rancher-ai-ui/chat/setSession', { [DISMISS_RECOMMENDED_AGENT_KEY]: true });

            return {
              label:   t('ai.message.system.switchAgent.results.dismiss', {}, true),
              status:  ConfirmationStatus.Canceled,
              icon:    'icon-close'
            };
          },
        }
      ];

      const message = buildSystemRequestMessage({
        content,
        actions
      });

      await addMessage(message);
    }
  }

  function onopen(event: { target: WebSocket }) {
    const ws = event.target;

    if (!ws) {
      return;
    }

    // A message is in the message box, send it immediately when WS connection is established
    if (messageBox.value) {
      sendMessage(messageBox.value, ws);
    }
  }

  async function onmessage(event: MessageEvent) {
    const data = event.data;

    if (!isChatInitialized.value) {
      try {
        processChatErrors(data);
        processChatMetadata(data);

        await ensureWelcomeMessage();
      } catch (err) {
        setErrors({
          message: (err as Error)?.message || t('ai.error.chat.generic'),
          action:  {
            label:    t('ai.settings.goToSettings'),
            type:     ActionType.Button,
            resource: {
              cluster:        'local',
              detailLocation: { name: `c-cluster-settings-${ PRODUCT_NAME }` }
            }
          },
        });
      }
    } else {
      try {
        await processMessageData(data);
      } catch (err) {
        processMessageErrorData(err as Error);
      }
    }
  }

  function onclose() {
    if (currentMsg.value) {
      currentMsg.value.completed = true;
    }

    clearMessageBox();

    setProcessingState({ phase: MessagePhase.Idle });
  }

  function processChatErrors(data: string) {
    if (data.startsWith(Tag.ChatErrorStart) && data.endsWith(Tag.ChatErrorEnd)) {
      const errorMessage = formatChatErrorMessage(data);

      throw errorMessage;
    }
  }

  function processChatMetadata(data: string) {
    const metadata = formatChatMetadata(data);

    if (metadata) {
      store.commit('rancher-ai-ui/chat/setMetadata', metadata);
    }
  }

  async function ensureWelcomeMessage() {
    // Conversation already started, no need to add welcome message
    if (messages.value?.length > 0) {
      return;
    }

    // Add Welcome message first
    setProcessingState({ phase: MessagePhase.Initializing });

    const msgId = await addMessage(buildWelcomeMessage());

    currentMsg.value = getMessage(msgId);

    // Complete the welcome message with suggestions from tools call
    if (!toolsSelector.value?.name) {
      currentMsg.value.completed = true;

      setProcessingState({ phase: MessagePhase.Idle });

      return;
    }

    let prompt = `Provides 3 generic suggestions.
      - The suggestions should be a 'discovery' action. It introduces a related but broader Rancher or Kubernetes topic, helping the user learn.
      Examples: 1: How do I scale a deployment? 2: Check the resource usage for the local cluster 3: Show me the logs for the failing pod`;

    if (selectedContext.value?.length) {
      prompt = `Provides suggestions based on the CONTEXT.
        - The first 2 suggestions must be directly relevant to the current CONTEXT.
        - The third suggestion should be a 'discovery' action. It introduces a related but broader Rancher or Kubernetes topic, helping the user learn.
        Examples: 1: How do I scale the deployment? 2: Check the resource usage for the cluster 3: Show me the logs for the failing pod`;
    }

    try {
      currentMsg.value.tools = await fetchUIToolsCalls({
        prompt,
        context: selectedContext.value,
        tools:   {
          name:  toolsSelector.value.name,
          tools: [ToolName.Suggestions]
        }
      });
    } catch (err) {
      warn('Failed to fetch UI tools calls for the Welcome message:', err);
    } finally {
      currentMsg.value.completed = true;

      setProcessingState({ phase: MessagePhase.Idle });
    }
  }

  async function processMessageData(data: string) {
    switch (data) {
    case Tag.MessageStart:
      setProcessingState({ phase: MessagePhase.Working });

      const msgId = await addMessage(buildMessage(agentName.value));

      currentMsg.value = getMessage(msgId);
      break;
    case Tag.ThinkingStart: {
      setProcessingState({ phase: MessagePhase.Thinking });
      currentMsg.value.thinking = true;
      break;
    }
    case Tag.ThinkingEnd: {
      setProcessingState({ phase: MessagePhase.GeneratingResponse });
      currentMsg.value.thinking = false;
      break;
    }
    case Tag.MessageEnd:
      setProcessingState({ phase: MessagePhase.Idle });
      currentMsg.value.messageContent = currentMsg.value.messageContent?.replace(/[\r\n]+$/, '');
      currentMsg.value.thinking = false;
      currentMsg.value.completed = true;

      await ensureSwitchAgentSuggestion(currentMsg.value.agentMetadata?.recommended);

      break;
    default:
      setProcessingState({ phase: MessagePhase.GeneratingResponse });

      if (data.startsWith(Tag.ProcessingSubagentInitStart) && data.endsWith(Tag.ProcessingSubagentInitEnd)) {
        const metadata = formatSubAgentProcessingMetadata(data, agents.value);

        if (metadata) {
          setProcessingState({
            phase: MessagePhase.ProcessingSubagent,
            label: metadata.query ? `${ metadata.agent?.displayName || metadata.agent || '' }: ${ metadata.query.slice(0, 100) }` : ''
          });
        }
        break;
      }

      if (data.startsWith(Tag.ProcessingSubagentCompleteStart) && data.endsWith(Tag.ProcessingSubagentCompleteEnd)) {
        break;
      }

      if (data.startsWith(Tag.AgentMetadataStart) && data.endsWith(Tag.AgentMetadataEnd)) {
        const metadata = formatAgentMetadata(data);

        if (metadata && currentMsg.value.agentMetadata) {
          currentMsg.value.agentMetadata.recommended = metadata.recommended;
        }
        break;
      }

      if (currentMsg.value.completed === false && currentMsg.value.thinking === true) {
        if (!currentMsg.value.thinkingContent && data.trim() === '') {
          break;
        }
        currentMsg.value.thinkingContent += data;
        break;
      }

      if (currentMsg.value.completed === false && currentMsg.value.thinking === false) {
        if (!currentMsg.value.messageContent && data.trim() === '') {
          break;
        }

        if (data.startsWith(Tag.McpResultStart) && data.endsWith(Tag.McpResultEnd)) {
          setProcessingState({ phase: MessagePhase.Finalizing });

          const relatedResourcesActions = formatMessageRelatedResourcesActions(data);

          if (!currentMsg.value.relatedResourcesActions) {
            currentMsg.value.relatedResourcesActions = [];
          }
          currentMsg.value.relatedResourcesActions.push(...relatedResourcesActions);
          break;
        }

        if (data.startsWith(Tag.ConfirmationStart) && data.endsWith(Tag.ConfirmationEnd)) {
          const confirmationActions = formatConfirmationActions(data);

          if (confirmationActions) {
            currentMsg.value.confirmation = {
              actions: confirmationActions,
              status:  ConfirmationStatus.Pending,
            };
            currentMsg.value.thinking = false;
            currentMsg.value.completed = true;

            break;
          }
        }

        if (data.startsWith(Tag.DocLinkStart) && data.endsWith(Tag.DocLinkEnd)) {
          currentMsg.value.sourceLinks = formatSourceLinks(currentMsg.value.sourceLinks || [], data);

          break;
        }

        if (data.startsWith(Tag.ErrorStart) && data.endsWith(Tag.ErrorEnd)) {
          const errorMessage = formatErrorMessage(data);

          throw errorMessage;
        }

        if (data === Tag.ProcessingTools) {
          setProcessingState({ phase: MessagePhase.ProcessingTools });

          break;
        }

        currentMsg.value.messageContent += data;

        if (currentMsg.value.messageContent?.includes(Tag.ToolsStart) && currentMsg.value.messageContent?.includes(Tag.ToolsEnd)) {
          const { tools, remaining } = formatTools(currentMsg.value.tools || [], currentMsg.value.messageContent);

          currentMsg.value.tools = tools;
          currentMsg.value.messageContent = remaining;

          break;
        }

        break;
      }
      break;
    }
  }

  function processMessageErrorData(error: Error) {
    setProcessingState({ phase: MessagePhase.Idle });

    addMessage({
      role:           Role.System,
      messageContent: `${ t('ai.error.message.processing') } ${ error.message || '' }`,
      timestamp:      new Date(),
      completed:      true,
      source:         MessageInternalSource.Error,
    });
  }

  function downloadMessages() {
    downloadFile(
      `Rancher-liz-chat-${ chatId }_${ new Date().toISOString().slice(0, 10) }.txt`,
      formatFileMessages(principal, messages.value)
    );
  }

  function loadMessages(messages: Message[]) {
    store.commit('rancher-ai-ui/chat/loadMessages', {
      chatId,
      messages
    });
  }

  function resetMessages() {
    store.commit('rancher-ai-ui/chat/resetMessages', chatId);
  }

  function resetChatMetadata(args: { chatId: string | null } = { chatId: null }) {
    store.commit('rancher-ai-ui/chat/setMetadata', {
      chatId:      args.chatId,
      agents:      null,
      storageType: null
    });
  }

  function setErrors(error: ChatError | null = null) {
    store.commit('rancher-ai-ui/chat/setError', {
      chatId,
      error,
    });
  }

  function clearMessageBox() {
    store.commit('rancher-ai-ui/chat/clearMessageBox', chatId);
  }

  onMounted(() => {
    store.dispatch('rancher-ai-ui/chat/init', {
      chatId,
      messages: hasPermissions.value ? [] : [buildNoPermissionMessage()]
    });
  });

  return {
    onopen,
    onmessage,
    onclose,
    messages,
    messageBox,
    sendMessage,
    addMessage,
    updateMessage,
    confirmMessage,
    selectContext,
    downloadMessages,
    loadMessages,
    resetMessages,
    clearMessageBox,
    chatMetadata,
    isChatInitialized,
    resetChatMetadata,
    processingState,
    error,
    resetErrors: () => setErrors(null),
  };
}