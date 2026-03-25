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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const round1 = (value) => Number((value || 0).toFixed(1));

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
  const factorKeys = ["sleep", "anxiety", "stress", "energy", "motivation", "focus", "social", "mood"];
  const ranked = factorKeys.map((key) => {
    const factorChangePct = percentChange(currentMetrics[key] ?? 0, previousMetrics[key] ?? 0);
    const impactScore = round1((factorChangePct / 100) * overallChange * 10);
    const direction = impactScore < 0 ? "negative" : impactScore > 0 ? "positive" : "neutral";

    return {
      factor: key,
      label: FACTOR_LABELS[key],
      factorChangePct,
      impactScore,
      absoluteImpact: Math.abs(impactScore),
      direction,
    };
  })
    .sort((a, b) => b.absoluteImpact - a.absoluteImpact);

  const negativeContributors = ranked.filter((item) => item.impactScore < 0).slice(0, 3);
  const positiveContributors = ranked.filter((item) => item.impactScore > 0).slice(0, 2);

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

const buildRecommendations = (rawAverages) => {
  const recommendations = [];

  if ((rawAverages.sleep ?? 100) < 50) {
    recommendations.push("Sleep quality appears low. Consider a regular sleep schedule, reduced late-night screen use, and a calming bedtime routine.");
  }

  if ((rawAverages.stress ?? 0) > 60) {
    recommendations.push("Stress levels are elevated. Short breathing exercises, brief breaks, and light movement can help reduce pressure during the day.");
  }

  if ((rawAverages.anxiety ?? 0) > 60) {
    recommendations.push("Anxiety appears elevated. Try short mindfulness or grounding sessions at consistent times each day.");
  }

  if ((rawAverages.energy ?? 100) < 50) {
    recommendations.push("Energy is trending low. Gentle activity, hydration, and steady meal timing may help improve consistency.");
  }

  if ((rawAverages.focus ?? 100) < 50) {
    recommendations.push("Focus is trending low. Break work into smaller tasks with defined start and stop points.");
  }

  if ((rawAverages.social ?? 100) < 50) {
    recommendations.push("Social connection is low this week. A brief conversation or check-in with someone trusted can be beneficial.");
  }

  if (!recommendations.length) {
    recommendations.push("Your recent metrics are relatively balanced. Continue the routines that are helping you stay consistent.");
  }

  return recommendations;
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
  const recommendations = buildRecommendations(rawAverages);

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
    overallTrend,
    overallChange,
    metrics,
    factorInsights: impactData.selected,
    patterns,
    recommendations,
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
