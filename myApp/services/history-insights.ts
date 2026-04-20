import type { MoodEntry } from '@/services/mood-api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getMoodValue = (mood?: string) => {
  const map: Record<string, number> = {
    terrible: 2,
    sad: 4,
    okay: 6,
    good: 8,
    great: 10,
  };
  return map[String(mood || '').toLowerCase()] ?? 5;
};

const getMoodScore100 = (mood?: string) => {
  const map: Record<string, number> = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100,
  };
  return map[String(mood || '').toLowerCase()] ?? 60;
};

const toLevel100 = (value: unknown) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 50;
  return clamp(numeric, 1, 10) * 10;
};

const avg = (values: number[]) => {
  if (!values.length) return 0;
  return Number((values.reduce((sum, n) => sum + n, 0) / values.length).toFixed(1));
};

const percentChange = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const formatDate = (dateLike: string | Date) => {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateMentalHealthScore = (entry: MoodEntry) => {
  const mood = getMoodValue(entry.mood);
  const sleep = Number(entry.sleepLevel || 5);
  const energy = Number(entry.energyLevel || 5);
  const motivation = Number(entry.motivationLevel || 5);
  const social = Number(entry.socialInteraction || 5);
  const focus = Number(entry.focusLevel || 5);
  const anxiety = Number(entry.anxietyLevel || 5);
  const stress = Number(entry.stressLevel || 5);

  const positive =
    mood * 0.15 +
    sleep * 0.12 +
    energy * 0.1 +
    motivation * 0.1 +
    social * 0.1 +
    focus * 0.08;
  const negative = anxiety * 0.2 + stress * 0.15;
  const score = clamp((positive - negative * 0.5) / 0.75, 0, 10);

  return Number(score.toFixed(1));
};

const normalizeEntry = (entry: MoodEntry) => {
  const mood = getMoodScore100(entry.mood);
  const sleep = toLevel100(entry.sleepLevel);
  const anxiety = 100 - toLevel100(entry.anxietyLevel);
  const stress = 100 - toLevel100(entry.stressLevel);
  const energy = toLevel100(entry.energyLevel);
  const motivation = toLevel100(entry.motivationLevel);
  const focus = toLevel100(entry.focusLevel);
  const social = toLevel100(entry.socialInteraction);

  const overall =
    mood * 0.2 +
    sleep * 0.15 +
    anxiety * 0.15 +
    stress * 0.15 +
    energy * 0.12 +
    motivation * 0.09 +
    focus * 0.07 +
    social * 0.07;

  return {
    mood,
    sleep,
    anxiety,
    stress,
    energy,
    motivation,
    focus,
    social,
    overall: Number(overall.toFixed(1)),
  };
};

const aggregateMetrics = (entries: MoodEntry[]) => {
  if (!entries.length) {
    return {
      sleep: 0,
      anxiety: 0,
      stress: 0,
      energy: 0,
      motivation: 0,
      focus: 0,
      social: 0,
      overall: 0,
    };
  }

  const normalized = entries.map(normalizeEntry);

  return {
    sleep: avg(normalized.map((item) => item.sleep)),
    anxiety: avg(normalized.map((item) => item.anxiety)),
    stress: avg(normalized.map((item) => item.stress)),
    energy: avg(normalized.map((item) => item.energy)),
    motivation: avg(normalized.map((item) => item.motivation)),
    focus: avg(normalized.map((item) => item.focus)),
    social: avg(normalized.map((item) => item.social)),
    overall: avg(normalized.map((item) => item.overall)),
  };
};

const splitByWeek = (entries: MoodEntry[], now = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - 6);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(currentStart.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

  const currentWeek = entries.filter((entry) => {
    const d = new Date(entry.createdAt || '');
    return d >= currentStart && d <= new Date(today.getTime() + 86400000 - 1);
  });

  const previousWeek = entries.filter((entry) => {
    const d = new Date(entry.createdAt || '');
    return d >= previousStart && d <= previousEnd;
  });

  return { currentStart, currentWeek, previousWeek };
};

const buildDailyMoodAverages = (currentStart: Date, currentWeek: MoodEntry[]) => {
  const grouped: Record<string, MoodEntry[]> = {};
  currentWeek.forEach((entry) => {
    const key = formatDate(entry.createdAt || new Date());
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });

  return Array.from({ length: 7 }).map((_, index) => {
    const dayDate = new Date(currentStart);
    dayDate.setDate(currentStart.getDate() + index);
    const key = formatDate(dayDate);
    const items = grouped[key] || [];

    return {
      day: DAYS[dayDate.getDay()],
      date: key,
      averageMoodScore: items.length ? avg(items.map((entry) => calculateMentalHealthScore(entry))) : 0,
      entries: items.length,
    };
  });
};

const buildMoodDistribution = (entries: MoodEntry[]) => {
  const distribution = { terrible: 0, sad: 0, okay: 0, good: 0, great: 0 };

  entries.forEach((entry) => {
    const key = String(entry.mood || '').toLowerCase();
    if (key in distribution) {
      distribution[key as keyof typeof distribution] += 1;
    }
  });

  return distribution;
};

export type HistoryInsights = {
  weeklySummary: {
    averageMoodScore: number;
    totalCheckIns: number;
    bestDay: { day: string; date: string; averageMoodScore: number; entries: number } | null;
    dailyMoodAverages: Array<{ day: string; date: string; averageMoodScore: number; entries: number }>;
  };
  recoveryProgress: {
    overallRecoveryChangePct: number;
    sleepQualityIncreasePct: number;
    anxietyLevelDecreasePct: number;
    stressLevelDecreasePct: number;
    energyLevelIncreasePct: number;
    motivationLevelIncreasePct: number;
    focusLevelIncreasePct: number;
    socialInteractionIncreasePct: number;
    currentAverages: {
      overallRecovery: number;
    };
  };
  moodDistribution: {
    terrible: number;
    sad: number;
    okay: number;
    good: number;
    great: number;
  };
};

export const buildHistoryInsights = (entries: MoodEntry[]): HistoryInsights => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const { currentStart, currentWeek, previousWeek } = splitByWeek(safeEntries);

  const currentMetrics = aggregateMetrics(currentWeek);
  const previousMetrics = aggregateMetrics(previousWeek);
  const dailyMoodAverages = buildDailyMoodAverages(currentStart, currentWeek);

  const bestDay =
    dailyMoodAverages
      .filter((day) => day.entries > 0)
      .sort((a, b) => b.averageMoodScore - a.averageMoodScore)[0] || null;

  return {
    weeklySummary: {
      averageMoodScore: avg(dailyMoodAverages.filter((day) => day.entries > 0).map((day) => day.averageMoodScore)),
      totalCheckIns: currentWeek.length,
      bestDay,
      dailyMoodAverages,
    },
    recoveryProgress: {
      overallRecoveryChangePct: percentChange(currentMetrics.overall, previousMetrics.overall),
      sleepQualityIncreasePct: percentChange(currentMetrics.sleep, previousMetrics.sleep),
      anxietyLevelDecreasePct: percentChange(currentMetrics.anxiety, previousMetrics.anxiety),
      stressLevelDecreasePct: percentChange(currentMetrics.stress, previousMetrics.stress),
      energyLevelIncreasePct: percentChange(currentMetrics.energy, previousMetrics.energy),
      motivationLevelIncreasePct: percentChange(currentMetrics.motivation, previousMetrics.motivation),
      focusLevelIncreasePct: percentChange(currentMetrics.focus, previousMetrics.focus),
      socialInteractionIncreasePct: percentChange(currentMetrics.social, previousMetrics.social),
      currentAverages: {
        overallRecovery: currentMetrics.overall,
      },
    },
    moodDistribution: buildMoodDistribution(currentWeek),
  };
};

export const calculateDailyAverage = (entries: MoodEntry[]) => {
  if (!entries.length) return 0;
  return avg(entries.map((entry) => calculateMentalHealthScore(entry)));
};

export const calculateSevenDayAverage = (entries: MoodEntry[]) => {
  if (!entries.length) return 0;
  return avg(entries.map((entry) => calculateMentalHealthScore(entry)));
};

export const getDateKey = (dateLike: string | Date) => formatDate(dateLike);
