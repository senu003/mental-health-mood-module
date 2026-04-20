import { formatDate } from "./scoreEngine.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const POSITIVE_FACTORS = ["mood", "sleep", "energy", "motivation", "focus", "social"];
const NEGATIVE_FACTORS = ["anxiety", "stress"];

const WEIGHTS = {
  mood: 0.2,
  sleep: 0.15,
  anxiety: 0.15,
  stress: 0.15,
  energy: 0.12,
  motivation: 0.1,
  focus: 0.08,
  social: 0.05,
};

const FACTOR_LABELS = {
  mood: "Mood",
  sleep: "Sleep",
  anxiety: "Anxiety",
  stress: "Stress",
  energy: "Energy",
  motivation: "Motivation",
  focus: "Focus",
  social: "Social Connection",
};

const FACTOR_RULE_ORDER = ["sleep", "energy", "motivation", "social", "focus", "stress", "anxiety"];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const round1 = (value) => Number((value || 0).toFixed(1));

const round2 = (value) => Number((value || 0).toFixed(2));

const toMood100 = (moodValue) => {
  if (typeof moodValue === "number" && !Number.isNaN(moodValue)) {
    return clamp(moodValue, 1, 5) * 20;
  }

  const moodMap = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100,
  };

  return moodMap[String(moodValue || "").toLowerCase()] || 60;
};

const toLevel100 = (value, min = 0, max = 10) => {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return clamp(n, min, max) * 10;
};

const average = (values) => {
  const valid = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!valid.length) return null;
  return round1(valid.reduce((sum, v) => sum + v, 0) / valid.length);
};

const percentChange = (current, previous) => {
  if (previous === null || previous === 0 || typeof previous !== "number") return 0;
  return round1(((current - previous) / previous) * 100);
};

const averageBy = (items, selector) => {
  const values = items
    .map(selector)
    .filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!values.length) return null;
  return round1(values.reduce((sum, v) => sum + v, 0) / values.length);
};

const toMood5 = (moodValue) => {
  if (typeof moodValue === "number" && !Number.isNaN(moodValue)) {
    return clamp(Math.round(moodValue), 1, 5);
  }

  const moodMap = {
    terrible: 1,
    sad: 2,
    okay: 3,
    good: 4,
    great: 5,
  };

  return moodMap[String(moodValue || "").toLowerCase()] || 3;
};

const getOverallTrend = (changePct) => {
  if (changePct > 5) return "improving";
  if (changePct < -5) return "declining";
  return "stable";
};

const getConfidenceLevel = (entryCount) => {
  if (entryCount >= 5) return "High";
  if (entryCount >= 3) return "Medium";
  return "Low";
};

const normalizeEntry = (entry) => {
  const mood = toMood100(entry.mood);
  const sleepRaw = toLevel100(entry.sleepLevel ?? entry.sleep);
  const anxietyRaw = toLevel100(entry.anxietyLevel ?? entry.anxiety);
  const stressRaw = toLevel100(entry.stressLevel ?? entry.stress);
  const energyRaw = toLevel100(entry.energyLevel ?? entry.energy);
  const motivationRaw = toLevel100(entry.motivationLevel ?? entry.motivation);
  const focusRaw = toLevel100(entry.focusLevel ?? entry.focus);
  const socialRaw = toLevel100(entry.socialInteraction ?? entry.social);

  const sleep = sleepRaw ?? 50;
  const anxiety = anxietyRaw === null ? 50 : 100 - anxietyRaw;
  const stress = stressRaw === null ? 50 : 100 - stressRaw;
  const energy = energyRaw ?? 50;
  const motivation = motivationRaw ?? 50;
  const focus = focusRaw ?? 50;
  const social = socialRaw ?? 50;

  const wellbeing =
    mood * WEIGHTS.mood +
    sleep * WEIGHTS.sleep +
    anxiety * WEIGHTS.anxiety +
    stress * WEIGHTS.stress +
    energy * WEIGHTS.energy +
    motivation * WEIGHTS.motivation +
    focus * WEIGHTS.focus +
    social * WEIGHTS.social;

  return {
    mood,
    sleep,
    anxiety,
    stress,
    energy,
    motivation,
    focus,
    social,
    overall: round1(wellbeing),

    // Keep raw values for pattern detection rules where higher anxiety/stress means risk.
    raw: {
      sleep: sleepRaw,
      anxiety: anxietyRaw,
      stress: stressRaw,
      energy: energyRaw,
      motivation: motivationRaw,
      focus: focusRaw,
      social: socialRaw,
    },
  };
};

