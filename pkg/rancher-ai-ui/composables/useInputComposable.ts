import { useStore } from 'vuex';
import { computed, ref, type Ref } from 'vue';

/**
 * Shared console ref for managing focus across the app
 */
const consoleRef: Ref<any> = ref(null);

/**
 * Composable for managing the AI input text state and the input status in the console.
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

  function setConsoleRef(ref: any) {
    consoleRef.value = ref;
  }

  function focusConsoleInput() {
    consoleRef.value?.focusInput();
  }

  return {
    inputText,
    updateInput,
    cleanInput,
    cleanInputAndTags,
    setConsoleRef,
    focusConsoleInput,
  };
}
