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
    if (e[alternateKey] && e.shiftKey && e.key?.toLowerCase() === 'o') {
      e.preventDefault();
      if (!disabled()) {
        onNewChat();
      }

      return;
    }

    if (e[alternateKey] && e.shiftKey && e.key?.toLowerCase() === 'c') {
      e.preventDefault();
      onCopyLastMessage();

      return;
    }

    if (e[alternateKey] && e.shiftKey && e.key?.toLowerCase() === 's') {
      e.preventDefault();
      if (!disabled()) {
        onToggleHistory();
      }

      return;
    }

    if (e[alternateKey] && e.shiftKey && e.key === 'Backspace') {
      e.preventDefault();
      if (!disabled()) {
        onDeleteChat();
      }

      return;
    }
  }

  return {
    handleKeydown,
    openShortcuts,
    keyboardShortcutsRef,
  };
}