const splitByPeriod = (entries, now = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - 6);

  const currentEnd = new Date(today.getTime() + 86400000 - 1);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(currentStart.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

  const currentWeek = entries.filter((item) => {
    const d = new Date(item.createdAt);
    return d >= currentStart && d <= currentEnd;
  });

  const previousWeek = entries.filter((item) => {
    const d = new Date(item.createdAt);
    return d >= previousStart && d <= previousEnd;
  });

  return { today, currentStart, currentEnd, previousStart, previousEnd, currentWeek, previousWeek };
};

const aggregateMetrics = (entries) => {
  const normalized = entries.map(normalizeEntry);
  const fields = ["mood", "sleep", "anxiety", "stress", "energy", "motivation", "focus", "social", "overall"];

  const averages = {};
  fields.forEach((field) => {
    averages[field] = average(normalized.map((item) => item[field]));
  });

  return {
    ...averages,
    normalized,
  };
};

const buildDailyTrend = (weekStart, entries) => {
  const grouped = {};
  entries.forEach((entry) => {
    const key = formatDate(entry.createdAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(normalizeEntry(entry));
  });

  return Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateKey = formatDate(date);
    const items = grouped[dateKey] || [];

    return {
      day: DAYS[date.getDay()],
      date: dateKey,
      score: items.length ? average(items.map((item) => item.overall)) : null,
      entries: items.length,
    };
  });
};

const buildMoodDistribution = (entries) => {
  const buckets = { terrible: 0, sad: 0, okay: 0, good: 0, great: 0 };
  entries.forEach((entry) => {
    if (typeof entry.mood === "number") {
      const numeric = clamp(entry.mood, 1, 5);
      const key = ["terrible", "sad", "okay", "good", "great"][numeric - 1];
      buckets[key] += 1;
      return;
    }

    const key = String(entry.mood || "").toLowerCase();
    if (key in buckets) buckets[key] += 1;
  });

  const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);
  return {
    ...buckets,
    total,
  };
};

const buildFactorImpactInsights = (currentMetrics, previousMetrics, overallChange) => {
  const factorKeys = ["mood", ...FACTOR_RULE_ORDER];

  const ranked = factorKeys
    .map((key) => {
      const factorChangePct = percentChange(currentMetrics[key] ?? 0, previousMetrics[key] ?? 0);
      const isNegativeFactor = NEGATIVE_FACTORS.includes(key);

      // Rule 4 (simple deterministic version): positive factors keep sign, negative factors invert sign.
      const signedImpact = isNegativeFactor ? -factorChangePct : factorChangePct;
      const moodLinkedImpact = round1((factorChangePct * overallChange) / 100);
      const direction = signedImpact < 0 ? "negative" : signedImpact > 0 ? "positive" : "neutral";

      return {
        factor: key,
        label: FACTOR_LABELS[key],
        factorChangePct,
        impactScore: round1(signedImpact),
        moodLinkedImpact,
        absoluteImpact: Math.abs(signedImpact),
        direction,
      };
    })
    .sort((a, b) => b.absoluteImpact - a.absoluteImpact);

  const negativeContributors = ranked.filter((item) => item.impactScore < 0).slice(0, 3);
  const positiveContributors = ranked.filter((item) => item.impactScore > 0).slice(0, 3);

  const selected = [...negativeContributors, ...positiveContributors].map((item) => ({
    ...item,
    message:
      item.impactScore < 0
        ? `${item.label} moved in a way that likely reduced weekly wellbeing.`
        : `${item.label} moved in a way that likely supported weekly wellbeing.`,
  }));

  return {
    ranked,
    negativeContributors,
    positiveContributors,
    selected,
  };
};

