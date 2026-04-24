<script setup lang="ts">
import semver from 'semver';
import { isEqual, debounce } from 'lodash';
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import ToggleSwitch from '@components/Form/ToggleSwitch/ToggleSwitch.vue';
import RcButton from '@components/RcButton/RcButton.vue';
import FilterPanel from '@shell/components/FilterPanel.vue';
import TextAreaAutoGrow from '@components/Form/TextArea/TextAreaAutoGrow.vue';
import Banner from '@components/Banner/Banner.vue';
import RcItemCard from '@components/RcItemCard/RcItemCard.vue';
import RcItemCardAction from '@components/RcItemCard/RcItemCardAction.vue';
import { getRancherVersion } from '../../../utils/version';
import { UIToolsConfig, UIToolsConfigs, ToolsDefinitionAction, ToolsDefinitionActionType } from '../../../types';

type FilterState = Record<string, string[]>;

const store = useStore();
const { t } = useI18n(store);

const RANCHER_VERSION_KEY = 'rancher-version';

const props = defineProps({
  value: {
    type:     Object as () => UIToolsConfigs,
    required: true,
  },
  readOnly: {
    type:    Boolean,
    default: false,
  },
  requiredAction: {
    type:    Object as () => ToolsDefinitionAction,
    default: () => ({ type: ToolsDefinitionActionType.None }),
  },
});

const emit = defineEmits(['update:value', 'publish:tools']);

const initValue = ref({ ...props.value });
const hasToolsConfigChanges = ref(false);
const hasToolEnabledChanges = ref(false);

const searchQuery = ref('');
const debouncedSearchQuery = ref('');

const filters = ref<FilterState>({ categories: [] });
const internalFilters = ref<FilterState>({ categories: [] });
const isFilterUpdating = ref(false);

const toolsDefinitionActionType = computed(() => {
  const user = props.readOnly ? 'user' : 'admin';
  const type = props.requiredAction.type;

  return {
    color:   props.requiredAction.type === ToolsDefinitionActionType.Create ? 'info' : 'warning',
    message: t(`aiConfig.form.section.tools.publish.action.${ type }.message.${ user }`, {}, true),
  };
});

const toolsDefinitionActionResult = computed(() => {
  if (!props.requiredAction.result) {
    return null;
  }

  const { action, success, message = undefined } = props.requiredAction.result;

  const key = success ? 'success' : 'error';

  return {
    color:   key,
    message: t(`aiConfig.form.section.tools.publish.action.${ action }.result.${ key }`, { message }, true),
  };
});

// Debounce search query
const debouncedSearch = debounce((q: string) => {
  debouncedSearchQuery.value = q;
}, 300);

// Get unique categories from tools
const categoryOptions = computed(() => {
  const categories = new Set<string>();

  props.value?.tools?.forEach((tool) => {
    if (tool.category) {
      categories.add(tool.category);
    }
  });

  return Array.from(categories).sort().map((cat) => ({
    value: cat.toLowerCase(),
    label: cat.charAt(0).toUpperCase() + cat.slice(1)
  }));
});

// Filter panel configuration
const filterPanelFilters = computed(() => [
  {
    key:     'categories',
    title:   t('generic.category'),
    options: categoryOptions.value
  }
]);

// Filter tools based on search and category filters
const filteredTools = computed(() => {
  let tools = props.value?.tools || [];

  // Filter by Rancher version compatibility
  tools = tools.filter((tool) => !tool.metadata?.[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]));

  // Filter by search query
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase();

    tools = tools.filter((tool) => tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query)
    );
  }

  // Filter by categories
  if (filters.value.categories.length > 0) {
    tools = tools.filter((tool) => filters.value.categories.includes(tool.category.toLowerCase())
    );
  }

  return tools;
});

const enabledToolsCount = computed(() => filteredTools.value.filter((t) => t.enabled).length);

const totalMessage = computed(() => {
  const count = !isFilterUpdating.value ? filteredTools.value.length : '...';

  if (filters.value.categories.length === 0 && !searchQuery.value) {
    return t('aiConfig.form.section.tools.total', { count });
  }

  return t('aiConfig.form.section.tools.matched', { count });
});

const noFiltersApplied = computed(() => filters.value.categories.length === 0 && !searchQuery.value
);

