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
import { moodMap } from "../constants/moodMap";
import { buildMoodInsights } from "../services/insightEngine";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDateKey = (dateLike) => {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const num = (v, def = 5) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

const getMoodScore100 = (mood) => {
  const map = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100
  };
  return map[mood?.toLowerCase()] ?? 60;
};

const normalize1to100 = (value) => num(value, 5) * 10;

const calculateMentalHealthScore = (m) => {
  const moodValue = moodMap[m.mood?.toLowerCase()] || 5;
  const sleep = num(m.sleepLevel);
  const energy = num(m.energyLevel);
  const motivation = num(m.motivationLevel);
  const social = num(m.socialInteraction);
  const focus = num(m.focusLevel);
  const anxiety = num(m.anxietyLevel);
  const stress = num(m.stressLevel);

  const positive =
    moodValue * 0.15 +
    sleep * 0.12 +
    energy * 0.1 +
    motivation * 0.1 +
    social * 0.1 +
    focus * 0.08;

  const negative = anxiety * 0.2 + stress * 0.15;
  let score = (positive - negative * 0.5) / 0.75;

  score = Math.max(0, Math.min(10, score));
  return Number(score.toFixed(1));
};

const calculateMentalHealthTrend = (m) => {
  const moodScore = getMoodScore100(m.mood);
  const sleepScore = normalize1to100(m.sleepLevel);
  const energyScore = normalize1to100(m.energyLevel);
  const motivationScore = normalize1to100(m.motivationLevel);
  const socialScore = normalize1to100(m.socialInteraction);
  const focusScore = normalize1to100(m.focusLevel);
  const anxietyScore = 100 - normalize1to100(m.anxietyLevel);
  const stressScore = 100 - normalize1to100(m.stressLevel);

  const weighted =
    sleepScore * 0.2 +
    anxietyScore * 0.2 +
    stressScore * 0.15 +
    energyScore * 0.15 +
    motivationScore * 0.1 +
    focusScore * 0.1 +
    socialScore * 0.1;

  return Number(Math.max(0, Math.min(100, weighted)).toFixed(1));
};

const averageMetric100 = (items, fieldName) => {
  if (!items.length) return 0;
  const values = items.map((item) => {
    const val = num(item[fieldName], 5);
    if (fieldName === "anxietyLevel" || fieldName === "stressLevel") {
      return 100 - val * 10;
    }
    if (fieldName === "mood") {
      return getMoodScore100(item.mood);
    }
    return val * 10;
  });
  const sum = values.reduce((a, b) => a + b, 0);
  return Number((sum / values.length).toFixed(1));
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

const calculateRecoveryScore = (moods) => {
  if (!moods.length) return 0;
  let good = 0;
  let total = 0;

  moods.forEach((m) => {
    if (Number(m.sleepLevel || 0) >= 7) good++;
    total++;
    if (Number(m.anxietyLevel || 0) <= 4) good++;
    total++;
    if (Number(m.energyLevel || 0) >= 6) good++;
    total++;
    if (Number(m.socialInteraction || 0) >= 5) good++;
    total++;
    if (m.mood === "good" || m.mood === "great") good++;
    total++;
    if (Number(m.stressLevel || 0) <= 4) good++;
    total++;
  });

  return Math.round((good / total) * 100);
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