const buildPatterns = (currentNormalized) => {
  const rawAverages = {
    sleep: average(currentNormalized.map((item) => item.raw.sleep)),
    anxiety: average(currentNormalized.map((item) => item.raw.anxiety)),
    stress: average(currentNormalized.map((item) => item.raw.stress)),
    energy: average(currentNormalized.map((item) => item.raw.energy)),
    motivation: average(currentNormalized.map((item) => item.raw.motivation)),
    focus: average(currentNormalized.map((item) => item.raw.focus)),
    social: average(currentNormalized.map((item) => item.raw.social)),
  };

  const patterns = [];

  if ((rawAverages.sleep ?? 100) < 50 && (rawAverages.energy ?? 100) < 50) {
    patterns.push({
      type: "Fatigue Pattern",
      detected: true,
      message: "Sleep and energy both trended low this week, which can reduce day-to-day resilience.",
    });
  }

  if ((rawAverages.stress ?? 0) > 60) {
    patterns.push({
      type: "Stress Overload",
      detected: true,
      message: "Stress remained elevated this week and may be increasing emotional load.",
    });
  }

  if ((rawAverages.anxiety ?? 0) > 60) {
    patterns.push({
      type: "Anxiety Pattern",
      detected: true,
      message: "Anxiety remained high this week and may be affecting emotional steadiness and concentration.",
    });
  }

  if ((rawAverages.motivation ?? 100) < 50 && (rawAverages.focus ?? 100) < 50) {
    patterns.push({
      type: "Burnout Pattern",
      detected: true,
      message: "Motivation and focus were both low, which can make tasks feel heavier than usual.",
    });
  }

  if ((rawAverages.social ?? 100) < 50) {
    patterns.push({
      type: "Social Isolation",
      detected: true,
      message: "Social interaction trended low this week, which can reduce protective emotional support.",
    });
  }

  return { patterns, rawAverages };
};

const buildCorrelationInsights = (entries) => {
  const safe = Array.isArray(entries) ? entries : [];
  const total = safe.length;

  const byRule = [
    {
      type: "Sleep vs Mood",
      test: (entry) => Number(entry.sleepLevel ?? entry.sleep ?? 0) < 5 && toMood5(entry.mood) <= 2,
      message: "Low sleep is linked to poor mood.",
    },
    {
      type: "Stress vs Mood",
      test: (entry) => Number(entry.stressLevel ?? entry.stress ?? 0) > 7 && toMood5(entry.mood) <= 2,
      message: "High stress reduces your mood.",
    },
    {
      type: "Energy vs Mood",
      test: (entry) => Number(entry.energyLevel ?? entry.energy ?? 0) > 6 && toMood5(entry.mood) >= 4,
      message: "Higher energy improves mood.",
    },
    {
      type: "Social vs Mood",
      test: (entry) => Number(entry.socialInteraction ?? entry.social ?? 0) < 4 && toMood5(entry.mood) <= 2,
      message: "Low social interaction affects mood.",
    },
    {
      type: "Anxiety vs Mood",
      test: (entry) => Number(entry.anxietyLevel ?? entry.anxiety ?? 0) > 6 && toMood5(entry.mood) <= 2,
      message: "High anxiety is linked to lower mood.",
    },
  ];

  return byRule
    .map((rule) => {
      const matchCount = safe.filter(rule.test).length;
      const matchPct = total ? round1((matchCount / total) * 100) : 0;
      return {
        type: rule.type,
        matchCount,
        totalCount: total,
        matchPct,
        detected: matchPct >= 60,
        message: rule.message,
      };
    })
    .filter((item) => item.detected);
};

