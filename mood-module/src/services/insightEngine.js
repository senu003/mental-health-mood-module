import {
  getMoodValue,
  getMoodScore100,
  formatDate,
  normalize1to100,
  calculateMentalHealthScore,
} from "../utils/scoreEngine";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MOOD_SCORE_100 = {
  terrible: 20,
  sad: 40,
  okay: 60,
  good: 80,
  great: 100,
};

const FACTOR_META = {
  sleep: {
    label: "Sleep",
    researchBasis: "Sleep quality has a strong bidirectional relationship with mood regulation and emotional resilience.",
    worsenedInsight: "Reduced sleep quality is strongly linked to lower mood and energy levels.",
    positiveInsight: "Improved sleep quality is supporting better mood regulation and energy.",
    threshold: 60,
    recommendation:
      "Aim for consistent sleep by maintaining a regular bedtime and reducing screen use before sleep.",
  },
  stress: {
    label: "Stress",
    researchBasis: "Chronic stress elevates emotional load and is associated with depressed mood and irritability.",
    worsenedInsight:
      "Increased stress levels are contributing to emotional strain and mood decline.",
    positiveInsight: "Lower stress levels are helping emotional balance and resilience.",
    threshold: 60,
    recommendation:
      "Try stress management techniques such as deep breathing, short breaks, or light physical activity.",
  },
  anxiety: {
    label: "Anxiety",
    researchBasis: "Higher anxiety is associated with emotional instability, cognitive overload, and reduced concentration.",
    worsenedInsight: "Higher anxiety levels may be affecting emotional stability and focus.",
    positiveInsight: "Lower anxiety levels are helping emotional stability and concentration.",
    threshold: 60,
    recommendation: "Practice mindfulness or grounding techniques to manage anxiety.",
  },
  energy: {
    label: "Energy",
    researchBasis: "Low energy often co-occurs with reduced positive affect, motivation, and daily functioning.",
    worsenedInsight: "Lower energy levels are associated with reduced motivation and mood.",
    positiveInsight: "Higher energy levels are supporting motivation and mood.",
    threshold: 60,
    recommendation:
      "Engage in light exercise and maintain proper hydration to improve energy levels.",
  },
  motivation: {
    label: "Motivation",
    researchBasis: "Lower motivation is linked to reduced behavioral activation and lower perceived wellbeing.",
    worsenedInsight: "Decreased motivation can make daily activities feel more difficult.",
    positiveInsight: "Improved motivation can make routines and goals feel more manageable.",
  },
  focus: {
    label: "Focus",
    researchBasis: "Attention and executive control are closely tied to stress load and emotional state.",
    worsenedInsight: "Lower focus may be impacting productivity and mood.",
    positiveInsight: "Improved focus supports productivity and a more stable mood.",
    threshold: 60,
    recommendation: "Break tasks into smaller steps and reduce distractions to improve focus.",
  },
  social: {
    label: "Social",
    researchBasis: "Social connectedness is a protective factor for mood and psychological wellbeing.",
    worsenedInsight: "Reduced social interaction may be impacting emotional well-being.",
    positiveInsight: "Stronger social interaction supports emotional well-being.",
    threshold: 50,
    recommendation: "Increase social interaction, even small conversations can improve mood.",
  },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toLevel100 = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 50;
  return clamp(n, 1, 10) * 10;
};

const invert100 = (value) => 100 - value;

// Use centralized getMoodScore100 from scoreEngine instead
const toMood100 = getMoodScore100;

// formatDate is imported from scoreEngine

const average = (values) => {
  if (!values.length) return 0;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
};

const percentChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getTrendFromChange = (change, threshold = 3) => {
  if (change > threshold) return "improved";
  if (change < -threshold) return "declined";
  return "stable";
};

// Use centralized getMoodValue from scoreEngine instead
const moodValue10 = getMoodValue;

// Use centralized calculateMentalHealthScore from scoreEngine instead
const mentalScore10 = calculateMentalHealthScore;

