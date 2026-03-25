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

export const fetchMoodHistory = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.history(userId));
};

export const fetchWeeklyInsights = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.insights(userId));
};

export const fetchInsights = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.insights(userId));
};