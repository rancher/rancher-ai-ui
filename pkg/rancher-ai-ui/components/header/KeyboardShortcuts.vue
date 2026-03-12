<script lang="ts" setup>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { isMac } from '@shell/utils/platform';
import TextLabelPopover from '../popover/TextLabel.vue';

interface Shortcut {
  action: string;
  mac: string | string[];
  windows: string | string[];
  macSymbolIndexes?: number[];
  windowsSymbolIndexes?: number[];
}

const store = useStore();
const { t } = useI18n(store);

const popover = ref<InstanceType<typeof TextLabelPopover> | null>(null);

const shortcuts: Shortcut[] = [
  {
    action:               t('ai.shortcuts.items.navigateHistory'),
    mac:                  ['↑ ↓'],
    windows:              ['↑ ↓'],
    macSymbolIndexes:     [0],
    windowsSymbolIndexes: [0],
  },
  {
    action:           t('ai.shortcuts.items.openChat'),
    mac:              ['⌘', ' Shift K'],
    windows:          'Alt K',
    macSymbolIndexes: [0],
  },
  {
    action:           t('ai.shortcuts.items.newChat'),
    mac:              ['⌘', ' Shift O'],
    windows:          'Ctrl Shift O',
    macSymbolIndexes: [0],
  },
  {
    action:           t('ai.shortcuts.items.copyLastMessage'),
    mac:              ['⌘', ' Shift C'],
    windows:          'Ctrl Shift C',
    macSymbolIndexes: [0],
  },
  {
    action:           t('ai.shortcuts.items.toggleHistory'),
    mac:              ['⌘', ' Shift S'],
    windows:          'Ctrl Shift S',
    macSymbolIndexes: [0, 2],
  },
  {
    action:               t('ai.shortcuts.items.deleteChat'),
    mac:                  ['⌘', ' Shift ', '⌫'],
    windows:              ['Ctrl Shift ', '⌫'],
    macSymbolIndexes:     [0, 2],
    windowsSymbolIndexes: [1],
  },
];

function open() {
  popover.value?.open();
}

defineExpose({ open });
</script>

<template>
  <TextLabelPopover ref="popover">
    <div class="shortcuts">
      <div class="shortcuts-section">
        <span class="shortcuts-title">{{ t('ai.shortcuts.title') }}</span>
        <div
          v-for="(shortcut, i) in shortcuts"
          :key="i"
          class="shortcuts-row"
        >
          <span class="shortcuts-action">{{ shortcut.action }}</span>
          <kbd class="shortcuts-key">
            <template v-if="isMac && Array.isArray(shortcut.mac)">
              <span
                v-for="(part, j) in shortcut.mac"
                :key="j"
                :class="{ 'sys-symbol': (shortcut.macSymbolIndexes && shortcut.macSymbolIndexes.includes(j)) }"
              >{{ part }}</span>
            </template>
            <template v-else-if="!isMac && Array.isArray(shortcut.windows)">
              <span
                v-for="(part, j) in shortcut.windows"
                :key="j"
                :class="{ 'sys-symbol': (shortcut.windowsSymbolIndexes && shortcut.windowsSymbolIndexes.includes(j)) }"
              >{{ part }}</span>
            </template>
            <template v-else>{{ isMac ? shortcut.mac : shortcut.windows }}</template>
          </kbd>
        </div>
      </div>
    </div>
  </TextLabelPopover>
</template>

<style scoped lang="scss">
.shortcuts {
  display: flex;
  flex-direction: column;
}

.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcuts-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.shortcuts-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.shortcuts-action {
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
}

.sys-symbol {
  font-family: -apple-system, sans-serif;
}

.shortcuts-key {
  font-size: 12px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  white-space: nowrap;
  color: var(--input-text);
}

:deep(.v-popper__popper) {
  width: 100%;
  // 4px is there to make it touch the bottom of the chat panel
  // 2.5% is because the width is 95%, so 2.5% padding right and left, and 2.5% added to the bottom
  top: 4px;
  margin-top: -2.5%
}
</style>
