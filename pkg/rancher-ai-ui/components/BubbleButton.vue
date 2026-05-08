<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

const props = defineProps({
  icon: {
    type:    String,
    default: '',
  },
  tooltip: {
    type:    String,
    default: '',
  },
  showSuccess: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['click']);

const success = ref(false);
const successTimeout = ref<any>(null);

function handleShowSuccess() {
  success.value = true;
  if (successTimeout.value) {
    clearTimeout(successTimeout.value);
  }
  successTimeout.value = setTimeout(() => {
    success.value = false;
  }, 1000);
}

function handleClick() {
  emit('click');

  if (props.showSuccess) {
    handleShowSuccess();
  }
}

onBeforeUnmount(() => {
  if (successTimeout.value) {
    clearTimeout(successTimeout.value);
  }
});
</script>

<template>
  <button
    v-clean-tooltip="props.tooltip"
    class="bubble-action-btn btn role-tertiary"
    type="button"
    role="button"
    @click="handleClick"
  >
    <i :class="`icon ${ success ? 'icon-checkmark' : props.icon }`" />
  </button>
</template>

<style lang='scss' scoped>
.bubble-action-btn {
  background: var(--body-bg);
  border: 1.5px solid var(--border);
  border-radius: 50%;
  padding: 2px;
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.04);
  cursor: pointer;
  transition: border 0.15s, box-shadow 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  width: 32px;
  height: 32px;

  &:hover {
    border: solid 1px var(--secondary-border, var(--primary));
    box-shadow: 0 2px 8px 0 rgba(61,152,211,0.10);
  }

  .icon {
    font-size: 12px;
    width: 12px;
    height: 12px;
  }
}
</style>