// Handle filter changes
const onFilterChange = (newFilters: FilterState) => {
  isFilterUpdating.value = true;
  internalFilters.value = newFilters;
  applyFiltersDebounced(newFilters);
};

const applyFiltersDebounced = debounce((newFilters: FilterState) => {
  filters.value = newFilters;
  isFilterUpdating.value = false;
}, 100);

// Filter by category when clicking on category in tool card footer
const filterByCategory = (category: string) => {
  const categoryLower = category.toLowerCase();

  if (!filters.value.categories.includes(categoryLower)) {
    filters.value.categories.push(categoryLower);
    internalFilters.value.categories.push(categoryLower);
  }
};

// Reset filters
const resetAllFilters = () => {
  internalFilters.value = { categories: [] };
  filters.value = { categories: [] };
  searchQuery.value = '';
  debouncedSearchQuery.value = '';
};

// Focus search
const searchRef = ref<HTMLInputElement>();
const focusSearch = () => {
  if (searchRef.value) {
    searchRef.value.focus();
    searchRef.value.select();
  }
};

// Update tools config value
const updateToolsConfigValue = (newConfig: Partial<UIToolsConfig>) => {
  const currentConfig = { ...props.value.config };
  const updatedConfig = {
    ...currentConfig,
    ...newConfig
  };

  const updatedValue = {
    ...props.value,
    config: updatedConfig
  };

  hasToolsConfigChanges.value = !isEqual(initValue.value, updatedValue);

  emit('update:value', updatedValue);
};

// Update tool enabled state
const updateToolEnabled = (toolName: string, enabled: boolean) => {
  const tool = props.value.tools.find((t) => t.name === toolName);

  if (tool) {
    const updatedTools = props.value.tools.map((t) => t.name === toolName ? {
      ...t,
      enabled
    } : t);
    const updatedValue = {
      ...props.value,
      tools: updatedTools
    };

    hasToolEnabledChanges.value = !isEqual(initValue.value.tools, updatedTools);

    emit('update:value', updatedValue);
  }
};

const resetToolsConfigToDefaults = () => {
  updateToolsConfigValue({ ...props.value.config.defaultValues });

  hasToolsConfigChanges.value = false;
};

// Reset tools to default values
const resetToolsToDefaults = () => {
  const updatedTools = [];

  for (const tool of props.value.tools) {
    const defaultEnabled = tool.defaultValues?.enabled;

    if (defaultEnabled !== undefined) {
      tool.enabled = defaultEnabled;
    }

    updatedTools.push(tool);
  }

  const updatedValue = {
    ...props.value,
    tools: updatedTools
  };

  hasToolEnabledChanges.value = false;

  emit('update:value', updatedValue);
};
</script>