const buildBehaviorPatterns = (entries) => {
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const patterns = [];

  const weekdayEntries = sorted.filter((entry) => {
    const day = new Date(entry.createdAt).getDay();
    return day >= 1 && day <= 5;
  });
  const weekendEntries = sorted.filter((entry) => {
    const day = new Date(entry.createdAt).getDay();
    return day === 0 || day === 6;
  });

  const weekdayAvg = averageBy(weekdayEntries, (entry) => toMood100(entry.mood));
  const weekendAvg = averageBy(weekendEntries, (entry) => toMood100(entry.mood));
  if (weekdayAvg !== null && weekendAvg !== null && weekdayAvg < weekendAvg) {
    patterns.push({
      type: "Weekday vs Weekend",
      detected: true,
      message: "Mood is lower on weekdays than weekends.",
    });
  }

  const lowFactorChecks = [
    { key: "sleepLevel", label: "Sleep" },
    { key: "energyLevel", label: "Energy" },
    { key: "motivationLevel", label: "Motivation" },
    { key: "socialInteraction", label: "Social interaction" },
    { key: "focusLevel", label: "Focus" },
  ];

  lowFactorChecks.forEach((factor) => {
    const lowCount = sorted.filter((entry) => Number(entry?.[factor.key] ?? 0) < 4).length;
    if (lowCount >= 3) {
      patterns.push({
        type: `Consistent Low ${factor.label}`,
        detected: true,
        message: `Low ${factor.label.toLowerCase()} appeared multiple times this week.`,
      });
    }
  });

  const highStressCount = sorted.filter((entry) => Number(entry?.stressLevel ?? entry?.stress ?? 0) > 7).length;
  if (highStressCount >= 3) {
    patterns.push({
      type: "Consistent High Stress",
      detected: true,
      message: "Stress is consistently high across multiple days.",
    });
  }

  const last3 = sorted.slice(-3).map((entry) => toMood5(entry.mood));
  if (last3.length === 3) {
    if (last3[0] < last3[1] && last3[1] < last3[2]) {
      patterns.push({
        type: "Recent Improvement",
        detected: true,
        message: "Mood is improving over the last 3 days.",
      });
    }
    if (last3[0] > last3[1] && last3[1] > last3[2]) {
      patterns.push({
        type: "Recent Decline",
        detected: true,
        message: "Mood is declining over the last 3 days.",
      });
    }
  }

  return patterns;
};

const buildRiskAlerts = (entries) => {
  const safe = Array.isArray(entries) ? entries : [];
  const alerts = [];

  const lowMoodCount = safe.filter((entry) => toMood5(entry.mood) <= 2).length;
  if (lowMoodCount >= 3) alerts.push("Frequent low mood detected.");

  const lowSleepCount = safe.filter((entry) => Number(entry.sleepLevel ?? entry.sleep ?? 0) < 5).length;
  if (lowSleepCount >= 3) alerts.push("Low sleep may affect mental health.");

  const highStressCount = safe.filter((entry) => Number(entry.stressLevel ?? entry.stress ?? 0) > 7).length;
  if (highStressCount >= 3) alerts.push("High stress detected for multiple days.");

  const combinedRiskCount = safe.filter((entry) => {
    const sleep = Number(entry.sleepLevel ?? entry.sleep ?? 0) < 5;
    const stress = Number(entry.stressLevel ?? entry.stress ?? 0) > 7;
    const mood = toMood5(entry.mood) <= 2;
    return sleep && stress && mood;
  }).length;
  if (combinedRiskCount >= 1) alerts.push("Multiple risk factors detected (low sleep + high stress + low mood).");

  return alerts;
};

const buildRecommendations = (rawAverages) => {
  const recommendations = [];

  if ((rawAverages.sleep ?? 100) < 60) {
    recommendations.push("Improve sleep schedule to support mood stability.");
  }

  if ((rawAverages.stress ?? 0) > 60) {
    recommendations.push("Try stress management techniques like breathing breaks and short walks.");
  }

  if ((rawAverages.anxiety ?? 0) > 60) {
    recommendations.push("Practice relaxation or mindfulness to reduce anxiety load.");
  }

  if ((rawAverages.energy ?? 100) < 50) {
    recommendations.push("Take regular breaks and improve daily activity to raise energy.");
  }

  if ((rawAverages.focus ?? 100) < 50) {
    recommendations.push("Reduce distractions and manage tasks in smaller blocks to improve focus.");
  }

  if ((rawAverages.social ?? 100) < 40) {
    recommendations.push("Increase social interaction through brief daily check-ins with people you trust.");
  }

  if (!recommendations.length) {
    recommendations.push("Your recent metrics are relatively balanced. Continue the routines that are helping you stay consistent.");
  }

  return recommendations;
};

