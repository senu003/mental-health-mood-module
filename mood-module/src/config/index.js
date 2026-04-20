export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  TIMEOUT: 10000,
  ENDPOINTS: {
    dashboard: (userId) => `/api/moods/dashboard/${userId}`,
    weekly: (userId) => `/api/moods/weekly/${userId}`,
    history: (userId) => `/api/moods/history/${userId}`,
    insights: (userId) => `/api/moods/insights/${userId}`,
    createMood: "/api/moods",
    remindersToday: "/api/reminders/today",
    reminderById: (reminderId) => `/api/reminders/${reminderId}`,
    reminderComplete: (reminderId) => `/api/reminders/${reminderId}/complete`,
    reminderSkip: (reminderId) => `/api/reminders/${reminderId}/skip`,
    reminderReactivate: (reminderId) => `/api/reminders/${reminderId}/reactivate`,
    notifications: (userId) => `/api/reminders/notifications/${userId}`,
    markNotificationRead: (notificationId) => `/api/reminders/notifications/${notificationId}/read`,
    reminderNotificationCounts: (userId) => `/api/reminders/counts/${userId}`,
    reportUpload: "/api/lab-reports/upload",
    reportHistory: (userId) => `/api/lab-reports/user/${userId}`,
    reportDetail: (reportId) => `/api/lab-reports/${reportId}`,
  },
};

export const getCurrentUserId = () => {
  return sessionStorage.getItem("userId") || "testuser001";
};
