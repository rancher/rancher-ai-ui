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
  MessageInternalSource,
  MessageLabelKey,
  MessagePhase,
  MessageTag,
  MessageTemplateComponent,
  Role,
  Tag
} from '../types';
import {
  formatWSInputMessage, formatMessageRelatedResourcesActions, formatConfirmationActions, formatSuggestionActions, formatFileMessages,
  formatErrorMessage, formatSourceLinks,
  formatChatMetadata,
  formatAgentMetadata,
  formatChatErrorMessage
} from '../utils/format';
import { downloadFile } from '@shell/utils/download';
import { useContextComposable } from './useContextComposable';

const EXPAND_THINKING = false;
const DISMISS_RECOMMENDED_AGENT_KEY = 'dismissed-agent-recommendation';

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

  const principal = store.getters['rancher/byId'](NORMAN.PRINCIPAL, store.getters['auth/principalId']) || {};

  const messageBox = computed(() => store.getters['rancher-ai-ui/chat/messageBox'](chatId));
  const messages = computed(() => Object.values(store.getters['rancher-ai-ui/chat/messages'](chatId)) as Message[]);
  const currentMsg = ref<Message>({} as Message);
  const error = computed(() => store.getters['rancher-ai-ui/chat/error'](chatId));

  const chatMetadata = computed<ChatMetadata>(() => store.getters['rancher-ai-ui/chat/metadata'] || {});
  const isChatInitialized = computed(() => !!chatMetadata.value.chatId);

  const phase = computed(() => store.getters['rancher-ai-ui/chat/phase'](chatId) || MessagePhase.Initializing);

  // Set phase in store
  const setPhase = (phase: MessagePhase) => {
    store.commit('rancher-ai-ui/chat/setPhase', {
      chatId,
      phase
    });
  };

  const { selectContext, selectedContext } = useContextComposable();

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

    setPhase(MessagePhase.Processing);
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
  }

  function getMessage(messageId: string) {
    return store.getters['rancher-ai-ui/chat/message']({
      chatId,
      messageId
    });
  }

  function buildMessage(): Message {
    return {
      role:                     Role.Assistant,
      thinkingContent: '',
      messageContent:  '',
      showThinking:             EXPAND_THINKING,
      thinking:                 false,
      completed:                false
    };
  }

  function buildWelcomeMessage(): Message {
    return {
      role:            Role.System,
      templateContent: {
        component: MessageTemplateComponent.Welcome,
        content:   {
          principal,
          message: t('ai.message.system.welcome.info', {}, true),
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

  function buildSystemSuggestionMessage(agent?: Agent): Message {
    return {
      role:            Role.System,
      completed:       true,
      templateContent: {
        component: MessageTemplateComponent.SystemSuggestion,
        content:   { message: t('ai.message.system.switchAgent.info', { agent: agent?.displayName || currentMsg.value.agentMetadata?.recommended }, true) }
      },
      actions: [
        {
          label:  t('ai.message.system.switchAgent.actions.confirm'),
          type:   ActionType.Button,
          action: () => {
            selectAgent(currentMsg.value.agentMetadata?.recommended || '');

            return {
              label:  t('ai.message.system.switchAgent.results.confirm', { agent: agent?.displayName || currentMsg.value.agentMetadata?.recommended }, true),
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
      ],
    };
  }

  function onopen(event: { target: WebSocket }) {
    const ws = event.target;

    if (!ws) {
      return;
    }

    // A message is in the message box, the welcome message is not required.
    if (messageBox.value) {
      sendMessage(messageBox.value, ws);

      return;
    }

    // Conversation is already started, the welcome message is not required.
    if (messages.value.length > 0) {
      return;
    }

    // The chat is empty, send a welcome message with suggestions to start the conversation.
    const initPrompt = `Hi!
      - Send me a message with 3 ${ selectedContext.value?.length ? 'suggestions based on the context.' : 'generic suggestions.' }.
      - DO NOT ask for any confirmation or additional information.
    `;

    wsSend(ws, formatWSInputMessage({
      prompt:  initPrompt,
      context: selectedContext.value,
      tags:    [MessageTag.Ephemeral, MessageTag.Welcome]
    }));

    setPhase(MessagePhase.Processing);
  }

  async function onmessage(event: MessageEvent) {
    const data = event.data;

    if (!isChatInitialized.value) {
      try {
        processChatErrors(data);
        processChatMetadata(data);
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
        /**
         * No messages in the chat, next message should be welcome message.
         */
        const isEmptyChat = messages.value.length === 0;

        /**
         * Welcome message is in progress, continue processing it.
         */
        const welcomeMessageInProgress = messages.value.find((msg) => msg.source === MessageInternalSource.Welcome && !msg.completed);

        if (isEmptyChat || welcomeMessageInProgress) {
          setPhase(MessagePhase.Initializing);
          await processWelcomeData(data);
        } else {
          await processMessageData(data);
        }
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

    setPhase(MessagePhase.Idle);
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

  async function processWelcomeData(data: string) {
    switch (data) {
    case Tag.MessageStart:
      const msgId = await addMessage(buildWelcomeMessage());

      currentMsg.value = getMessage(msgId);
      break;
    case Tag.MessageEnd:
      setPhase(MessagePhase.Idle);
      currentMsg.value.messageContent = '';
      currentMsg.value.completed = true;

      break;
    default:
      if (currentMsg.value.completed === false) {
        if (data.startsWith(Tag.ErrorStart) && data.endsWith(Tag.ErrorEnd)) {
          const errorMessage = formatErrorMessage(data);

          throw errorMessage;
        }

        currentMsg.value.messageContent += data;

        if (currentMsg.value.messageContent?.includes(Tag.SuggestionsStart) && currentMsg.value.messageContent?.includes(Tag.SuggestionsEnd)) {
          const { suggestionActions, remaining } = formatSuggestionActions(currentMsg.value.suggestionActions || [], currentMsg.value.messageContent);

          currentMsg.value.suggestionActions = suggestionActions;
          currentMsg.value.messageContent = remaining;
          break;
        }
      }
      break;
    }
  }

  async function processMessageData(data: string) {
    switch (data) {
    case Tag.MessageStart:
      setPhase(MessagePhase.Working);

      const msgId = await addMessage(buildMessage());

      currentMsg.value = getMessage(msgId);
      break;
    case Tag.ThinkingStart: {
      setPhase(MessagePhase.Thinking);
      currentMsg.value.thinking = true;
      break;
    }
    case Tag.ThinkingEnd: {
      setPhase(MessagePhase.GeneratingResponse);
      currentMsg.value.thinking = false;
      break;
    }
    case Tag.MessageEnd:
      setPhase(MessagePhase.Idle);
      currentMsg.value.messageContent = currentMsg.value.messageContent?.replace(/[\r\n]+$/, '');
      currentMsg.value.thinking = false;
      currentMsg.value.completed = true;

      if (
        !store.getters['rancher-ai-ui/chat/session']?.[DISMISS_RECOMMENDED_AGENT_KEY] &&
        currentMsg.value.agentMetadata?.recommended &&
        currentMsg.value.agentMetadata?.selectionMode === AgentSelectionMode.Auto &&
        Number(currentMsg.value.id) > 10
      ) {
        const agent = agents.value.find((a) => a.name === currentMsg.value.agentMetadata?.recommended);

        await addMessage(buildSystemSuggestionMessage(agent));
      }

      break;
    default:
      setPhase(MessagePhase.GeneratingResponse);

      if (data.startsWith(Tag.AgentMetadataStart) && data.endsWith(Tag.AgentMetadataEnd)) {
        const metadata = formatAgentMetadata(data, agents.value);

        if (metadata) {
          currentMsg.value.agentMetadata = metadata;
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
          setPhase(MessagePhase.Finalizing);
          currentMsg.value.relatedResourcesActions = formatMessageRelatedResourcesActions(data);
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

        currentMsg.value.messageContent += data;

        if (currentMsg.value.messageContent?.includes(Tag.SuggestionsStart) && currentMsg.value.messageContent?.includes(Tag.SuggestionsEnd)) {
          const { suggestionActions, remaining } = formatSuggestionActions(currentMsg.value.suggestionActions || [], currentMsg.value.messageContent);

          currentMsg.value.suggestionActions = suggestionActions;
          currentMsg.value.messageContent = remaining;
          break;
        }

        break;
      }
      break;
    }
  }

  function processMessageErrorData(error: Error) {
    setPhase(MessagePhase.Idle);

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
    phase,
    error,
    resetErrors: () => setErrors(null),
  };
}