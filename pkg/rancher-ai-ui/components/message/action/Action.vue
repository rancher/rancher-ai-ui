<script setup lang="ts">
import { onMounted, ref, type PropType } from 'vue';
import { useStore } from 'vuex';
import { warn } from '../../../utils/log';
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

const to = ref<any>(null);
const tooltip = ref<string>('');

function goTo() {
  if (to.value.detailLocation) {
    store.state.$router.push({
      ...to.value.detailLocation,
      params: {
        ...(to.value.detailLocation.params || {}),
        /**
         * TODO:
         * We are assuming that the product is 'explorer' here because
         * Resource actions are only for resources that exist in the cluster explorer, at this time.
         *
         * 1. The productId should be dynamic and based on where the resource is located, ex: Fleet -> get Gitrepos
         */
        product: 'explorer',
        cluster: props.value?.resource?.cluster || to.value.detailLocation.params?.cluster, // Preserve cluster param
      }
    });
  }
}

onMounted(async() => {
  if (!!props.value.resource?.detailLocation) {
    to.value = props.value.resource;
  } else {
    const inStore = 'management';

    await store.dispatch('loadManagement');

    const {
      cluster, type, namespace, name
    } = props.value.resource || {};

    try {
      to.value = await store.dispatch(`${ inStore }/find`, {
        cluster,
        type,
        id: namespace ? `${ namespace }/${ name }` : name
      });
    } catch (e) {
      warn('Action - Could not find resource', e);
      to.value = null;
    }
  }
});

</script>

<template>
  <div
    v-if="props.value.type === ActionType.Button"
    :data-testid="`rancher-ai-ui-chat-message-action-button-${ props.value?.resource?.name }`"
  >
    <RcButton
      v-clean-tooltip="tooltip"
      small
      secondary
      :disabled="!to"
      @click="goTo"
    >
      <span class="rc-button-label">
        {{ props.value.label }}
      </span>
    </RcButton>
  </div>
  <span v-if="props.value.type === ActionType.Link">
    <a
      v-if="to"
      v-clean-tooltip="tooltip"
      class="link"
      @click="goTo"
    >
      {{ props.value.label }}
    </a>
    <span v-else>
      {{ props.value.label }}
      <template v-if="!props.value">
        <span class="text-muted">&mdash;</span>
      </template>
    </span>
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