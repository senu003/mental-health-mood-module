import { useCallback, useEffect, useState } from 'react';

import { CURRENT_USER_ID } from '@/config/api';
import { buildHistoryInsights, type HistoryInsights } from '@/services/history-insights';
import { fetchMoodHistory, type MoodEntry } from '@/services/mood-api';

type HistoryState = {
  entries: MoodEntry[];
  insights: HistoryInsights;
  loading: boolean;
  error: string | null;
};

const emptyInsights: HistoryInsights = {
  weeklySummary: {
    averageMoodScore: 0,
    totalCheckIns: 0,
    bestDay: null,
    dailyMoodAverages: [],
  },
  recoveryProgress: {
    overallRecoveryChangePct: 0,
    sleepQualityIncreasePct: 0,
    anxietyLevelDecreasePct: 0,
    stressLevelDecreasePct: 0,
    energyLevelIncreasePct: 0,
    motivationLevelIncreasePct: 0,
    focusLevelIncreasePct: 0,
    socialInteractionIncreasePct: 0,
    currentAverages: {
      overallRecovery: 0,
    },
  },
  moodDistribution: {
    terrible: 0,
    sad: 0,
    okay: 0,
    good: 0,
    great: 0,
  },
};

export const useHistoryData = (userId: string = CURRENT_USER_ID) => {
  const [state, setState] = useState<HistoryState>({
    entries: [],
    insights: emptyInsights,
    loading: true,
    error: null,
  });

  const loadHistory = useCallback(async () => {
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
      const entriesRaw = await fetchMoodHistory(userId);
      const entries = Array.isArray(entriesRaw) ? entriesRaw : [];

      setState({
        entries,
        insights: buildHistoryInsights(entries),
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load mood history',
      }));
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    entries: state.entries,
    insights: state.insights,
    loading: state.loading,
    error: state.error,
    refresh: loadHistory,
  };
};
