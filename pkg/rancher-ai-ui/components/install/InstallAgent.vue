<script setup lang="ts">
// @ts-expect-error FIXME: no type declarations for js-yaml
import jsyaml from 'js-yaml';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { CATALOG, NORMAN } from '@shell/config/types';
import RcButton from '@components/RcButton/RcButton.vue';
import AppModal from '@shell/components/AppModal.vue';
import AgentValuesModal from './AgentValuesModal.vue';
// @ts-expect-error FIXME: Cannot find module '../../assets/liz-icon.svg'
import lizIcon from '../../assets/liz-icon.svg';
import { PRODUCT_NAME } from '../../product';
import { InstallStep, InstallStepStatus } from '../../types';
import { useAiAgentInstallerComposable } from '../../composables/useAiAgentInstallerComposable';

const STATUS_ICON: Record<InstallStepStatus, string> = {
  [InstallStepStatus.Pending]:    'icon-chevron-right',
  [InstallStepStatus.InProgress]: 'icon-spinner icon-spin',
  [InstallStepStatus.Done]:       'icon-checkmark',
  [InstallStepStatus.Error]:      'icon-error',
};

const store = useStore();
const { t } = useI18n(store);

const emit = defineEmits(['reload']);

const {
  state, install, installChart, agentApp, repository, loadValues, setValues
} = useAiAgentInstallerComposable();

const userName = computed(() => {
  const principal = store.getters['rancher/byId'](NORMAN.PRINCIPAL, store.getters['auth/principalId']);

  return principal?.loginName === 'admin' ? principal.loginName : principal?.name || 'User';
});

const steps = computed(() => [
  {
    key:  InstallStep.Repository,
    link: repository.value ? {
      name:   'c-cluster-product-resource-id',
      params: {
        cluster:  'local',
        product:  'apps',
        resource: CATALOG.CLUSTER_REPO,
        id:       repository.value.metadata?.name
      },
    } : null,
  },
  {
    key:  InstallStep.Agent,
    link: agentApp.value ? {
      name:   'c-cluster-product-resource-namespace-id',
      params: {
        cluster:   'local',
        product:   'apps',
        resource:  CATALOG.APP,
        namespace: agentApp.value.metadata?.namespace,
        id:        agentApp.value.metadata?.name
      },
    } : null,
  },
  {
    key:  InstallStep.Configure,
    link: state.configApplied ? {
      name:   `c-cluster-settings-${ PRODUCT_NAME }`,
      params: { cluster: store.state.$route?.params?.cluster || 'local' },
      query:  { section: 'ai-agent-settings' },
    } : null,
  },
].map((step, index, all) => {
  const status = state.steps[step.key].status;

  // The configuration step is in progress while waiting for the user to save the settings, it only runs once they're saved
  const isWaitingForUser = (s: InstallStep) => s === InstallStep.Configure && state.steps[s].status === InstallStepStatus.InProgress && !state.verifyingConfig;

  // A pending step is next only when it's waiting for the user: no step is running or has failed
  const isBlocked = all.some((s) => !isWaitingForUser(s.key) && [InstallStepStatus.InProgress, InstallStepStatus.Error].includes(state.steps[s.key].status));
  const isNext = !isBlocked && status === InstallStepStatus.Pending && all.findIndex((s) => state.steps[s.key].status === InstallStepStatus.Pending) === index;
  const disabled = !isWaitingForUser(step.key) && status === InstallStepStatus.Pending && !isNext;
  const icon = isWaitingForUser(step.key) ? 'icon-chevron-right' : STATUS_ICON[status];

  return {
    ...step,
    link:   disabled ? null : step.link,
    disabled,
    index:  index + 1,
    status,
    icon,
    error:  state.steps[step.key].error,
  };
}));

const showAgentActions = computed(() => state.started &&
  state.steps[InstallStep.Repository].status === InstallStepStatus.Done &&
  [InstallStepStatus.Pending, InstallStepStatus.Error].includes(state.steps[InstallStep.Agent].status));

const showValuesModal = ref(false);
const valuesYaml = ref('');
const valuesLoading = ref(false);
const valuesError = ref('');

