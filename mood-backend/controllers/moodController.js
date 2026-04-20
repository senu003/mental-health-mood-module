// mood-backend/controllers/moodController.js

import { 
  createMoodEntry, 
  getDashboardStats, 
  getWeeklyChart, 
  getMoodHistory,
  getWeeklyInsights,
} from "../services/moodService.js";
import { apiSuccess, apiFail } from "../utils/apiResponse.js";
import { validateCheckInData } from "../utils/validator.js";

const MOOD_NUMERIC_TO_TEXT = {
  1: "terrible",
  2: "sad",
  3: "okay",
  4: "good",
  5: "great",
};

const normalizeMoodPayload = (body = {}) => {
  const moodRaw = body.mood;
  const numericMood = Number(moodRaw);

  return {
    userId: body.userId,
    mood: Number.isNaN(numericMood) ? moodRaw : (MOOD_NUMERIC_TO_TEXT[numericMood] || moodRaw),
    note: body.note,
    sleepLevel: body.sleepLevel ?? body.sleep,
    anxietyLevel: body.anxietyLevel ?? body.anxiety,
    stressLevel: body.stressLevel ?? body.stress,
    energyLevel: body.energyLevel ?? body.energy,
    motivationLevel: body.motivationLevel ?? body.motivation,
    focusLevel: body.focusLevel ?? body.focus,
    socialInteraction: body.socialInteraction ?? body.social,
    shareWithDoctor: Boolean(body.shareWithDoctor),
    createdAt: body.createdAt,
    tags: body.tags,
  };
};

// POST /api/moods
export const createMood = async (req, res) => {
  const normalizedBody = normalizeMoodPayload(req.body);

  // Validate input
  const validation = validateCheckInData(normalizedBody);
  if (!validation.isValid) {
    return res.status(400).json(
      apiFail("Validation Error", validation.errors)
    );
  }

  const { saved, mentalHealthScore } = await createMoodEntry(normalizedBody);
  const savedDoc = typeof saved?.toObject === "function" ? saved.toObject() : saved;
  
  res.status(201).json(
    apiSuccess(
      { ...savedDoc, mentalHealthScore },
      "Mood saved successfully"
    )
  );
};

// GET /api/moods/dashboard/:userId
export const getDashboard = async (req, res) => {
  const stats = await getDashboardStats(req.params.userId);
  res.json(apiSuccess(stats, "Dashboard stats retrieved"));
};

// GET /api/moods/weekly/:userId
export const getWeekly = async (req, res) => {
  const weekly = await getWeeklyChart(req.params.userId);
  res.json(apiSuccess(weekly, "Weekly chart retrieved"));
};

// GET /api/moods/history/:userId
export const getHistory = async (req, res) => {
  const history = await getMoodHistory(req.params.userId);
  res.json(apiSuccess(history.data, `Retrieved ${history.count} mood entries`));
};

// PATCH /api/moods/:id
export const updateMood = async (req, res) => {
  try {
    const { id } = req.params;
    const { shareWithDoctor } = req.body;

    if (typeof shareWithDoctor !== 'boolean') {
      return res.status(400).json(apiFail("shareWithDoctor must be a boolean", null));
    }

    const updateData = { shareWithDoctor };

    const Mood = (await import("../models/mood.js")).default;
    const updated = await Mood.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json(apiFail("Mood entry not found", null));
    }

    res.json(apiSuccess(updated, "Mood updated successfully"));
  } catch (error) {
    res.status(400).json(apiFail("Failed to update mood", error.message));
  }
};

// GET /api/moods/insights/:userId
export const getInsights = async (req, res) => {
  const insights = await getWeeklyInsights(req.params.userId);
  res.json(apiSuccess(insights, "Weekly insights retrieved"));
};