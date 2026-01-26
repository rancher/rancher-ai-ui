<script setup lang="ts">
import { ref, watch, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Context } from '../../types';
import ContextTag from './ContextTag.vue';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';
import RcButton from '@components/RcButton/RcButton.vue';

function _id(item: Context) {
  return `${ item.tag  }_${  item.value }`;
}

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  options: {
    type: Array as PropType<Context[]>,
    default() {
      return [];
    },
  },
  autoSelect: {
    type: Array as PropType<Context[]>,
    default() {
      return [];
    },
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const selected = ref<Context[]>([]);
const isOpen = ref(false);

const emit = defineEmits(['update']);

watch(() => props.autoSelect, (newVal) => {
  selected.value = newVal;
  emit('update', selected.value);
}, { immediate: true });

watch(() => props.options, (newVal) => {
  selected.value = selected.value.filter((s) => newVal.find((n) => _id(n) === _id(s)));
  emit('update', selected.value);
});

function toggleItem(item: Context) {
  if (selected.value.find((i) => _id(i) === _id(item))) {
    removeItem(item);
  } else {
    addItem(item);
  }
}

function addItem(item: Context) {
  if (selected.value.find((i) => _id(i) === _id(item))) {
    return;
  }
  selected.value = [...selected.value, item];
  emit('update', selected.value);
}

function removeItem(item: Context) {
  selected.value = selected.value.filter((i) => _id(i) !== _id(item));
  emit('update', selected.value);
}

function reset() {
  selected.value = props.options;
  emit('update', selected.value);
}
</script>

<template>
  <div
    v-if="props.options.length > 0"
    class="context-select"
  >
    <rc-dropdown
      class="context-dropdown"
      placement="top-end"
      @update:open="isOpen = $event"
    >
      <rc-dropdown-trigger
        ghost
        small
        class="context-trigger"
        :disabled="props.disabled"
      >
        <span
          :class="{ 'ml-5': props.disabled }"
        >
          {{ t('ai.context.add') }}
        </span>
        <template #after>
          <i
            :class="{
              'icon icon-chevron-up': isOpen,
              'icon icon-chevron-down': !isOpen
            }"
          />
        </template>
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <rc-dropdown-item
          v-for="(opt, i) in props.options"
          :key="i"
          v-clean-tooltip="opt.description"
          @click="toggleItem(opt)"
        >
          {{ opt.tag }}:{{ opt.valueLabel || opt.value }}
          <i
            v-if="selected.find((s: Context) => _id(s) === _id(opt))"
            :class="{
              'icon icon-close': selected.find((s: Context) => _id(s) === _id(opt)),
            }"
          />
          <template
            #before
          >
            <i
              v-if="opt.icon"
              class="icon"
              :class="opt.icon"
            />
          </template>
        </rc-dropdown-item>
      </template>
    </rc-dropdown>
    <div class="tags">
      <ContextTag
        v-for="(item, index) in selected"
        :key="index"
        :item="item"
        @remove="removeItem(item)"
      />
    </div>
    <div
      v-if="options.length !== selected.length"
      class="context-reset"
    >
      <RcButton
        small
        tertiary
        @click="reset"
      >
        <i class="icon icon-refresh mr-5" />
        {{ t('ai.context.reset') }}
      </RcButton>
    </div>
  </div>
  <span
    v-else
    class="text-muted no-context"
  >
    {{ t('ai.context.none') }}
  </span>
</template>

<style lang="scss" scoped>
.context-trigger {
  display: flex;
  gap: 8px;
  min-height: 24px;
}

.context-select {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;
  align-items: center;
  gap: 10px;
  color: var(--active-nav);
}

.context-reset {
  height: 28px;
  .btn {
    height: 28px;
    min-height: 28px;;
  }
}

.no-context {
  margin: 7px 0 7px 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  color: var(--active-nav);
}

.icon-pin-outlined {
  color: var(--active-nav);
}
</style>
