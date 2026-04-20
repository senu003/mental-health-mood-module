import { useCallback, useEffect, useState } from 'react';

import { CURRENT_USER_ID } from '@/config/api';
import {
  fetchDashboardStats,
  fetchWeeklyMood,
  type DashboardStats,
  type WeeklyMoodPoint,
} from '@/services/mood-api';

type DashboardState = {
  stats: DashboardStats;
  weeklyMood: WeeklyMoodPoint[];
  loading: boolean;
  error: string | null;
};

const defaultStats: DashboardStats = {
  sevenDayAverage: 0,
  checkInStreak: 0,
  recoveryScore: 0,
};

export const useDashboardData = (userId: string = CURRENT_USER_ID) => {
  const [state, setState] = useState<DashboardState>({
    stats: defaultStats,
    weeklyMood: [],
    loading: true,
    error: null,
  });

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setState((current) => ({
        ...current,
        loading: false,
        error: 'User is not configured. Please set EXPO_PUBLIC_USER_ID.',
      }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const [stats, weeklyMood] = await Promise.all([fetchDashboardStats(userId), fetchWeeklyMood(userId)]);

      setState({
        stats: {
          sevenDayAverage: Number(stats?.sevenDayAverage || 0),
          checkInStreak: Number(stats?.checkInStreak || 0),
          recoveryScore: Number(stats?.recoveryScore || 0),
        },
        weeklyMood: Array.isArray(weeklyMood) ? weeklyMood : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load dashboard data',
      }));
    }
  }, [userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    stats: state.stats,
    weeklyMood: state.weeklyMood,
    loading: state.loading,
    error: state.error,
    refresh: loadDashboard,
  };
};
