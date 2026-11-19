import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { PRODUCT_NAME } from '../product';
import { NotificationType } from '../types';

interface NotificationData {
  description: string;
}

/**
 * Manages the state for chat notifications
 */
interface State {
  notifications: Record<NotificationType, NotificationData[]>;
}

const getters = {
  hasUnread: (state: State) => (type: NotificationType) => {
    return state.notifications[type]?.length > 0;
  },
  unreadCount: (state: State) => (type: NotificationType) => {
    return state.notifications[type]?.length || 0;
  },
  notifications: (state: State) => (type: NotificationType) => {
    return state.notifications[type] || [];
  }
};

const mutations = {
  addNotification(state: State, { type, description }: { type: NotificationType; description: string }) {
    if (!state.notifications[type]) {
      state.notifications[type] = [];
    }
    state.notifications[type].push({ description });
  },
  removeNotification(state: State, type: NotificationType, index: number) {
    if (state.notifications[type] && state.notifications[type][index]) {
      state.notifications[type].splice(index, 1);
    }
  },
  clearNotifications(state: State, type: NotificationType) {
    state.notifications[type] = [];
  }
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return { notifications: {} as Record<NotificationType, NotificationData[]> };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};

const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/notification` };

export default {
  specifics: factory(),
  config
};