<template>
  <div
    v-if="toolsDefinitionActionResult"
    class="tools-definition-row"
  >
    <Banner
      class="m-0"
      :color="toolsDefinitionActionResult.color"
    >
      <span
        v-clean-html="toolsDefinitionActionResult.message"
      />
    </Banner>
  </div>
  <div
    v-if="props.requiredAction.type !== ToolsDefinitionActionType.None && !props.requiredAction.result?.success"
    class="tools-definition-row"
  >
    <Banner
      v-if="!props.requiredAction.result"
      class="m-0"
      :color="toolsDefinitionActionType.color"
    >
      <span
        v-clean-html="toolsDefinitionActionType.message"
      />
    </Banner>
    <RcButton
      v-if="!props.readOnly"
      primary
      @click="emit('publish:tools')"
    >
      {{ t(`aiConfig.form.section.tools.publish.action.${ props.requiredAction.type }.label`, {}, true) }}
    </RcButton>
  </div>
  <div
    v-else
    class="ui-tools-config-container"
  >
    <!-- Tools Config management Section -->
    <div class="form-values-row">
      <div class="row">
        <div class="col span-12">
          <Checkbox
            class="form-value-checkbox"
            :value="props.value?.config?.enabled"
            :label="t('aiConfig.form.section.tools.fields.enabled.label')"
            :disabled="readOnly"
            @update:value="(val: boolean) => updateToolsConfigValue({ enabled: val })"
          />
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.tools.fields.systemPrompt.label') }}
            <i
              v-clean-tooltip="t('aiConfig.form.section.tools.fields.systemPrompt.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
        </div>
      </div>
      <div class="row textarea-with-validation">
        <TextAreaAutoGrow
          :value="props.value?.config?.systemPrompt"
          :disabled="readOnly"
          :placeholder="t('aiConfig.form.section.tools.fields.systemPrompt.placeholder')"
          :min-height="100"
          :max-height="150"
          @update:value="(val: string) => updateToolsConfigValue({ systemPrompt: val })"
        />
      </div>
      <div
        v-if="!props.readOnly && hasToolsConfigChanges"
        class="row"
      >
        <div class="col span-4">
          <button
            class="btn role-tertiary"
            :disabled="readOnly"
            @click="resetToolsConfigToDefaults"
          >
            {{ t('aiConfig.form.resetToDefaults', {}, true) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tools list management Section -->
    <div class="form-values-row">
      <div class="row">
        <div class="col span-6">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.tools.fields.tools.label') }}
          </h3>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-input">
        <input
          ref="searchRef"
          v-model="searchQuery"
          type="search"
          class="input"
          :placeholder="t('aiConfig.form.section.tools.search', {}, true)"
          :aria-label="t('aiConfig.form.section.tools.search', {}, true)"
          role="textbox"
          @input="debouncedSearch(searchQuery)"
        >
        <i
          v-if="!searchQuery"
          class="icon icon-search"
        />
      </div>

      <!-- Keyboard shortcut to focus search -->
      <button
        v-shortkey.once="['/']"
        class="hide"
        @shortkey="focusSearch()"
      />

      <div class="tools-wrapper">
        <!-- Filter Panel -->
        <FilterPanel
          :model-value="internalFilters"
          :filters="filterPanelFilters"
          @update:modelValue="onFilterChange"
        />

        <!-- Empty State -->
        <div
          v-if="filteredTools.length === 0"
          class="empty-state"
        >
          <h3 class="empty-state-title">
            {{ t('aiConfig.form.section.tools.noMatchingTools', {}, true) }}
          </h3>
          <div class="empty-state-content">
            <p>{{ t('aiConfig.form.section.tools.tryAdjustingFilters', {}, true) }}</p>
            <RcButton
              v-if="!noFiltersApplied"
              tertiary
              class="inline-button"
              @click="resetAllFilters"
            >
              {{ t('aiConfig.form.section.tools.resetFilters', {}, true) }}
            </RcButton>
          </div>
        </div>

        <!-- Tools List -->
        <div
          v-else
          class="right-section"
        >
          <!-- Total and Controls -->
          <div class="total-and-controls">
            <div class="total">
              <p class="total-message">
                {{ totalMessage }}
                <span
                  v-if="enabledToolsCount > 0"
                  class="enabled-count"
                >
                  {{ t('aiConfig.form.section.tools.enabledCount', { count: enabledToolsCount }) }}
                </span>
              </p>
              <button
                v-if="!noFiltersApplied"
                class="reset-filters-link"
                @click="resetAllFilters"
              >
                {{ t('aiConfig.form.section.tools.resetFilters', {}, true) }}
              </button>
            </div>
            <div
              v-if="!props.readOnly && hasToolEnabledChanges"
              class="text-right"
            >
              <button
                class="btn role-tertiary"
                :disabled="readOnly || !props.value?.tools || props.value?.tools.length === 0"
                @click="resetToolsToDefaults"
              >
                {{ t('aiConfig.form.resetToDefaults', {}, true) }}
              </button>
            </div>
          </div>

          <!-- Tools Cards Grid -->
          <div class="tools-grid-container">
            <div class="tools-grid">
              <RcItemCard
                v-for="tool in filteredTools"
                :id="tool.name"
                :key="tool.name"
                :value="tool"
                variant="medium"
                :header="{
                  title: {
                    key: `aiConfig.form.section.tools.fields.tools.name.${tool.name}`,
                    text: tool.name
                  }
                }"
                :image="{
                  icon: 'icon-gear'
                }"
                :content="{
                  text: tool.description
                }"
              >
                <template
                  v-once
                  #item-card-sub-header
                >
                  <div class="version-badge">
                    <i
                      v-clean-tooltip="t('aiConfig.form.section.tools.fields.tools.revision.tooltip', {}, true)"
                      :class="['icon', 'icon-version-alt']"
                    />
                    <p>
                      v{{ tool.revision }}
                    </p>
                  </div>
                </template>
                <template #item-card-actions>
                  <ToggleSwitch
                    :value="tool.enabled"
                    :disabled="readOnly"
                    @update:value="updateToolEnabled(tool.name, $event)"
                  />
                </template>
                <template #item-card-footer>
                  <rc-item-card-action
                    class="app-chart-card-footer-item-action"
                  >
                    <rc-button
                      variant="ghost"
                      class="app-chart-card-footer-button secondary-text-link"
                      @click="filterByCategory(tool.category)"
                    >
                      <i
                        v-clean-tooltip="t('aiConfig.form.section.tools.fields.tools.category.tooltip.label', {}, true)"
                        class="app-chart-card-footer-item-icon icon icon-category-alt"
                      />
                      <span
                        v-clean-tooltip="t('aiConfig.form.section.tools.fields.tools.category.tooltip.action', {}, true)"
                        class="app-chart-card-footer-button-label"
                      >
                        {{ tool.category }}
                      </span>
                    </rc-button>
                  </rc-item-card-action>
                </template>
              </RcItemCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-tools-config-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-values-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-value-checkbox {
  width: fit-content;
}

