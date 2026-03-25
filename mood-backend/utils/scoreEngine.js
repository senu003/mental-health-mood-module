// mood-backend/utils/scoreEngine.js

/**
 * SINGLE SOURCE OF TRUTH for all mood scoring calculations
 * Used by: moodService.js, dashboard stats, recovery scores, streak logic
 */

// ==========================================
// HELPERS
// ==========================================

/**
 * Convert mood text to numeric value
 * @param {string} mood - Mood text (terrible, sad, okay, good, great)
 * @returns {number} Score 2-10
 */
export const getMoodValue = (mood) => {
  const moodMap = {
    terrible: 2,
    sad: 4,
    okay: 6,
    good: 8,
    great: 10
  };
  return moodMap[mood?.toLowerCase()] ?? 5;
};

/**
 * Safe number conversion with fallback
 * @param {*} v - Value to convert
 * @param {number} def - Default if NaN
 * @returns {number}
 */
export const num = (v, def = 5) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

/**
 * Format date to YYYY-MM-DD in local timezone
 * @param {Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ==========================================
// CORE CALCULATION
// ==========================================

/**
 * Calculate mental health score (0–10)
 * Weights: mood(15%), sleep(12%), energy(10%), motivation(10%), social(10%), focus(8%), anxiety(-20%), stress(-15%)
 * @param {Object} m - Mood document
 * @returns {number} Score 0-10
 */
export const calculateMentalHealthScore = (m) => {
  const moodValue = getMoodValue(m.mood);
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

// ==========================================
// AGGREGATION FUNCTIONS
// ==========================================

/**
 * Calculate recovery score based on real mood data (not averages)
 * Criteria: sleep >= 7, anxiety <= 4, energy >= 6, social >= 5, mood in [good,great], stress <= 4
 * @param {Array} moods - Array of mood documents
 * @returns {number} Recovery percentage 0-100
 */
export const calculateRecoveryScore = (moods) => {
  if (!moods.length) return 0;

  let good = 0;
  let total = 0;

  moods.forEach((m) => {
    if (num(m.sleepLevel) >= 7) good++; total++;
    if (num(m.anxietyLevel) <= 4) good++; total++;
    if (num(m.energyLevel) >= 6) good++; total++;
    if (num(m.socialInteraction) >= 5) good++; total++;
    if (m.mood === "good" || m.mood === "great") good++; total++;
    if (num(m.stressLevel) <= 4) good++; total++;
  });

  return Math.round((good / total) * 100);
};

/**
 * Calculate check-in streak (consecutive days with at least one check-in)
 * @param {Array} moods - Moods sorted by date DESC
 * @returns {number} Streak count
 */
export const calculateCheckInStreak = (moods) => {
  if (!moods.length) return 0;

  const uniqueDates = [
    ...new Set(moods.map((m) => formatDate(m.createdAt)))
  ].sort((a, b) => new Date(b) - new Date(a));

  // Current streak must be anchored to today or yesterday.
  // If the most recent check-in is older than yesterday, streak is not active.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const latest = new Date(uniqueDates[0]);
  latest.setHours(0, 0, 0, 0);
  if (latest.getTime() !== today.getTime() && latest.getTime() !== yesterday.getTime()) {
    return 0;
  }

  let streak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      streak = 1;
      continue;
    }

    const diff =
      (new Date(uniqueDates[i - 1]) - new Date(uniqueDates[i])) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) streak++;
    else break;
  }

  return streak;
};

/**
 * Convert mood to 0-100 scale
 * @param {string} mood - Mood text
 * @returns {number} Score 0-100
 */
export const getMoodScore100 = (mood) => {
  const map = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100
  };
  return map[mood?.toLowerCase()] ?? 60;
};

/**
 * Normalize 1-10 level to 0-100
 * @param {number} value - Value 1-10
 * @returns {number} Score 0-100
 */
export const normalize1to100 = (value) => {
  const v = num(value, 5);
  return v * 10;
};

/**
 * Calculate mental health trend (0-100 weighted score)
 * Weights: sleep(0.2), anxiety(0.2 inverted), stress(0.15 inverted), energy(0.15), motivation(0.1), focus(0.1), social(0.1)
 * @param {Object} m - Mood document
 * @returns {number} Score 0-100
 */
export const calculateMentalHealthTrend = (m) => {
  const moodScore = getMoodScore100(m.mood);
  const sleepScore = normalize1to100(m.sleepLevel);
  const energyScore = normalize1to100(m.energyLevel);
  const motivationScore = normalize1to100(m.motivationLevel);
  const socialScore = normalize1to100(m.socialInteraction);
  const focusScore = normalize1to100(m.focusLevel);
  const anxietyScore = 100 - normalize1to100(m.anxietyLevel); // inverted
  const stressScore = 100 - normalize1to100(m.stressLevel); // inverted

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

/**
 * Calculate 7-day average from moods using mental health score
 * @param {Array} moods - Moods for last 7 days
 * @returns {number} Average 0.0-10.0
 */
export const calculateSevenDayAverage = (moods) => {
  if (!moods.length) return 0;

  const validScores = moods
    .map((m) => calculateMentalHealthScore(m))
    .filter((score) => score > 0);

  if (!validScores.length) return 0;

  const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
  return Number(avg.toFixed(1));
};

// ==========================================
// EXPORT CONSTANTS
// ==========================================

export const MOOD_ENUM = ["terrible", "sad", "okay", "good", "great"];

export const VALID_LEVELS = {
  min: 1,
  max: 10
};

/**
 * Calculate average of a metric across entries
 * @param {Array} items - Array of mood entries
 * @param {string} fieldName - Field to average
 * @returns {number} Average value 0-100
 */
export const averageMetric100 = (items, fieldName) => {
  if (!items.length) return 0;
  const values = items.map((item) => {
    const val = num(item[fieldName], 5);
    // Invert if negative metric
    if (fieldName === "anxietyLevel" || fieldName === "stressLevel") {
      return 100 - val * 10;
    }
    // Mood needs special conversion
    if (fieldName === "mood") {
      return getMoodScore100(item.mood);
    }
    // Convert 1-10 to 0-100
    return val * 10;
  });
  const sum = values.reduce((a, b) => a + b, 0);
  return Number((sum / values.length).toFixed(1));
};