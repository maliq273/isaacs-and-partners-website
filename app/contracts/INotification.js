/**
 * Isaacs and Partners
 * Contract: Notification
 */

export class INotification {
  send(notification) {
    throw new Error(
      "INotification.send() must be implemented."
    );
  }

  sendToUser(userId, notification) {
    throw new Error(
      "INotification.sendToUser() must be implemented."
    );
  }

  sendToMatter(matterId, notification) {
    throw new Error(
      "INotification.sendToMatter() must be implemented."
    );
  }

  markAsRead(notificationId) {
    throw new Error(
      "INotification.markAsRead() must be implemented."
    );
  }

  getUnread(userId) {
    throw new Error(
      "INotification.getUnread() must be implemented."
    );
  }
}

export default INotification;