async function openValuesModal() {
  showValuesModal.value = true;
  valuesLoading.value = true;
  valuesError.value = '';

  try {
    valuesYaml.value = jsyaml.dump(await loadValues(), { lineWidth: -1 });
  } catch (err: any) {
    valuesError.value = err?.message || `${ err }`;
  } finally {
    valuesLoading.value = false;
  }
}

function saveValues(yaml: string) {
  let values;

  try {
    values = jsyaml.load(yaml) || {};
  } catch (err: any) {
    valuesError.value = t('ai.install.values.invalid', { error: err?.message || err });

    return;
  }

  if (typeof values !== 'object' || Array.isArray(values)) {
    valuesError.value = t('ai.install.values.invalid', { error: t('ai.install.values.notAnObject') });

    return;
  }

  setValues(values);
  showValuesModal.value = false;
}

function restoreValues() {
  setValues(null);
  showValuesModal.value = false;
}

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
    query:  { section: 'ai-agent-settings' },
  });
}
</script>

<template>
  <div
    class="install-agent"
    data-testid="rancher-ai-ui-install-agent"
  >
    <div class="install-agent-splash">
      <div class="install-agent-avatar-panel">
        <div class="install-agent-avatar">
          <img
            :src="lizIcon"
            alt="Liz Avatar"
            width="70"
            height="70"
          />
        </div>
        <div class="install-agent-greeting">
          <span class="install-agent-greeting-bubble">
            {{ t('ai.message.system.welcome.greetings.line3', { name: userName }, true) }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="install-agent-bubble"
      data-testid="rancher-ai-ui-install-agent-bubble"
    >
      <div
        v-if="state.started"
        class="install-agent-title"
      >
        <b>{{ t('ai.install.title') }}</b>
      </div>

      <!-- Not started: explain why and offer the installation -->
      <template v-if="!state.started">
        <span>{{ t('ai.install.notInstalled', {}, true) }}</span>
        <div class="install-agent-actions">
          <RcButton
            small
            variant="primary"
            data-testid="rancher-ai-ui-install-agent-start"
            @click="install"
          >
            {{ t('ai.install.actions.install') }}
          </RcButton>
        </div>
      </template>

      <!-- Installing -->
      <template v-else>
        <ol class="install-agent-steps">
          <li
            v-for="step in steps"
            :key="step.key"
            class="install-agent-step"
            :class="[`status-${ step.status }`, { disabled: step.disabled }]"
            :data-testid="`rancher-ai-ui-install-agent-step-${ step.key }`"
          >
            <span
              v-if="step.disabled"
              class="install-agent-step-number"
              :aria-label="t(`ai.install.status.${ step.status }`)"
            >
              {{ step.index }}
            </span>
            <i
              v-else
              :class="['icon', 'install-agent-step-status', step.icon]"
              role="img"
              :aria-label="t(`ai.install.status.${ step.status }`)"
            />
            <div class="install-agent-step-content">
              <span class="install-agent-step-label">
                <router-link
                  v-if="step.link"
                  :to="step.link"
                >
                  {{ t(`ai.install.steps.${ step.key }.label`) }}
                </router-link>
                <template v-else>
                  {{ t(`ai.install.steps.${ step.key }.label`) }}
                </template>
              </span>
              <span
                v-clean-html="t(`ai.install.steps.${ step.key }.description`, { disabled: step.disabled }, true)"
                class="install-agent-step-description text-deemphasized"
              />
              <span
                v-if="step.error"
                class="install-agent-step-error text-error"
              >
                {{ step.error }}
              </span>
              <!-- A failed agent step is retried with its own buttons, the configuration step can't fail on its own -->
              <div
                v-if="step.key === InstallStep.Repository && step.status === InstallStepStatus.Error"
                class="install-agent-actions"
              >
                <RcButton
                  small
                  variant="secondary"
                  data-testid="rancher-ai-ui-install-agent-retry"
                  @click="install"
                >
                  {{ t('ai.install.actions.retry') }}
                </RcButton>
              </div>
              <div
                v-if="step.key === InstallStep.Agent && showAgentActions"
                class="install-agent-actions"
              >
                <RcButton
                  small
                  variant="secondary"
                  data-testid="rancher-ai-ui-install-agent-edit-values"
                  @click="openValuesModal"
                >
                  {{ t(state.values ? 'ai.install.actions.editedValues' : 'ai.install.actions.editValues') }}
                </RcButton>
                <RcButton
                  small
                  variant="primary"
                  data-testid="rancher-ai-ui-install-agent-install-chart"
                  @click="installChart"
                >
                  {{ t('ai.install.actions.installChart') }}
                </RcButton>
              </div>
              <span
                v-if="step.key === InstallStep.Configure && state.verifyingConfig"
                class="install-agent-step-description"
              >
                {{ t('ai.install.verifying') }}
              </span>
              <span
                v-else-if="step.key === InstallStep.Configure && state.configApplied"
                class="install-agent-step-description"
              >
                {{ t('ai.install.applied') }}
              </span>
              <div
                v-else-if="step.key === InstallStep.Configure && (step.status === InstallStepStatus.InProgress || step.status === InstallStepStatus.Error) && $route.name !== `c-cluster-settings-${ PRODUCT_NAME }`"
                class="install-agent-actions"
              >
                <RcButton
                  small
                  variant="primary"
                  data-testid="rancher-ai-ui-install-agent-configure"
                  @click="routeToSettings"
                >
                  {{ t('ai.install.actions.configure') }}
                </RcButton>
              </div>
            </div>
          </li>
        </ol>
        <div
          v-if="state.configApplied"
          class="install-agent-actions"
        >
          <RcButton
            small
            variant="primary"
            data-testid="rancher-ai-ui-install-agent-reload"
            @click="emit('reload')"
          >
            <i class="icon icon-ai" />
            {{ t('ai.install.actions.reload', {}, true) }}
          </RcButton>
        </div>
      </template>
    </div>
  </div>
  <app-modal
    v-if="showValuesModal"
    :width="800"
    height="auto"
    :click-to-close="false"
  >
    <AgentValuesModal
      :value="valuesYaml"
      :loading="valuesLoading"
      :error="valuesError"
      @save="saveValues"
      @restore="restoreValues"
      @close="showValuesModal = false"
    />
  </app-modal>
</template>

<style lang="scss" scoped>
.install-agent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 16px;
  margin-top: auto;
  margin-bottom: auto;
  overflow-y: auto;
}

