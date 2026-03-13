import { useStore } from 'vuex';
import { computed } from 'vue';

/**
 * Composable for managing the AI input text state.
 * @returns Composable for managing the AI input text state.
 */
export function useInputComposable() {
  const store = useStore();

  const inputText = computed(() => store.getters['rancher-ai-ui/input/text']);

  function updateInput(value: string) {
    store.commit('rancher-ai-ui/input/text', value);
  }

  function cleanInput(value: string) {
    return (value || '')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n')
      .trim();
  }

  function cleanInputAndTags(value: string) {
    return cleanInput(value)
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  return {
    inputText,
    updateInput,
    cleanInput,
    cleanInputAndTags,
  };
}
