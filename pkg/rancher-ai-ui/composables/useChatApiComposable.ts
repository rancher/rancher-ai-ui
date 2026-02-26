import { ComputedRef } from 'vue';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_REST_API_PATH } from '../product';
import {
  Agent, AgentSettings, HistoryChat, HistoryChatMessage, LLMProvider, Message
} from '../types';
import { buildMessageFromHistoryMessage } from '../utils/format';
import { Settings } from '../pages/settings/types';

interface OllamaLLMOptions {
  url: string;
}

interface BedrockLLMOptions {
  region?: string;
  bearerToken?: string;
}

type LLMOptions = OllamaLLMOptions | BedrockLLMOptions;

/**
 * Composable for managing the chat API interactions.
 *
 * Endpoints:
 * - settings: fetch settings
 * - chat: fetch all chats, update a chat, delete a chat
 * - messages: fetch messages for a chat
 *
 * @param agents Reactive reference to the list of agents, used for message formatting in the chat messages endpoint.
 * @returns Composable for managing chat API interactions.
 */

export function useChatApiComposable(agents?: ComputedRef<Agent[]>) {
  const apiPath = `/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ AGENT_NAME }:80/proxy/${ AGENT_REST_API_PATH }`;
  let llmModelsAbortController: AbortController | null = null;

  async function fetchLLMModels(llm: { name: LLMProvider, options?: LLMOptions }): Promise<string[]> {
    // Abort and refresh the AbortController for fetching LLM models
    if (llmModelsAbortController) {
      llmModelsAbortController.abort();
    }
    llmModelsAbortController = new AbortController();

    const { name, options } = llm;

    const queryParams = new URLSearchParams();

    switch (name) {
    case LLMProvider.Local:
      const ollamaOptions = options as OllamaLLMOptions;

      queryParams.append('url', ollamaOptions?.url);
      break;

    case LLMProvider.Bedrock:
      const bedrockOptions = options as BedrockLLMOptions;

      if (bedrockOptions.region) {
        queryParams.append('region', bedrockOptions.region);
      }
      if (bedrockOptions.bearerToken) {
        queryParams.append('bearerToken', bedrockOptions.bearerToken);
      }
    default:
      break;
    }

    const apiUrl = `${ apiPath }/llm/${ name }/models?${ queryParams.toString() }`;

    const data = await fetch(apiUrl, { signal: llmModelsAbortController.signal });

    if (!data.ok) {
      const errorMessage = await data.text();

      const parsedError = JSON.parse(errorMessage);

      throw new Error(parsedError.detail);
    }

    return await data.json() as string[];
  }

  async function fetchSettings(): Promise<AgentSettings | null> {
    try {
      const data = await fetch(`${ apiPath }/settings`);

      if (!data.ok) {
        const errorMessage = await data.text();

        throw new Error(errorMessage);
      }

      return await data.json();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch settings:', error);

      return null;
    }
  }

  async function saveSettings(settingsPayload: Record<Settings, string>): Promise<Record<Settings, string>> {
    try {
      const data = await fetch(`${ apiPath }/settings`, {
        method:  'PUT',
        body:    JSON.stringify(settingsPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!data.ok) {
        const errorMessage = await data.text();

        const parsedError = JSON.parse(errorMessage);

        throw new Error(parsedError.detail);
      }

      return await data.json() as Record<Settings, string>;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save settings:', error);

      throw error;
    }
  }

  async function fetchChats(): Promise<HistoryChat[]> {
    try {
      const data = await fetch(`${ apiPath }/chats`);

      if (!data.ok) {
        const errorMessage = await data.text();

        throw new Error(errorMessage);
      }

      const all = await data.json() as HistoryChat[];

      return all
        .filter((chat) => !!chat.name)
        .map((chat) => ({
          ...chat,
          name: chat.name?.split('\n')[0].slice(0, 500).trim(),
        }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch chats:', error);

      return [];
    }
  }

  async function updateChat(chat_id: string, payload: Partial<HistoryChat>): Promise<HistoryChat> {
    try {
      const data = await fetch(`${ apiPath }/chats/${ chat_id }`, {
        method:  'PUT',
        body:    JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!data.ok) {
        const errorMessage = await data.text();

        throw new Error(errorMessage);
      }

      return await data.json() as HistoryChat;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update chat:', error);

      throw error;
    }
  }

  async function deleteChat(chatId: string): Promise<void> {
    try {
      const data = await fetch(`${ apiPath }/chats/${ chatId }`, { method: 'DELETE' });

      if (!data.ok) {
        const errorMessage = await data.text();

        throw new Error(errorMessage);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete chat:', error);
    }
  }

  async function fetchMessages(chatId: string): Promise<Message[]> {
    try {
      const data = await fetch(`${ apiPath }/chats/${ chatId }/messages`);

      if (!data.ok) {
        const errorMessage = await data.text();

        throw new Error(errorMessage);
      }

      const messages = await data.json() as HistoryChatMessage[];

      return messages.map((msg) => buildMessageFromHistoryMessage(msg, agents?.value || []));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch messages:', error);

      return [];
    }
  }

  return {
    fetchLLMModels,
    fetchSettings,
    saveSettings,
    fetchChats,
    fetchMessages,
    updateChat,
    deleteChat,
  };
}
