import MarkdownIt from 'markdown-it';
import {
  ActionType, MessageConfirmationAction, Tag, Context,
  Message,
  Role,
  MessageAction,
  HistoryChatMessage
} from '../types';
import { validateActionResource } from './validator';

const md = new MarkdownIt({
  html:        true,
  breaks:      true,
  linkify:     true,
  typographer: true,
});

export function formatMessageContent(message: string) {
  const raw = md.render(message ?? '');

  // remove trailing <br> tags and trailing whitespace/newlines
  return raw.replace(/(?:(?:<br\s*\/?>)|\r?\n|\s)+$/gi, '');
}

export function formatWSInputMessage(prompt: string, selectedContext: Context[], messageTags: string[] = []): string {
  const context = selectedContext.reduce((acc, ctx) => ({
    ...acc,
    [ctx.tag]: ctx.value
  }), {});

  const tags = messageTags.length ? messageTags : undefined;

  return JSON.stringify({
    prompt,
    context,
    tags,
  });
}

export function formatMessageRelatedResourcesActions(value: string, actionType = ActionType.Button): MessageAction[] {
  value = value.replaceAll(Tag.McpResultStart, '').replaceAll(Tag.McpResultEnd, '').replace(/'([^']*)'/g, '"');

  if (value) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => formatMessageRelatedResourcesActions(JSON.stringify(item), actionType));
      }

      if (!validateActionResource(parsed)) {
        return [];
      }

      const names = Array.isArray(parsed.name) ? parsed.name : [parsed.name];

      return names.map((name: string) => ({
        type:     actionType,
        label:    `View ${ parsed.kind }: ${ name }`,
        resource: {
          kind:      parsed.kind,
          type:      parsed.type,
          name,
          namespace: parsed.namespace,
          cluster:   parsed.cluster,
        },
      }));
    } catch (e) {
      console.error('Failed to parse MCP response:', e); /* eslint-disable-line no-console */
    }
  }

  return [];
}

export function formatConfirmationAction(value: string): MessageConfirmationAction | null {
  value = value.replaceAll(Tag.ConfirmationStart, '').replaceAll(Tag.ConfirmationEnd, '').replace(/'([^']*)'/g, '"');

  if (value) {
    try {
      const parsed = JSON.parse(value);

      return parsed;
    } catch (e) {
      console.error('Failed to parse confirmation response:', e); /* eslint-disable-line no-console */
    }
  }

  return null;
}

export function formatSuggestionActions(suggestionActions: string[], remaining: string): { suggestionActions: string[]; remaining: string } {
  const re = /<suggestion\b[^>]*>([\s\S]*?)<\/suggestion>/i;
  const match = remaining?.match(re);

  if (match) {
    const inner = match[1]; // first suggestion text

    suggestionActions.push(inner.trim());
    remaining = remaining.replace(match[0], '').trim();

    if (remaining) {
      return formatSuggestionActions(suggestionActions, remaining);
    }
  }

  return {
    suggestionActions,
    remaining
  };
}

export function formatFileMessages(principal: any, messages: Message[]): string {
  const avatar = {
    [Role.User]:      `👤 ${ principal?.name || 'user' }`,
    [Role.Assistant]: '🤖 Liz',
    [Role.System]:    '🛠️ Liz',
  };

  return (messages || []).map((msg) => {
    const timestamp = msg.timestamp?.toLocaleTimeString([], {
      hour:   '2-digit',
      minute: '2-digit'
    });

    let body = msg.summaryContent ? `Summary: ${ msg.summaryContent }\n` : '';

    body += msg.templateContent?.content?.message ? `${ msg.templateContent.content.message }\n` : '';
    body += msg.messageContent ? `${ msg.messageContent }\n` : '';
    body += msg.thinkingContent ? `${ msg.thinkingContent }\n` : '';

    if (msg.contextContent?.length) {
      body += `Context: ${ JSON.stringify(msg.contextContent) }\n`;
    }

    if (msg.suggestionActions?.length) {
      body += `Suggestions: [${ msg.suggestionActions.join('], [') }]\n`;
    }

    return `[${ timestamp }] [${ avatar[msg.role] }]: ${ body }`;
  }).join('\n');
}

export function formatSourceLinks(links: string[], value: string): string[] {
  const cleanedLink = value.replaceAll(Tag.DocLinkStart, '').replaceAll(Tag.DocLinkEnd, '').trim();

  return [
    ...links,
    cleanedLink
  ];
}

export function formatErrorMessage(value: string): { message: string } {
  value = value.replaceAll(Tag.ErrorStart, '').replaceAll(Tag.ErrorEnd, '').replace(/'([^']*)'/g, '"');

  if (value) {
    try {
      const parsed = JSON.parse(value);

      return parsed;
    } catch (e) {
      console.error('Failed to parse error message:', e); /* eslint-disable-line no-console */
    }
  }

  return { message: 'An error occurred.' };
}

export function buildMessageFromHistoryMessage(msg: HistoryChatMessage): Message {
  const contextData = JSON.parse(msg.context || '[]');

  const contextContent: Context[] = Object.keys(contextData).map((key) => ({
    value:       contextData[key],
    tag:         key,
    description:   key,
  }));

  // This should become a function to be used also in useChatMessageComposable.ts
  let suggestionActionsData: string[] = [];

  if (msg.message?.includes(Tag.SuggestionsStart) && msg.message?.includes(Tag.SuggestionsEnd)) {
    const { suggestionActions, remaining } = formatSuggestionActions(suggestionActionsData, msg.message);

    suggestionActionsData = suggestionActions;
    msg.message = remaining;
  }

  // This should become a function to be used also in useChatMessageComposable.ts
  let relatedResourcesActions: MessageAction[] = [];

  if (msg.message?.startsWith(Tag.McpResultStart) && msg.message?.includes(Tag.McpResultEnd)) {
    const mcpPart = msg.message.substring(
      msg.message.indexOf(Tag.McpResultStart),
      msg.message.indexOf(Tag.McpResultEnd) + Tag.McpResultEnd.length
    );

    const remaining = msg.message.replace(mcpPart, '').trim();

    relatedResourcesActions = formatMessageRelatedResourcesActions(mcpPart);
    msg.message = remaining;
  }

  // TODO handle other message parts (templateContent, etc.)

  return {
    role:              msg.role as Role,
    id:                msg.requestId,
    completed:         true,
    thinking:          false,
    messageContent:    msg.message,
    contextContent,
    relatedResourcesActions,
    suggestionActions: suggestionActionsData,
    timestamp:         new Date(Number(msg.createdAt) * 1000),
  };
}
