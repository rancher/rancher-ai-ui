import NotificationMessageChannel from './channel/message';
import NotificationInstallChannel from './channel/install';

/**
 * Handler to manage notifications by channel
 */
class NotificationHandler {
  message() {
    return NotificationMessageChannel;
  }

  install() {
    return NotificationInstallChannel;
  }

  // Must be called from a user gesture: some browsers ignore the request otherwise
  requestPermission() {
    if (this.isPermissionPending()) {
      return Notification.requestPermission();
    }
  }

  isPermissionPending() {
    return 'Notification' in window && Notification.permission === 'default';
  }

  isBlocked() {
    return !('Notification' in window) || Notification.permission === 'denied';
  }
}

export default new NotificationHandler();
