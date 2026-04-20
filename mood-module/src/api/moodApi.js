import client from "./client";
import { API_CONFIG } from "../config";

export const fetchDashboardStats = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.dashboard(userId));
};

export const fetchWeeklyData = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.weekly(userId));
};

export const createCheckIn = async (payload) => {
  return client.post(API_CONFIG.ENDPOINTS.createMood, payload);
};

export const updateCheckIn = async (checkInId, payload) => {
  return client.patch(`${API_CONFIG.ENDPOINTS.createMood}/${checkInId}`, payload);
};

export const fetchMoodHistory = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.history(userId));
};

export const fetchWeeklyInsights = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.insights(userId));
};

export const fetchInsights = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.insights(userId));
};

// Mood Fix Activity APIs
export const fetchMoodFixActivities = async () => {
  return client.get("/api/mood-fix/activities");
};

export const saveMoodFixActivity = async (activityData) => {
  return client.post("/api/mood-fix/activities", activityData);
};

export const updateMoodFixActivity = async (activityId, updateData) => {
  return client.patch(`/api/mood-fix/activities/${activityId}`, updateData);
};