const buildDailyInsight = (entries) => {
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const yesterday = sorted[sorted.length - 1] || null;
  const dayBefore = sorted[sorted.length - 2] || null;

  if (!yesterday) {
    return {
      date: null,
      message: "No daily insight available yet.",
      highlights: [],
    };
  }

  if (!dayBefore) {
    return {
      date: formatDate(yesterday.createdAt),
      message: "Yesterday gives your first daily insight for this week.",
      highlights: [],
    };
  }

  const moodDiff = toMood5(yesterday.mood) - toMood5(dayBefore.mood);
  const sleepDiff = Number(yesterday.sleepLevel ?? 0) - Number(dayBefore.sleepLevel ?? 0);
  const stressDiff = Number(yesterday.stressLevel ?? 0) - Number(dayBefore.stressLevel ?? 0);
  const anxietyDiff = Number(yesterday.anxietyLevel ?? 0) - Number(dayBefore.anxietyLevel ?? 0);

  const highlights = [];
  if (sleepDiff > 0) highlights.push("Sleep improved compared with the day before.");
  if (stressDiff < 0) highlights.push("Stress was lower than the day before.");
  if (anxietyDiff < 0) highlights.push("Anxiety was lower than the day before.");

  let message = "Yesterday looked stable compared with the previous day.";
  if (moodDiff > 0) message = "Yesterday mood improved compared with the previous day.";
  if (moodDiff < 0) message = "Yesterday mood was lower than the previous day.";

  return {
    date: formatDate(yesterday.createdAt),
    message,
    highlights,
  };
};

export const generateWeeklyFocusSummary = (negativeContributors, suggestions) => {
  const contributors = Array.isArray(negativeContributors) ? negativeContributors : [];
  const suggestionMap = suggestions && typeof suggestions === "object" ? suggestions : {};

  const topLabels = contributors
    .filter((item) => item && typeof item.label === "string" && item.label.trim())
    .slice(0, 3)
    .map((item) => item.label.trim());

  const toReadableList = (items) => {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  };

  const normalizedLabels = topLabels.map((label, index) => (index === 0 ? label : label.toLowerCase()));

  const topFactorsSentence = normalizedLabels.length
    ? `${toReadableList(normalizedLabels)} ${normalizedLabels.length === 1 ? "showed a decline" : "showed declines"} this week.`
    : "No major negative contributors were identified this week.";

  const topFactor = topLabels[0] || null;
  let recommendation = null;

  if (topFactor) {
    recommendation = suggestionMap[topFactor];

    if (typeof recommendation !== "string") {
      const key = Object.keys(suggestionMap).find((k) => k.toLowerCase() === topFactor.toLowerCase());
      recommendation = key ? suggestionMap[key] : null;
    }
  }

  if (typeof recommendation !== "string" || !recommendation.trim()) {
    recommendation = topFactor
      ? `Try one small, consistent step this week to improve your ${topFactor.toLowerCase()}.`
      : "Keep maintaining your current healthy routines this week.";
  }

  const recommendationSentence = recommendation.trim().endsWith(".") ? recommendation.trim() : `${recommendation.trim()}.`;

  return `${topFactorsSentence} ${recommendationSentence}`;
};

const buildSummary = ({ overallTrend, positiveContributors, negativeContributors, summaryRewriter }) => {
  const trendText =
    overallTrend === "improving"
      ? "Your overall wellbeing has improved this week"
      : overallTrend === "declining"
      ? "Your overall wellbeing has declined this week"
      : "Your overall wellbeing appears stable this week";

  const positiveText = positiveContributors.length
    ? `, supported by ${positiveContributors.map((f) => f.label.toLowerCase()).join(" and ")}`
    : "";

  const negativeText = negativeContributors.length
    ? ` However, changes in ${negativeContributors.map((f) => f.label.toLowerCase()).join(" and ")} may be limiting further progress.`
    : ".";

  const deterministicSummary = `${trendText}${positiveText}.${negativeText}`.replace("..", ".");

  // Optional, pluggable AI extension point for language polishing only.
  if (typeof summaryRewriter === "function") {
    try {
      const rewritten = summaryRewriter(deterministicSummary);
      if (typeof rewritten === "string" && rewritten.trim()) return rewritten.trim();
    } catch {
      // Keep deterministic summary if extension fails.
    }
  }

  return deterministicSummary;
};

