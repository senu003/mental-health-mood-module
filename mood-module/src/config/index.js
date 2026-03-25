export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  TIMEOUT: 10000,
  ENDPOINTS: {
    dashboard: (userId) => `/api/moods/dashboard/${userId}`,
    weekly: (userId) => `/api/moods/weekly/${userId}`,
    history: (userId) => `/api/moods/history/${userId}`,
    insights: (userId) => `/api/moods/insights/${userId}`,
    createMood: "/api/moods",
  },
};

export const getCurrentUserId = () => {
  return sessionStorage.getItem("userId") || "testuser001";
};
