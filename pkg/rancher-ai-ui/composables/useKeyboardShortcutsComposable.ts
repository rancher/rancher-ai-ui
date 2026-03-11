import { ref } from 'vue';
import { alternateKey } from '@shell/utils/platform';

interface KeyboardShortcutsOptions {
  disabled: () => boolean;
  onNewChat: () => void;
  onCopyLastMessage: () => void;
  onToggleHistory: () => void;
  onDeleteChat: () => void;
}

interface ShortcutsComponent {
  open(): void;
}

export function useKeyboardShortcutsComposable(options: KeyboardShortcutsOptions) {
  const {
    disabled,
    onNewChat,
    onCopyLastMessage,
    onToggleHistory,
    onDeleteChat,
  } = options;

  const keyboardShortcutsRef = ref<ShortcutsComponent | null>(null);

  function openShortcuts() {
    keyboardShortcutsRef.value?.open();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e[alternateKey] && e.shiftKey && e.key === 'o') {
      e.preventDefault();
      if (!disabled()) {
        onNewChat();
      }

      return;
    }

    if (e[alternateKey] && e.shiftKey && e.key === 'c') {
      e.preventDefault();
      onCopyLastMessage();

      return;
    }

    if (e[alternateKey] && e.shiftKey && e.key === 's') {
      e.preventDefault();
      onToggleHistory();

      return;
    }

    if (e[alternateKey] && e.shiftKey && e.key === 'Backspace') {
      e.preventDefault();
      onDeleteChat();

      return;
    }
  }

  return {
    handleKeydown,
    openShortcuts,
    keyboardShortcutsRef,
  };
}