export const buildMoodInsights = (entries = [], options = {}) => {
  const now = options.now ? new Date(options.now) : new Date();
  const safeEntries = Array.isArray(entries) ? entries : [];

  const { today, currentStart, currentEnd, previousStart, previousEnd, currentWeek, previousWeek } = splitByPeriod(
    safeEntries,
    now
  );

  const current = aggregateMetrics(currentWeek);
  const previous = aggregateMetrics(previousWeek);

  const currentOverall = current.overall ?? 0;
  const previousOverall = previous.overall ?? 0;
  const overallChange = percentChange(currentOverall, previousOverall);
  const overallTrend = getOverallTrend(overallChange);

  const impactData = buildFactorImpactInsights(current, previous, overallChange);
  const { patterns, rawAverages } = buildPatterns(current.normalized);
  const behaviorPatterns = buildBehaviorPatterns(currentWeek);
  const correlationInsights = buildCorrelationInsights(currentWeek);
  const riskAlerts = buildRiskAlerts(currentWeek);
  const recommendations = buildRecommendations(rawAverages);
  const suggestionByFactor = {
    Sleep: "Improve your sleep routine with a consistent wind-down schedule.",
    Stress: "Use short grounding or breathing exercises to lower stress spikes.",
    Anxiety: "Try brief mindfulness check-ins to reduce anxiety load.",
    Energy: "Take regular breaks and light movement to support steady energy.",
    Motivation: "Set one small achievable goal each day to rebuild motivation.",
    Focus: "Try shorter tasks with clear breaks to improve your focus.",
    "Social Connection": "Reach out to one trusted person for a short supportive check-in.",
    Mood: "Maintain routines that support mood stability, such as sleep and activity consistency.",
  };
  const dailyInsight = buildDailyInsight(currentWeek);

  const dailyTrend = buildDailyTrend(currentStart, currentWeek);
  const daysWithData = dailyTrend.filter((day) => typeof day.score === "number");
  const bestDay = daysWithData.length
    ? [...daysWithData].sort((a, b) => b.score - a.score)[0]
    : null;
  const worstDay = daysWithData.length
    ? [...daysWithData].sort((a, b) => a.score - b.score)[0]
    : null;

  const moodDistribution = buildMoodDistribution(currentWeek);
  const confidenceLevel = getConfidenceLevel(currentWeek.length);

  const summary = buildSummary({
    overallTrend,
    positiveContributors: impactData.positiveContributors,
    negativeContributors: impactData.negativeContributors,
    summaryRewriter: options.summaryRewriter,
  });
  const weeklyFocusSummary = generateWeeklyFocusSummary(impactData.negativeContributors, suggestionByFactor);

  const metrics = {
    currentWeek: {
      mood: current.mood,
      sleep: current.sleep,
      anxiety: current.anxiety,
      stress: current.stress,
      energy: current.energy,
      motivation: current.motivation,
      focus: current.focus,
      social: current.social,
      overall: currentOverall,
    },
    previousWeek: {
      mood: previous.mood,
      sleep: previous.sleep,
      anxiety: previous.anxiety,
      stress: previous.stress,
      energy: previous.energy,
      motivation: previous.motivation,
      focus: previous.focus,
      social: previous.social,
      overall: previousOverall,
    },
    factorChangePct: {
      mood: percentChange(current.mood ?? 0, previous.mood ?? 0),
      sleep: percentChange(current.sleep ?? 0, previous.sleep ?? 0),
      anxiety: percentChange(current.anxiety ?? 0, previous.anxiety ?? 0),
      stress: percentChange(current.stress ?? 0, previous.stress ?? 0),
      energy: percentChange(current.energy ?? 0, previous.energy ?? 0),
      motivation: percentChange(current.motivation ?? 0, previous.motivation ?? 0),
      focus: percentChange(current.focus ?? 0, previous.focus ?? 0),
      social: percentChange(current.social ?? 0, previous.social ?? 0),
    },
  };

  const weeklyComparison = {
    thisWeekMoodAvg: round1(current.mood ?? 0),
    lastWeekMoodAvg: round1(previous.mood ?? 0),
    moodChangePct: overallChange,
    trend: overallTrend,
    simpleMessage:
      overallTrend === "improving"
        ? "This week is better than last week."
        : overallTrend === "declining"
        ? "This week is harder than last week."
        : "This week is similar to last week.",
  };

  const topPositiveFactor = impactData.positiveContributors[0] || null;
  const topNegativeFactor = impactData.negativeContributors[0] || null;

  const peakDays = {
    bestDay,
    worstDay,
  };

  return {
    generatedAt: now.toISOString(),
    period: {
      currentStart: currentStart.toISOString(),
      currentEnd: currentEnd.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    },

    // Requested output structure.
    summary,
    weeklyFocusSummary,
    simpleMessage: weeklyComparison.simpleMessage,
    overallTrend,
    overallChange,
    weeklyComparison,
    metrics,
    factorChanges: impactData.ranked,
    factorInsights: impactData.selected,
    patterns: [...patterns, ...behaviorPatterns],
    correlationInsights,
    riskAlerts,
    recommendations,
    suggestions: recommendations,
    dailyInsight,
    topPositiveFactor,
    topNegativeFactor,
    peakDays,
    bestDay,
    worstDay,
    dailyTrend,
    moodDistribution,
    confidenceLevel,

    // Additional deterministic detail for factor ranking transparency.
    topNegativeContributors: impactData.negativeContributors,
    topPositiveContributors: impactData.positiveContributors,
    rankedFactorImpacts: impactData.ranked,

    // Compatibility fields for existing app modules.
    summaryText: summary,
    overallMoodTrend: overallTrend,
    moodTrend: overallTrend,
    moodChange: overallChange,
    topFactors: impactData.ranked,
    weeklySummary: {
      averageMoodScore: average(daysWithData.map((day) => day.score)) || 0,
      totalCheckIns: currentWeek.length,
      bestDay,
      worstDay,
      dailyMoodAverages: dailyTrend.map((day) => ({
        day: day.day,
        date: day.date,
        averageMoodScore: day.score,
        entries: day.entries,
      })),
    },
    recoveryProgress: {
      overallRecoveryScore: currentOverall,
      overallRecoveryChangePct: overallChange,
      sleepQualityIncreasePct: metrics.factorChangePct.sleep,
      anxietyLevelDecreasePct: metrics.factorChangePct.anxiety,
      stressLevelDecreasePct: metrics.factorChangePct.stress,
      energyLevelIncreasePct: metrics.factorChangePct.energy,
      motivationLevelIncreasePct: metrics.factorChangePct.motivation,
      focusLevelIncreasePct: metrics.factorChangePct.focus,
      socialInteractionIncreasePct: metrics.factorChangePct.social,
      confidenceLevel,
      currentAverages: {
        overallRecovery: currentOverall,
        sleepLevel: current.sleep,
        anxietyLevel: current.anxiety,
        stressLevel: current.stress,
        energyLevel: current.energy,
        motivationLevel: current.motivation,
        focusLevel: current.focus,
        socialInteraction: current.social,
      },
      previousAverages: {
        overallRecovery: previousOverall,
        sleepLevel: previous.sleep,
        anxietyLevel: previous.anxiety,
        stressLevel: previous.stress,
        energyLevel: previous.energy,
        motivationLevel: previous.motivation,
        focusLevel: previous.focus,
        socialInteraction: previous.social,
      },
    },

    // Cloud-ready metadata.
    sourceMeta: {
      currentWeekEntryCount: currentWeek.length,
      previousWeekEntryCount: previousWeek.length,
      processedAt: today.toISOString(),
    },
  };
};
