/**
 * Decodes the model key for a given LLM provider.
 *
 * @param llmProvider The LLM provider name.
 * @returns The decoded model key.
 */
export function decodeModelKey(llmProvider: string) {
  return `${ llmProvider.toUpperCase().replace(/-/g, '_') }_MODEL`;
}