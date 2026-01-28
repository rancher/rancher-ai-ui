import { AGENT_NAME, AGENT_NAMESPACE, AGENT_REST_API_PATH } from '../product';
import { HistoryChat, HistoryChatMessage, Message } from '../types';
import { buildMessageFromHistoryMessage } from '../utils/format';

export function useChatHistoryComposable() {
  const apiPath = `/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ AGENT_NAME }:80/proxy/${ AGENT_REST_API_PATH }`;

  async function fetchChats(): Promise<HistoryChat[]> {
    try {
      const data = await fetch(`${ apiPath }/chats`);

      const all = await data.json() as HistoryChat[];

      return all.filter((chat) => !!chat.name);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch chats:', error);

      return [];
    }
  }

  async function fetchMessages(chatId: string): Promise<Message[]> {
    try {
      const data = await fetch(`${ apiPath }/chats/${ chatId }/messages`);

      const messages = await data.json() as HistoryChatMessage[];

      return messages.map(buildMessageFromHistoryMessage);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch messages:', error);

      return [];
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

  return {
    fetchChats,
    fetchMessages,
    deleteChat,
  };
}
