import { ComputedRef } from 'vue';
import { AGENT_NAME, AGENT_NAMESPACE, AGENT_REST_API_PATH } from '../product';
import {
  Agent, AgentSettings, HistoryChat, HistoryChatMessage, Message
} from '../types';
import { buildMessageFromHistoryMessage } from '../utils/format';

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

  async function fetchSettings(): Promise<AgentSettings | null> {
    try {
      const data = await fetch(`${ apiPath }/settings`);

      return await data.json();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch settings:', error);

      return null;
    }
  }

  async function fetchChats(): Promise<HistoryChat[]> {
    try {
      const data = await fetch(`${ apiPath }/chats`);

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

      return await data.json() as HistoryChat;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update chat:', error);

      throw error;
    }
  }

  async function deleteChat(chatId: string): Promise<void> {
    try {
      await fetch(`${ apiPath }/chats/${ chatId }`, { method: 'DELETE' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete chat:', error);
    }
  }

  async function fetchMessages(chatId: string): Promise<Message[]> {
    try {
      const data = await fetch(`${ apiPath }/chats/${ chatId }/messages`);

      const messages = await data.json() as HistoryChatMessage[];

      return messages.map((msg) => buildMessageFromHistoryMessage(msg, agents?.value || []));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch messages:', error);

      return [];
    }
  }

  return {
    fetchSettings,
    fetchChats,
    fetchMessages,
    updateChat,
    deleteChat,
  };
}
