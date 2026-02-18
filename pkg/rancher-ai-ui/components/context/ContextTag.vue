<script setup lang="ts">
import { Context } from '../../types';

type Props = {
  item?: Partial<Context>;
  removeEnabled?: boolean;
  type?: 'default' | 'user';
}

const props = withDefaults(defineProps<Props>(), {
  item: () => ({
    tag:   '',
    value: null,
  }),
  removeEnabled: true,
  type:          'default',
});

const emit = defineEmits(['remove']);
</script>

<template>
  <div
    v-clean-tooltip="props.item.description"
    class="vs__selected tag"
    :class="{ ['user-context']: props.type === 'user'}"
  >
    <div
      class="tag-content"
      :data-testid="`rancher-ai-ui-context-tag-${ props.item.valueLabel || props.item.value }`"
    >
      <span>
        {{ props.item.valueLabel || props.item.value }}
      </span>
    </div>
    <button
      v-if="props.removeEnabled"
      type="button"
      class="vs__deselect"
      @click="emit('remove', props.item)"
    />
  </div>
</template>

<style lang='scss' scoped>
.tag {
  display: flex;
  flex-direction: row;
  gap: 8px;
  height: 24px;
  line-height: 1;
  margin-right: 0;
  margin-left: 0;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 4px;

  .tag-content {
    display: flex;
    justify-content: center;
    gap: 4px;
  }

  .vs__deselect {
    margin: 0;
  }
}

.vs__selected {
  line-height: 2px;
  border: none;
  color: var(--active-nav);
}

.user-context {
  background-color: transparent;
  color: #9fabc6;
  height: 16px;
  font-size: 0.75rem;
  border: 1px solid #9fabc6;
  border-radius: 4px;
  margin: 0;
  cursor: default;
  word-break: break-word;
  white-space: pre-line;
}

</style>
