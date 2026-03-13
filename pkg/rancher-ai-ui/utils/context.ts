import { Context } from '../types';
import { warn } from './log';

const MAX_CONTEXT_LABEL_LENGTH = 50;

/**
 * Check if the context label is sanitized (does not contain spaces, new lines, or tabs)
 *
 * This is a basic check to prevent potential issues with rendering or display of context labels.
 * @param label - The context label to check
 */
function sanitizeContextLabel(label: string): boolean {
  const match = /\s/.test(label);

  return !match;
}

/**
 * Validate the context object to ensure it meets the required criteria.
 * @param context - The context object to validate
 */
export function validateContext(context: Context): boolean {
  if (context.value && typeof context.value === 'string' && context.value.trim()) {
    // If contains spaces, new lines or tabs, consider it as non-sanitized
    if (!sanitizeContextLabel(context.value)) {
      warn(`Context with tag "${ context.tag }" has invalid value, skipping context entry: ${ context.value?.slice(0, 20) }...`);

      return false;
    }
  }

  if (context.valueLabel?.trim()) {
    if (!sanitizeContextLabel(context.valueLabel)) {
      warn(`Context with tag "${ context.tag }" has invalid value, skipping context entry: ${ context.valueLabel?.slice(0, 20) }...`);

      return false;
    }
  }

  return true;
}

export function isContextLabelExceed(context: Partial<Context>): boolean {
  const label = context.valueLabel || context.value;

  return typeof label === 'string' && label.length > MAX_CONTEXT_LABEL_LENGTH;
}

export function contextLabel(context: Partial<Context>): string {
  const label = context.valueLabel || context.value;

  if (isContextLabelExceed(context)) {
    return `${ (label as string).substring(0, MAX_CONTEXT_LABEL_LENGTH) }...`;
  }

  return label as string;
}

export function contextTooltip(context: Partial<Context>): string {
  if (isContextLabelExceed(context)) {
    return `${ context.description }: ${ context.valueLabel || context.value }`;
  }

  return context.description || '';
}