.form-row-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.text-label {
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  color: var(--body-text-secondary);
}

.search-input {
  position: relative;

  input {
    height: 48px;
    width: 100%;
    padding-left: 16px;
    padding-right: 16px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }

    &::placeholder {
      color: var(--input-placeholder-text);
    }
  }

  .icon-search {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 16px;
    color: var(--input-placeholder-text);
  }
}

.hide {
  display: none;
}

.tools-wrapper {
  display: flex;
  gap: var(--gap-lg);
  width: 100%;
  min-width: 0;
}

.empty-state {
  width: 100%;
  padding: 32px 120px;
  text-align: center;

  .empty-state-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 24px 0;
    color: var(--body-text);
  }

  .empty-state-content {
    p {
      font-size: 14px;
      color: var(--body-text-secondary);
      margin: 0 0 24px 0;
    }
  }
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.total-and-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--gap-md);
  padding: 8px 0;
  overflow: hidden;

  .total {
    display: flex;
    align-items: center;
    height: 56px;
    gap: 8px;

    .total-message {
      font-size: 16px;
      font-weight: 600;
      color: var(--body-text);
      margin: 0;

      .enabled-count {
        color: var(--body-text-secondary);
        font-weight: 400;
      }
    }

    .reset-filters-link {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: var(--primary-hover);
      }
    }
  }
}

.tools-grid-container {
  height: 650px;
  overflow-y: auto;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--gap-md);
  width: 100%;
  height: fit-content;
  overflow-y: auto;
  min-width: 0;
}

.tool-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-background);
  overflow: hidden;
  transition: all 0.2s ease;
  min-width: 0;
  height: 200px;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.version-badge {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.reset-filters-btn {
  padding: 8px 16px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  background: transparent;
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary);
    color: white;
  }
}

.m-0 {
  margin: 0;
}

.mb-8 {
  margin-bottom: 8px;
}

.mt-4 {
  margin-top: 4px;
}

.textarea-with-validation {
  position: relative;

  .textarea-validation-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--error);
    cursor: pointer;
    z-index: 10;
  }
}

.tooltip-icon {
  color: var(--input-label);
  margin-left: 8px;
  cursor: pointer;
}

.required {
  color: var(--error);
}

.text-right {
  text-align: right;
}

.tools-definition-row {
  margin: 0 0 24px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.app-chart-card-footer {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;

  &-item {
    display: flex;
    align-items: center;
    color: var(--link-text-secondary);
    margin-top: 8px;
    margin-right: 8px;
    min-width: 0;
    max-width: 100%;

    &-action {
      display: flex;
      align-items: center;
      min-width: 0;
      max-width: 100%;
      margin-top: 8px;
    }

    &-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    &-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      font-size: 19px;
      align-items: center;
      justify-content: center;
      margin-right: 8px;
      text-decoration: none;
    }
  }

  &-button {
    text-transform: capitalize;
    min-width: 0;
    max-width: 100%;

    &-label {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

button.variant-ghost.app-chart-card-footer-button {
  padding: 0;
  gap: 0;
  min-height: 20px;
  text-decoration: none !important;
  outline: none;

  &:hover .app-chart-card-footer-button-label {
    text-decoration: none;
  }

  .app-chart-card-footer-item-icon {
    text-decoration: none !important;
  }

  .app-chart-card-footer-button-label {
    text-decoration: underline;
  }
}
</style>
