import { ComputedRef } from 'vue';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_REST_API_PATH } from '../product';
import { error } from '../utils/log';
import {
  Agent, AgentSettings, HistoryChat, HistoryChatMessage, LLMProvider, Message,
} from '../types';
import { Settings } from '../pages/settings/types';
import { buildMessageFromHistoryMessage } from '../utils/format';

interface LLMOptions {
  url?: string;
  region?: string;
  bearerToken?: string;
};

interface LLMConfig {
  name: LLMProvider;
  options: LLMOptions;
}

/**
 * Composable for managing the AI agent API interactions.
 *
 * Endpoints:
 *
 * - llm: fetch available models for the active LLM, with query parameters based on the active LLM.
 * - settings: fetch settings
 * - chat: fetch all chats, update a chat, delete a chat
 * - messages: fetch messages for a chat
 *
 * @param agents Reactive reference to the list of agents, used for message formatting in the chat messages endpoint.
 * @returns Composable for managing chat API interactions.
 */

export function useAIAgentApiComposable(agents?: ComputedRef<Agent[]>) {
  const apiPath = `/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ AGENT_NAME }:80/proxy/${ AGENT_REST_API_PATH }`;
  let llmModelsAbortController: AbortController | null = null;

  async function fetchLLMModels(llmConfig: LLMConfig): Promise<string[]> {
    // Abort and refresh the AbortController for fetching LLM models
    if (llmModelsAbortController) {
      llmModelsAbortController.abort();
    }
    llmModelsAbortController = new AbortController();

    const queryParams = new URLSearchParams();

    const { name: llm, options } = llmConfig;

    switch (llm) {
    case LLMProvider.Local:
      if (options.url) {
        queryParams.append('url', options.url);
      }
      break;

    case LLMProvider.Bedrock:
      if (options.region) {
        queryParams.append('region', options.region);
      }
      if (options.bearerToken) {
        queryParams.append('bearerToken', options.bearerToken);
      }
    default:
      break;
    }

    const apiUrl = `${ apiPath }/llm/${ llm }/models?${ queryParams.toString() }`;

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
    } catch (err) {
      error('Failed to fetch settings:', err);

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
    } catch (err) {
      error('Failed to save settings:', err);

      throw err;
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
    } catch (err) {
      error('Failed to fetch chats:', err);

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
    } catch (err) {
      error('Failed to update chat:', err);

      throw err;
    }
  }

  async function deleteChat(chatId: string): Promise<void> {
    try {
      const data = await fetch(`${ apiPath }/chats/${ chatId }`, { method: 'DELETE' });

      if (!data.ok) {
        const errorMessage = await data.text();

        throw new Error(errorMessage);
      }
    } catch (err) {
      error('Failed to delete chat:', err);
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
    } catch (err) {
      error('Failed to fetch messages:', err);

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
