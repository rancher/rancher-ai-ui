import NotificationMessageChannel from './channel/message';

/**
 * Handler to manage notifications by channel
 */
class NotificationHandler {
  message() {
    return NotificationMessageChannel;
  }
}

export default new NotificationHandler();