const normalizeEntry = (entry) => {
  const sleep = toLevel100(entry.sleepLevel);
  const anxietyRaw = toLevel100(entry.anxietyLevel);
  const stressRaw = toLevel100(entry.stressLevel);
  const energy = toLevel100(entry.energyLevel);
  const motivation = toLevel100(entry.motivationLevel);
  const focus = toLevel100(entry.focusLevel);
  const social = toLevel100(entry.socialInteraction);
  const mood = toMood100(entry.mood);

  const anxiety = invert100(anxietyRaw);
  const stress = invert100(stressRaw);

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

const splitByPeriod = (entries, now = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - 6);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(currentStart.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

  const currentWeek = entries.filter((item) => {
    const d = new Date(item.createdAt);
    return d >= currentStart && d <= new Date(today.getTime() + 86400000 - 1);
  });

  const previousWeek = entries.filter((item) => {
    const d = new Date(item.createdAt);
    return d >= previousStart && d <= previousEnd;
  });

  return { today, currentStart, previousStart, previousEnd, currentWeek, previousWeek };
};

const aggregateMetrics = (entries) => {
  if (!entries.length) {
    return {
      mood: 0,
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
  const fields = ["mood", "sleep", "anxiety", "stress", "energy", "motivation", "focus", "social", "overall"];

  const result = {};
  fields.forEach((field) => {
    result[field] = average(normalized.map((item) => item[field]));
  });

  return result;
};

const buildDailyTrend = (currentStart, currentWeek) => {
  const grouped = {};
  currentWeek.forEach((entry) => {
    const key = formatDate(entry.createdAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });

  return Array.from({ length: 7 }).map((_, index) => {
    const dayDate = new Date(currentStart);
    dayDate.setDate(currentStart.getDate() + index);
    const key = formatDate(dayDate);
    const items = grouped[key] || [];

    if (!items.length) {
      return {
        day: DAYS[dayDate.getDay()],
        date: key,
        score: 0,
        averageMoodScore: 0,
        entries: 0,
      };
    }

    const score = average(items.map((entry) => normalizeEntry(entry).overall));
    const averageMoodScore = average(items.map((entry) => mentalScore10(entry)));

    return {
      day: DAYS[dayDate.getDay()],
      date: key,
      score,
      averageMoodScore,
      entries: items.length,
    };
  });
};

const buildMoodDistribution = (entries) => {
  const distribution = { terrible: 0, sad: 0, okay: 0, good: 0, great: 0 };
  entries.forEach((item) => {
    const key = String(item.mood || "").toLowerCase();
    if (key in distribution) distribution[key] += 1;
  });
  return distribution;
};

const buildFactorImpacts = (metricChanges, overallMoodChange) => {
  const factors = Object.keys(FACTOR_META).map((key) => {
    const change = metricChanges[key] || 0;
    const impactScore = Number((change * overallMoodChange).toFixed(2));
    return {
      key,
      name: FACTOR_META[key].label,
      change,
      impactScore,
      absoluteImpact: Math.abs(impactScore),
    };
  });

  return factors.sort((a, b) => b.absoluteImpact - a.absoluteImpact).slice(0, 3);
};

const buildFactorInsights = (topFactors) => {
  return topFactors.map((factor) => {
    const meta = FACTOR_META[factor.key];
    const direction = factor.change < 0 ? "worsened" : factor.change > 0 ? "improved" : "stable";
    const message =
      direction === "worsened"
        ? meta.worsenedInsight
        : direction === "improved"
        ? meta.positiveInsight
        : `${meta.label} remained stable this week.`;

    return {
      factor: factor.name,
      change: factor.change,
      impactScore: factor.impactScore,
      direction,
      message,
      researchBasis: meta.researchBasis,
    };
  });
};

const buildRecommendations = (currentMetrics) => {
  const recommendations = [];

  Object.keys(FACTOR_META).forEach((key) => {
    const meta = FACTOR_META[key];
    const value = Number(currentMetrics[key] || 0);
    if (typeof meta.threshold === "number" && meta.recommendation && value < meta.threshold) {
      recommendations.push(meta.recommendation);
    }
  });

  if (!recommendations.length) {
    recommendations.push("Your key well-being metrics are stable this week. Continue your current healthy routine.");
  }

  return recommendations;
};

export const buildMoodInsights = (entries = [], options = {}) => {
  const now = options.now ? new Date(options.now) : new Date();
  const safeEntries = Array.isArray(entries) ? entries : [];

  const { today, currentStart, previousStart, previousEnd, currentWeek, previousWeek } = splitByPeriod(
    safeEntries,
    now
  );

  const currentMetrics = aggregateMetrics(currentWeek);
  const previousMetrics = aggregateMetrics(previousWeek);

  const metricChanges = {
    sleep: percentChange(currentMetrics.sleep, previousMetrics.sleep),
    stress: percentChange(currentMetrics.stress, previousMetrics.stress),
    anxiety: percentChange(currentMetrics.anxiety, previousMetrics.anxiety),
    energy: percentChange(currentMetrics.energy, previousMetrics.energy),
    motivation: percentChange(currentMetrics.motivation, previousMetrics.motivation),
    focus: percentChange(currentMetrics.focus, previousMetrics.focus),
    social: percentChange(currentMetrics.social, previousMetrics.social),
  };

  const overallMoodChange = percentChange(currentMetrics.overall, previousMetrics.overall);
  const overallMoodTrend = getTrendFromChange(overallMoodChange);

  const topFactors = buildFactorImpacts(metricChanges, overallMoodChange);
  const factorInsights = buildFactorInsights(topFactors);
  const recommendations = buildRecommendations(currentMetrics);

  const dailyTrend = buildDailyTrend(currentStart, currentWeek);
  const bestDayRaw = dailyTrend
    .filter((day) => day.entries > 0)
    .sort((a, b) => b.score - a.score)[0] || null;

  const bestDay = bestDayRaw
    ? {
        day: bestDayRaw.day,
        date: bestDayRaw.date,
        score: bestDayRaw.score,
      }
    : { day: "", date: "", score: 0 };

  const moodDistribution = buildMoodDistribution(currentWeek);

  const summaryText =
    overallMoodTrend === "improved"
      ? "Your mental health trend improved this week compared to the previous week."
      : overallMoodTrend === "declined"
      ? "Your mental health trend declined this week compared to the previous week."
      : "Your mental health trend remained stable this week.";

  return {
    generatedAt: now.toISOString(),
    period: {
      currentStart: currentStart.toISOString(),
      currentEnd: today.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    },
    summaryText,
    overallMoodTrend,
    moodChange: overallMoodChange,
    factorInsights,
    recommendations,
    metrics: {
      sleep: currentMetrics.sleep,
      stress: currentMetrics.stress,
      anxiety: currentMetrics.anxiety,
      energy: currentMetrics.energy,
      motivation: currentMetrics.motivation,
      focus: currentMetrics.focus,
      social: currentMetrics.social,
      overall: currentMetrics.overall,
    },
    metricChanges,
    topFactors,
    dailyTrend,
    bestDay,
    moodDistribution,

    // Compatibility fields for existing app modules.
    weeklySummary: {
      averageMoodScore: average(dailyTrend.filter((d) => d.entries > 0).map((d) => d.averageMoodScore)),
      totalCheckIns: currentWeek.length,
      bestDay: bestDayRaw
        ? {
            day: bestDayRaw.day,
            date: bestDayRaw.date,
            averageMoodScore: bestDayRaw.averageMoodScore,
            entries: bestDayRaw.entries,
          }
        : null,
      dailyMoodAverages: dailyTrend.map((d) => ({
        day: d.day,
        date: d.date,
        averageMoodScore: d.averageMoodScore,
        entries: d.entries,
      })),
    },
    recoveryProgress: {
      overallRecoveryScore: currentMetrics.overall,
      overallRecoveryChangePct: overallMoodChange,
      sleepQualityIncreasePct: metricChanges.sleep,
      anxietyLevelDecreasePct: metricChanges.anxiety,
      stressLevelDecreasePct: metricChanges.stress,
      energyLevelIncreasePct: metricChanges.energy,
      motivationLevelIncreasePct: metricChanges.motivation,
      focusLevelIncreasePct: metricChanges.focus,
      socialInteractionIncreasePct: metricChanges.social,
      currentAverages: {
        overallRecovery: currentMetrics.overall,
        sleepLevel: currentMetrics.sleep,
        anxietyLevel: currentMetrics.anxiety,
        stressLevel: currentMetrics.stress,
        energyLevel: currentMetrics.energy,
        motivationLevel: currentMetrics.motivation,
        focusLevel: currentMetrics.focus,
        socialInteraction: currentMetrics.social,
      },
      previousAverages: {
        overallRecovery: previousMetrics.overall,
        sleepLevel: previousMetrics.sleep,
        anxietyLevel: previousMetrics.anxiety,
        stressLevel: previousMetrics.stress,
        energyLevel: previousMetrics.energy,
        motivationLevel: previousMetrics.motivation,
        focusLevel: previousMetrics.focus,
        socialInteraction: previousMetrics.social,
      },
    },
  };
};
