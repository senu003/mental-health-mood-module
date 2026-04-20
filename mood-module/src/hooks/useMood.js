import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMoodStore } from "../store/moodStore";
import {
  fetchDashboardStats,
  fetchWeeklyData,
  createCheckIn,
  fetchMoodHistory,
  fetchWeeklyInsights,
  fetchInsights,
} from "../api/moodApi";
import { handleError } from "../utils/errorHandler";
import { getCurrentUserId } from "../config";
import { buildMoodInsights } from "../services/insightEngine";
import {
  calculateMentalHealthScore,
  calculateMentalHealthTrend,
  averageMetric100,
  calculateRecoveryScore,
  formatDate,
} from "../utils/scoreEngine";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDateKey = (dateLike) => formatDate(dateLike);

const num = (v, def = 5) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

const avg = (items, field) => {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + Number(item?.[field] || 0), 0);
  return Number((total / items.length).toFixed(2));
};

const percentChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const percentDecrease = (current, previous) => {
  if (!previous) return 0;
  return Number((((previous - current) / previous) * 100).toFixed(1));
};

export const buildInsightsFromHistory = (entries) => buildMoodInsights(entries);

export const useInsightsData = (userId = getCurrentUserId()) => {
  const {
    insights,
    insightsLoading,
    insightsError,
    setInsights,
    setInsightsLoading,
    setInsightsError,
  } = useMoodStore();

  const fetchData = useCallback(async () => {
    try {
      setInsightsLoading(true);
      setInsightsError(null);

      const apiInsights = await fetchInsights(userId);
      setInsights(apiInsights || null);
    } catch (err) {
      try {
        const historyEntriesRaw = await fetchMoodHistory(userId);
        const historyEntries = Array.isArray(historyEntriesRaw) ? historyEntriesRaw : [];
        const fallbackInsights = buildInsightsFromHistory(historyEntries);
        setInsights(fallbackInsights || null);
      } catch {
        setInsightsError(handleError(err, "useInsightsData.fetchData"));
      }
    } finally {
      setInsightsLoading(false);
    }
  }, [userId, setInsights, setInsightsLoading, setInsightsError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    insights,
    insightsLoading,
    insightsError,
    fetchData,
  };
};

// Hook for dashboard data
export const useDashboardData = (userId = getCurrentUserId()) => {
  const {
    dashboardData,
    loading,
    error,
    setDashboardData,
    setLoading,
    setError
  } = useMoodStore();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, weeklyData] = await Promise.all([
        fetchDashboardStats(userId),
        fetchWeeklyData(userId)
      ]);

      const avg = Number(statsData?.sevenDayAverage || 0);

      setDashboardData({
        sevenDayAverage: Number.isNaN(avg) ? "0" : avg.toFixed(1),
        checkInStreak: statsData?.checkInStreak || 0,
        recoveryScore: statsData?.recoveryScore || 0,
        weeklyData: Array.isArray(weeklyData) ? weeklyData : []
      });

    } catch (err) {
      setError(handleError(err, "useDashboardData.fetchData"));
    } finally {
      setLoading(false);
    }
  }, [userId, setDashboardData, setLoading, setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dashboardData, loading, error, fetchData, setDashboardData };
};

// Hook for check-in flow
export const useCheckIn = () => {
  const navigate = useNavigate();
  const {
    currentCheckIn,
    dashboardData,
    setDashboardData,
    setCurrentCheckIn,
    resetCurrentCheckIn,
    setLastSubmission,
  } = useMoodStore();

  const startCheckIn = useCallback(() => {
    resetCurrentCheckIn(); // reset previous check-in
    navigate("/check-in");
  }, [navigate, resetCurrentCheckIn]);

  const updateCheckIn = useCallback((stepData) => {
    setCurrentCheckIn(prev => ({ ...prev, ...stepData }));
  }, [setCurrentCheckIn]);

  const submitCheckIn = useCallback(async () => {
    try {
      const payload = {
        userId: getCurrentUserId(),
        mood: currentCheckIn?.mood || "",
        note: currentCheckIn?.note || "",
        ...currentCheckIn?.levels,
      };

      const response = await createCheckIn(payload);
      setLastSubmission(response || null);

      if (typeof response?.checkInStreak === "number") {
        setDashboardData({
          ...dashboardData,
          checkInStreak: response.checkInStreak,
        });
      }

      navigate("/check-in/summary", {
        state: {
          checkInSuccess: true,
          mentalHealthScore: response?.mentalHealthScore,
          checkInStreak: response?.checkInStreak,
          isFirstCheckInToday: response?.isFirstCheckInToday,
        },
      });
    } catch (err) {
      throw new Error(handleError(err, "useCheckIn.submitCheckIn"));
    }
  }, [
    currentCheckIn,
    dashboardData,
    navigate,
    setDashboardData,
    setLastSubmission,
  ]);

  return { currentCheckIn, startCheckIn, updateCheckIn, submitCheckIn };
};

// Hook for mood history + weekly insight charts
export const useMoodHistoryData = (userId = getCurrentUserId()) => {
  const {
    moodHistoryData,
    moodHistoryLoading,
    moodHistoryError,
    setMoodHistoryData,
    setMoodHistoryLoading,
    setMoodHistoryError,
  } = useMoodStore();

  const fetchData = useCallback(async () => {
    try {
      setMoodHistoryLoading(true);
      setMoodHistoryError(null);

      const historyEntriesRaw = await fetchMoodHistory(userId);
      const historyEntries = Array.isArray(historyEntriesRaw) ? historyEntriesRaw : [];

      let insights = buildInsightsFromHistory(historyEntries);

      if (import.meta.env.VITE_USE_INSIGHTS_ENDPOINT === "true") {
        try {
          const apiInsights = await fetchWeeklyInsights(userId);
          if (apiInsights) insights = apiInsights;
        } catch {
          // Keep local derived insights when backend endpoint is unavailable.
        }
      }

      setMoodHistoryData({
        entries: historyEntries,
        insights: insights || null,
      });
    } catch (err) {
      setMoodHistoryError(handleError(err, "useMoodHistoryData.fetchData"));
    } finally {
      setMoodHistoryLoading(false);
    }
  }, [userId, setMoodHistoryData, setMoodHistoryLoading, setMoodHistoryError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    moodHistoryData,
    moodHistoryLoading,
    moodHistoryError,
    fetchData,
  };
};