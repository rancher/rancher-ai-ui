import { Store } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  ConfirmationStatus, Message, MessageInternalSource, MessagePlanningStatus, NotificationType, Role, StorageKey
} from '../../../types';
import { NotificationChannel } from './index';

class NotificationMessageChannel extends NotificationChannel {
  send(store: Store<any>, storage: { get: Function }, message: Message): void {
    // Only notify for assistant messages and errors
    if (message.role !== Role.Assistant && message.source !== MessageInternalSource.Error) {
      return;
    }

    // Only notify if message is actually completed
    if (!message.completed) {
      return;
    }

    const { t } = useI18n(store);

    const title = t('ai.notifications.message.title');
    const summary = this.extractMessageSummary(t, message);

    this.sendNotification(store, NotificationType.MESSAGE, {
      title,
      summary
    }, { enableDesktopNotifications: storage.get(StorageKey.ENABLE_DESKTOP_NOTIFICATIONS) });
  }

  clear(store: Store<any>): void {
    this.clearNotifications(store, NotificationType.MESSAGE);
  }

  private extractMessageSummary(t: Function, message: Message): string {
    if (message.source === MessageInternalSource.Error) {
      return t('ai.notifications.message.summary.error');
    }

    if (message.confirmation?.status === ConfirmationStatus.Pending) {
      return t('ai.notifications.message.summary.confirmation');
    }

    switch (message.planningContent?.status) {
    case MessagePlanningStatus.Pending:
      return t('ai.notifications.message.summary.planning', { count: message.planningContent.tasks?.length || 0 });
    case MessagePlanningStatus.Completed:
      return t('ai.notifications.message.summary.planningCompleted');
    case MessagePlanningStatus.Failed:
      return t('ai.notifications.message.summary.planningFailed');
    case MessagePlanningStatus.Canceled:
      return t('ai.notifications.message.summary.planningCanceled');
    }

    if (message.messageContent) {
      return t('ai.notifications.message.summary.message');
    }

    return t('ai.notifications.message.summary.idle');
  }
}

export default new NotificationMessageChannel();