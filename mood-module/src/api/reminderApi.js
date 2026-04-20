import client from "./client";
import { API_CONFIG } from "../config";

export const fetchRemindersToday = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.remindersToday, {
    params: { userId },
  });
};

export const completeReminder = async (reminderId, userId) => {
  return client.post(API_CONFIG.ENDPOINTS.reminderComplete(reminderId), {
    userId,
  });
};

export const skipReminder = async (reminderId, userId) => {
  return client.post(API_CONFIG.ENDPOINTS.reminderSkip(reminderId), {
    userId,
  });
};

export const reactivateReminder = async (reminderId, userId) => {
  return client.post(API_CONFIG.ENDPOINTS.reminderReactivate(reminderId), {
    userId,
  });
};

export const updateReminder = async (reminderId, payload, userId) => {
  return client.patch(API_CONFIG.ENDPOINTS.reminderById(reminderId), {
    ...payload,
    userId,
  });
};

export const deleteReminder = async (reminderId, userId) => {
  return client.delete(API_CONFIG.ENDPOINTS.reminderById(reminderId), {
    data: { userId },
  });
};

export const fetchNotifications = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.notifications(userId));
};

export const markNotificationRead = async (notificationId, userId) => {
  return client.patch(API_CONFIG.ENDPOINTS.markNotificationRead(notificationId), {
    userId,
  });
};

export const fetchReminderNotificationCounts = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.reminderNotificationCounts(userId));
};
