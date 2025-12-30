import { AGENT_NAMESPACE, CHAT_HISTORY_SERVICE_NAME } from '../product';
import { HistoryChat, HistoryChatMessage, Message } from '../types';
import { buildMessageFromHistoryMessage } from '../utils/format';

export function useChatHistoryComposable() {
  const servicePath = `/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ CHAT_HISTORY_SERVICE_NAME }:80/proxy`;

  async function fetchChats(): Promise<HistoryChat[]> {
    const data = await fetch(`${ servicePath }/chats?exclude-tag=welcome`);

    const all = await data.json() as HistoryChat[];

    return all
      .filter((chat) => !!chat.name)
      .map((chat) => ({
        ...chat,
        chatId: undefined,
        id:     chat.chatId || '',
      }));
  }

  async function fetchMessages(chatId: string): Promise<Message[]> {
    const data = await fetch(`${ servicePath }/chats/${ chatId }/messages?exclude-tag=welcome`);

    const messages = await data.json() as HistoryChatMessage[];

    return messages
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
      .map(buildMessageFromHistoryMessage);
  }

  async function deleteChat(chatId: string): Promise<void> {
    await fetch(`${ servicePath }/chats/${ chatId }`, { method: 'DELETE' });
  }

  return {
    fetchChats,
    fetchMessages,
    deleteChat,
  };
}
