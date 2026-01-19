import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import debounce from 'lodash/debounce';
import { NORMAN } from '@shell/config/types';
import { useContextComposable } from './useContextComposable';
import {
  ChatError, ConfirmationResponse, ConfirmationStatus, Message, MessagePhase, MessageTag, MessageTemplateComponent, Role, Tag
} from '../types';
import {
  formatWSInputMessage, formatMessageRelatedResourcesActions, formatConfirmationAction, formatSuggestionActions, formatFileMessages,
  formatErrorMessage, formatSourceLinks,
  formatChatMetadata
} from '../utils/format';
import { downloadFile } from '@shell/utils/download';

const CHAT_ID = 'default';
const EXPAND_THINKING = false;

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
export function useChatMessageComposable() {
  const store = useStore();
  const t = store.getters['i18n/t'];

  const principal = store.getters['rancher/byId'](NORMAN.PRINCIPAL, store.getters['auth/principalId']) || {};

  const messages = computed(() => Object.values(store.getters['rancher-ai-ui/chat/messages'](CHAT_ID)) as Message[]);
  const currentMsg = ref<Message>({} as Message);
  const error = computed(() => store.getters['rancher-ai-ui/chat/error'](CHAT_ID));

  // Get phase from store with debounce to avoid rapid changes
  const _phase = computed(() => store.getters['rancher-ai-ui/chat/phase'](CHAT_ID));
  const phase = ref(_phase.value || MessagePhase.Initializing);
  const applyPhase = debounce((v: MessagePhase) => {
    phase.value = v;
  }, 150);

  watch(_phase, (v) => applyPhase(v), { immediate: true });

  // Set phase in store
  const setPhase = (phase: MessagePhase) => {
    store.commit('rancher-ai-ui/chat/setPhase', {
      chatId: CHAT_ID,
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

    // msg is type of Message
    if (msg && typeof msg === 'object' && msg.messageContent) {
      role = msg.role;
      summaryContent = msg.summaryContent || '';
      messageContent = msg.messageContent || '';
      contextContent = msg.contextContent || [];
    } else { /* msg is type of string */ }

    wsSend(ws, formatWSInputMessage(messageContent, selectedContext.value));

    addMessage({
      role,
      summaryContent,
      messageContent,
      contextContent
    });

    setPhase(MessagePhase.Processing);
  }

  async function addMessage(message: Message) {
    return await store.dispatch('rancher-ai-ui/chat/addMessage', {
      chatId: CHAT_ID,
      message
    });
  }

  function updateMessage(message: Message) {
    store.commit('rancher-ai-ui/chat/updateMessage', {
      chatId: CHAT_ID,
      message
    });
  }

  function confirmMessage({ message, result }: { message: Message; result: boolean }, ws: WebSocket) {
    wsSend(ws, formatWSInputMessage(result ? ConfirmationResponse.Yes : ConfirmationResponse.No, [], [MessageTag.Confirmation]));

    updateMessage({
      ...message,
      confirmation: {
        action: message.confirmation?.action || null,
        status: result ? ConfirmationStatus.Confirmed : ConfirmationStatus.Canceled
      },
    });
  }

  function getMessage(messageId: string) {
    return store.getters['rancher-ai-ui/chat/message']({
      chatId: CHAT_ID,
      messageId
    });
  }

  function onopen(event: { target: WebSocket }) {
    // Phase is set to processing here because message could be sent outisde of wsSend function (hooks handlers)
    setPhase(MessagePhase.Processing);

    // Conversation is already started
    if (messages.value.length > 0) {
      return;
    }

    const ws = event.target;

    if (ws) {
      const initPrompt = `Hi!
        - Send me a message with 3 ${ selectedContext.value?.length ? 'suggestions based on the context.' : 'generic suggestions.' }.
        - DO NOT ask for any confirmation or additional information.
      `;

      wsSend(ws, formatWSInputMessage(initPrompt, selectedContext.value, [MessageTag.Ephemeral, MessageTag.Welcome]));
      setPhase(MessagePhase.Processing);
    }
  }

  async function onmessage(event: MessageEvent) {
    const data = event.data;

    try {
      if (!messages.value.find((msg) => msg.completed)) {
        setPhase(MessagePhase.Initializing);
        await processChatMetadata(data);
        await processWelcomeData(data);
      } else {
        await processMessageData(data);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error processing messages:', err);
      store.commit('rancher-ai-ui/chat/setError', {
        chatId: CHAT_ID,
        error:  { message: `${ t('ai.error.message.processing') } ${ (err as ChatError).message || err || '' }` }
      });

      setPhase(MessagePhase.Idle);
    }
  }

  async function processChatMetadata(data: string) {
    const metadata = formatChatMetadata(data);

    if (metadata) {
      store.commit('rancher-ai-ui/chat/setMetadata', { activeChatId: metadata?.chatId });
    }
  }

  async function processWelcomeData(data: string) {
    switch (data) {
    case Tag.MessageStart:
      const msgId = await addMessage({
        role:            Role.System,
        templateContent: {
          component: MessageTemplateComponent.Welcome,
          content:   {
            principal,
            message: t('ai.message.system.welcome.info'),
          }
        },
        completed: false,
      });

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

      const msgId = await addMessage({
        role:                     Role.Assistant,
        thinkingContent: '',
        messageContent:  '',
        showThinking:             EXPAND_THINKING,
        thinking:                 false,
        completed:                false
      });

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
      break;
    default:
      setPhase(MessagePhase.GeneratingResponse);
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
          const confirmationAction = formatConfirmationAction(data);

          if (confirmationAction) {
            currentMsg.value.confirmation = {
              action: confirmationAction,
              status: ConfirmationStatus.Pending,
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

  function resetChatError() {
    store.commit('rancher-ai-ui/chat/setError', {
      chatId: CHAT_ID,
      error:  null
    });
  }

  function downloadMessages() {
    downloadFile(
      `Rancher-liz-chat-${ CHAT_ID }_${ new Date().toISOString().slice(0, 10) }.txt`,
      formatFileMessages(principal, messages.value)
    );
  }

  function loadMessages(messages: Message[]) {
    store.commit('rancher-ai-ui/chat/loadMessages', {
      chatId: CHAT_ID,
      messages
    });
  }

  function resetMessages() {
    store.commit('rancher-ai-ui/chat/resetMessages', CHAT_ID);
  }

  onMounted(() => {
    store.commit('rancher-ai-ui/chat/init', CHAT_ID);
  });

  return {
    onopen,
    onmessage,
    messages,
    sendMessage,
    addMessage,
    updateMessage,
    confirmMessage,
    selectContext,
    resetChatError,
    downloadMessages,
    loadMessages,
    resetMessages,
    phase,
    error
  };
}