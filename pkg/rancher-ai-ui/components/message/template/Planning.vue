<script setup lang="ts">
import { type PropType } from 'vue';
import { Agent, Message } from '../../../types';
import StatusInfo from '../planning/StatusInfo.vue';
import ApprovalInfo from '../planning/ApprovalInfo.vue';
import MessageComponent from '../index.vue';

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  agents: {
    type:     Array as PropType<Agent[]>,
    default:  () => [],
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  pendingConfirmation: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:message', 'confirm:message', 'send:message', 'confirm:planning']);
</script>

<template>
  <StatusInfo
    v-if="props.message?.planningContent"
    v-bind="$attrs"
    :value="props.message.planningContent"
    :agents="props.agents"
    :disabled="props.disabled"
    @confirm="emit('confirm:planning', { result: $event })"
  />
  <ApprovalInfo
    v-if="props.message?.planningContent?.approval"
    :principal="props.message?.templateContent?.content.principal"
    :disabled="props.disabled"
    :timestamp="props.message.timestamp"
    @confirm="emit('confirm:planning', { result: $event })"
  />
  <MessageComponent
    v-else
    v-bind="$attrs"
    :message="props.message"
    :disabled="props.disabled"
    :pending-confirmation="props.pendingConfirmation"
    @update:message="emit('update:message', $event)"
    @confirm:message="emit('confirm:message', $event)"
    @send:message="emit('send:message', $event)"
  />
</template>
