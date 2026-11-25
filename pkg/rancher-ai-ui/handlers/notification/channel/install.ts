import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { InstallStep, InstallStepStatus, NotificationType } from '../../../types';
import { NotificationChannel } from './index';

class NotificationInstallChannel extends NotificationChannel {
  send(store: Store<any>, { step, status }: { step: InstallStep; status: InstallStepStatus }): void {
    const { t } = useI18n(store);
    let summary: string;

    if (status === InstallStepStatus.Error) {
      summary = t('ai.notifications.install.summary.error', { step: t(`ai.install.steps.${ step }.label`) });
    } else if (status === InstallStepStatus.Ready && [InstallStep.Agent, InstallStep.Configure].includes(step)) {
      summary = t('ai.notifications.install.summary.ready');
    } else if (status === InstallStepStatus.Done && step === InstallStep.Apply) {
      summary = t('ai.notifications.install.summary.completed');
    } else {
      return;
    }

    // No desktop notifications: they required browser permission handling and the chat is not ready yet
    this.sendNotification(store, NotificationType.INSTALL, {
      title: t('ai.notifications.install.title'),
      summary
    });
  }

  clear(store: Store<any>): void {
    this.clearNotifications(store, NotificationType.INSTALL);
  }
}

export default new NotificationInstallChannel();
