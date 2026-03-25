// mood-backend/services/moodService.js

import Mood from "../models/mood.js";
import Insight from "../models/insight.js";
import { buildMoodInsights } from "../utils/insightEngine.js";
import {
  calculateMentalHealthScore,
  calculateRecoveryScore,
  calculateCheckInStreak,
  calculateSevenDayAverage,
  formatDate,
} from "../utils/scoreEngine.js";

const hasEnhancedInsightShape = (insight) => {
  if (!insight || typeof insight !== "object") return false;

  const hasSummary = typeof insight.summaryText === "string" || typeof insight.summary === "string";
  const hasTrend =
    typeof insight.overallMoodTrend === "string" ||
    typeof insight.moodTrend === "string" ||
    typeof insight.overallTrend === "string";

  return (
    hasSummary &&
    hasTrend &&
    Array.isArray(insight.factorInsights) &&
    Array.isArray(insight.recommendations) &&
    Array.isArray(insight.dailyTrend) &&
    insight.metrics &&
    typeof insight.metrics === "object" &&
    Array.isArray(insight.patterns) &&
    typeof insight.confidenceLevel === "string" &&
    insight.bestDay &&
    typeof insight.bestDay === "object"
  );
};

// ================================
// SAVE MOOD
// ================================
export const createMoodEntry = async (data) => {
  const mood = new Mood(data);
  const saved = await mood.save();

  const mentalHealthScore = calculateMentalHealthScore(saved);

  return { saved, mentalHealthScore };
};

// ================================
// DASHBOARD STATS
// ================================
export const getDashboardStats = async (userId) => {
  const moods = await Mood.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  if (!moods.length) {
    return {
      sevenDayAverage: 0,
      checkInStreak: 0,
      recoveryScore: 0
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get moods from last 7 days (inclusive)
  const last7Days = new Date(today.getTime() - 6 * 86400000);
  const moodsLast7Days = moods.filter((m) => {
    const d = new Date(m.createdAt);
    return d >= last7Days && d <= new Date(today.getTime() + 86400000 - 1);
  });

  // Calculate metrics using scoreEngine functions
  const sevenDayAverage = calculateSevenDayAverage(moodsLast7Days);
  const checkInStreak = calculateCheckInStreak(moods);
  const recoveryScore = calculateRecoveryScore(moodsLast7Days);

  return {
    sevenDayAverage,
    checkInStreak,
    recoveryScore
  };
};

// ================================
// WEEKLY CHART
// ================================
export const getWeeklyChart = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(today.getDate() - 6);

  const moods = await Mood.find({
    userId,
    createdAt: {
      $gte: sixDaysAgo,
      $lte: new Date(today.getTime() + 86400000 - 1)
    }
  }).lean();

  // Group by day
  const grouped = {};
  moods.forEach((m) => {
    const date = formatDate(m.createdAt);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(m);
  });

  // Build result array (7 days)
  const result = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sixDaysAgo);
    d.setDate(sixDaysAgo.getDate() + i);

    const dateStr = formatDate(d);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const displayDate = `${days[d.getDay()]} ${month}-${day}`;

    if (grouped[dateStr]) {
      const entries = grouped[dateStr];
      const total = entries.reduce((sum, m) => sum + calculateMentalHealthScore(m), 0);
      const avg = total / entries.length;

      result.push({
        day: days[d.getDay()],
        displayDate,
        fullDate: dateStr,
        value: Number(avg.toFixed(1)),
        hasData: true,
        entries: entries.length
      });
    } else {
      result.push({
        day: days[d.getDay()],
        displayDate,
        fullDate: dateStr,
        value: 0,
        hasData: false,
        entries: 0
      });
    }
  }

  return result;
};

// ================================
// HISTORY
// ================================
export const getMoodHistory = async (userId) => {
  const moods = await Mood.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return {
    success: true,
    count: moods.length,
    data: moods
  };
};

// ================================
// WEEKLY INSIGHTS (CURRENT VS PREVIOUS 7 DAYS)
// ================================
export const getWeeklyInsights = async (userId) => {
  const [existingInsight, latestEntry, entryCount] = await Promise.all([
    Insight.findOne({ userId }).lean(),
    Mood.findOne({ userId }).sort({ createdAt: -1 }).select({ createdAt: 1 }).lean(),
    Mood.countDocuments({ userId }),
  ]);

  const latestCreatedAt = latestEntry?.createdAt ? new Date(latestEntry.createdAt) : null;

  if (
    existingInsight &&
    hasEnhancedInsightShape(existingInsight) &&
    existingInsight.sourceEntryCount === entryCount &&
    ((existingInsight.sourceLastEntryAt === null && latestCreatedAt === null) ||
      (existingInsight.sourceLastEntryAt && latestCreatedAt &&
        new Date(existingInsight.sourceLastEntryAt).getTime() === latestCreatedAt.getTime()))
  ) {
    return existingInsight;
  }

  const now = new Date();
  const startWindow = new Date(now);
  startWindow.setDate(now.getDate() - 13);
  startWindow.setHours(0, 0, 0, 0);

  const periodEntries = await Mood.find({
    userId,
    createdAt: {
      $gte: startWindow,
      $lte: now,
    },
  })
    .sort({ createdAt: -1 })
    .lean();

  const computed = buildMoodInsights(periodEntries, { now });
  const payload = {
    ...computed,
    summary: computed.summary,
    overallTrend: computed.overallTrend,
    overallChange: computed.overallChange,
    summaryText: computed.summary,
    overallMoodTrend: computed.overallTrend,
    moodTrend: computed.overallTrend,
    moodChange: computed.overallChange,
    userId,
    lastGeneratedDate: formatDate(now),
    sourceEntryCount: entryCount,
    sourceLastEntryAt: latestCreatedAt,
  };

  const savedInsight = await Insight.findOneAndUpdate(
    { userId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return savedInsight;
};