.install-agent-splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 16px;
}

.install-agent-avatar-panel {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  max-width: 250px;
  min-width: 150px;
}

.install-agent-greeting {
  position: relative;
  width: 100%;
  height: 104px;
  grid-area: 1 / 1;
  z-index: 20;
}

.install-agent-greeting-bubble {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #35B777;
  color: var(--body-text);
  white-space: nowrap;
  pointer-events: none;
}

.install-agent-avatar {
  grid-area: 1 / 1;
  z-index: 10;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 50%;
}

.install-agent-splash-text {
  text-align: center;
  font-family: Lato;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
}

.install-agent-bubble {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 12px;
  line-height: 21px;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  word-break: break-word;
}

.install-agent-title {
  margin-bottom: 4px;

  b {
    font-size: 1.2em;
  }
}

.install-agent-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  .icon {
    margin-right: 4px;
  }
}

.install-agent-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 4px 0;
  padding: 0;
  list-style: none;
}

.install-agent-step {
  display: flex;
  gap: 12px;

  // Same as the Planning tasks status icons
  .install-agent-step-status {
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 8px;
    line-height: 0.3;
  }

  &.status-done .install-agent-step-status {
    color: var(--success);
  }

  &.status-inProgress .install-agent-step-status {
    color: var(--info);
  }

  .install-agent-step-number {
    flex-shrink: 0;
    width: 1em;
    text-align: center;
    opacity: 0.5;
  }

  &.status-error .install-agent-step-status {
    color: var(--error);
  }

  &.disabled {
    .install-agent-step-label, .install-agent-step-description {
      opacity: 0.5;
    }
  }

  .install-agent-step-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .install-agent-step-label {
    font-weight: 600;
  }

  .install-agent-actions {
    justify-content: flex-start;
    margin-top: 4px;
  }
}
</style>
