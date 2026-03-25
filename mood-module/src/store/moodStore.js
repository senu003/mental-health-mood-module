// store/moodStore.js
import { create } from "zustand";

export const useMoodStore = create((set, get) => ({
  // ========================
  // Dashboard data
  // ========================
  dashboardData: {
    sevenDayAverage: "0",
    checkInStreak: 0,
    recoveryScore: 0,
    weeklyData: [],
  },
  loading: true,
  error: null,

  setDashboardData: (updater) =>
    set((state) => ({
      dashboardData:
        typeof updater === "function" ? updater(state.dashboardData) : updater,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearDashboardError: () => set({ error: null }),

  // ========================
  // Current check-in data
  // ========================
  currentCheckIn: {
    mood: "",
    note: "",
    date: "",
    levels: {
      sleepLevel: 5,
      anxietyLevel: 5,
      energyLevel: 5,
      motivationLevel: 5,
      socialInteraction: 5,
      stressLevel: 5,
      focusLevel: 5,
    },
  },
  lastSubmission: null,

  // ========================
  // Check-in actions
  // ========================

  // Update mood, note, date
  setCurrentCheckIn: (updater) =>
    set((state) => {
      const nextPatch =
        typeof updater === "function"
          ? updater(state.currentCheckIn)
          : updater || {};

      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          ...nextPatch,
        },
      };
    }),

  // Update levels only
  setLevels: (levels) =>
    set((state) => ({
      currentCheckIn: {
        ...state.currentCheckIn,
        levels: { ...state.currentCheckIn.levels, ...levels },
      },
    })),

  // Reset all check-in data
  resetCurrentCheckIn: () =>
    set({
      currentCheckIn: {
        mood: "",
        note: "",
        date: "",
        levels: {
          sleepLevel: 5,
          anxietyLevel: 5,
          energyLevel: 5,
          motivationLevel: 5,
          socialInteraction: 5,
          stressLevel: 5,
          focusLevel: 5,
        },
      },
    }),

  setLastSubmission: (payload) => set({ lastSubmission: payload }),
  clearLastSubmission: () => set({ lastSubmission: null }),

  // ========================
  // Mood history analytics
  // ========================
  moodHistoryData: {
    entries: [],
    insights: null,
  },
  moodHistoryLoading: false,
  moodHistoryError: null,

  setMoodHistoryData: (updater) =>
    set((state) => ({
      moodHistoryData:
        typeof updater === "function" ? updater(state.moodHistoryData) : updater,
    })),
  setMoodHistoryLoading: (moodHistoryLoading) => set({ moodHistoryLoading }),
  setMoodHistoryError: (moodHistoryError) => set({ moodHistoryError }),
  clearMoodHistoryError: () => set({ moodHistoryError: null }),

  // ========================
  // Insights data
  // ========================
  insights: null,
  insightsLoading: false,
  insightsError: null,

  setInsights: (insights) => set({ insights }),
  setInsightsLoading: (insightsLoading) => set({ insightsLoading }),
  setInsightsError: (insightsError) => set({ insightsError }),
  clearInsightsError: () => set({ insightsError: null }),
}));