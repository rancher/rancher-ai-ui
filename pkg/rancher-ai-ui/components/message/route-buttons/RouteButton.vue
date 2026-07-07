<script setup lang="ts">
import { type PropType } from 'vue';
import { useStore } from 'vuex';
import RcButton from '@components/RcButton/RcButton.vue';
import { MessageAction } from '../../../types';
import { ActionType } from '../../../types';

const store = useStore();

const props = defineProps({
  value: {
    type:    Object as PropType<MessageAction>,
    default: () => ({} as MessageAction),
  }
});

function goTo() {
  if (props.value.resource?.detailLocation) {
    store.state.$router.push(props.value.resource.detailLocation);
  }
}
</script>

<template>
  <div
    v-if="props.value.type === ActionType.Button"
  >
    <RcButton
      small
      variant="secondary"
      @click="goTo"
    >
      <span class="rc-button-label">
        {{ props.value.label }}
      </span>
    </RcButton>
  </div>
  <span v-if="props.value.type === ActionType.Link">
    <a
      class="link"
      @click="goTo"
    >
      {{ props.value.label }}
    </a>
  </span>
</template>

<style lang='scss' scoped>
.rc-button-label {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}
.link {
  cursor: pointer;
}
</style>