import { startCase } from 'lodash';
import { FormattedMessage } from '../types';

/**
 * Converts a URL to a label by extracting and formatting the last path segment
 *
 * @param url - The URL to format
 * @returns A formatted label extracted from the URL's last path segment
 *
 * @example
 *   https://example.com/my-link-name -> "My Link Name"
 *   https://example.com/api-reference/ -> "Api Reference"
 */
export function toLinkLabel(url: string): string {
  // Remove trailing slash if present
  const cleanUrl = url?.endsWith('/') ? url.slice(0, -1) : url;

  // Extract the last chunk of the URL path for label and normalize it
  const chunks = cleanUrl?.split('/') || [];
  const lastChunk = chunks[chunks.length - 1] || '';
  const label = startCase(lastChunk);

  return label || 'Link';
}

/**
 * Extracts the copyable text content from a FormattedMessage.
 * Used by both per-message copy and the global shortcut.
 */
export function extractMessageText(message: FormattedMessage): string {
  if (!message.summaryContent && !message.messageContent && !message.thinkingContent && !message.formattedMessageContent) {
    return '';
  }

  let text = '';

  if (message.showThinking && message.thinkingContent) {
    text += `${ message.thinkingContent }\n`;
  }

  if (message.summaryContent) {
    text += message.summaryContent;

    if (message.messageContent) {
      text += `\n${ message.messageContent || '' }`;
    }
  } else {
    // formattedMessageContent will contain error messages if any
    text += (message.messageContent || message.formattedMessageContent || '');
  }

  return text.trim();
}
