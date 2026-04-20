// mood-backend/controllers/moodFixController.js

import MoodFixActivity from "../models/moodFixActivity.js";
import MoodFixActivityLog from "../models/moodFixActivityLog.js";
import { apiSuccess, apiFail } from "../utils/apiResponse.js";

const moodToScore = {
  terrible: 2,
  sad: 4,
  okay: 6,
  good: 8,
  great: 10,
};

const scoreToMood = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value <= 2) return "terrible";
  if (value <= 4) return "sad";
  if (value <= 6) return "okay";
  if (value <= 8) return "good";
  return "great";
};

// GET /api/mood-fix/activities - Get activity catalog from database
export const getMoodFixActivities = async (req, res) => {
  try {
    const activities = await MoodFixActivity.find({ isActive: true })
      .sort({ updatedAt: -1, title: 1 });

    res.json(
      apiSuccess(
        { data: activities, count: activities.length },
        "Mood fix activities retrieved successfully"
      )
    );
  } catch (error) {
    res.status(400).json(apiFail("Failed to retrieve mood fix activities", error.message));
  }
};

// POST /api/mood-fix/activities - Create/Track mood fix activity
export const saveMoodFixActivity = async (req, res) => {
  try {
    const {
      userId,
      activityId,
      activityTitle,
      mood,
      moodBefore,
      duration,
      benefit,
      description,
      moods,
      steps,
      difficulty,
      focusTag,
    } = req.body;

    if (!userId || !activityId || !activityTitle || !mood) {
      return res.status(400).json(
        apiFail("Missing required fields", {
          required: ["userId", "activityId", "activityTitle", "mood"]
        })
      );
    }

    const activity = await MoodFixActivity.findOneAndUpdate(
      { activityId },
      {
        activityId,
        title: activityTitle,
        duration,
        benefit: benefit || "",
        description: description || "",
        moods: Array.isArray(moods) ? moods : [],
        steps: Array.isArray(steps) ? steps : [],
        difficulty: difficulty || "",
        focusTag: focusTag || "",
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const normalizedMood = String(mood || "okay").toLowerCase();
    const resolvedMoodBefore =
      typeof moodBefore === "number" && !Number.isNaN(moodBefore)
        ? moodBefore
        : (moodToScore[normalizedMood] || 6);

    const log = await MoodFixActivityLog.create({
      userId,
      activity: activity._id,
      activityId,
      activityTitle,
      moodLabelBefore: normalizedMood,
      moodBefore: resolvedMoodBefore,
      duration: duration || "",
      status: "started",
      startedAt: new Date(),
    });

    res.status(201).json(
      apiSuccess({
        _id: log._id,
        activityLogId: log._id,
        activityCatalogId: activity._id,
      }, "Mood fix activity log started successfully")
    );
  } catch (error) {
    res.status(400).json(apiFail("Failed to save activity", error.message));
  }
};

// PATCH /api/mood-fix/activities/:id - Update mood fix activity
export const updateMoodFixActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { moodAfter, feedback, rating, completedAt, duration } = req.body;

    const updateData = {
      feedback,
      rating,
      duration,
    };

    // If marking as completed, set completedAt
    if (typeof moodAfter === "number" && !Number.isNaN(moodAfter)) {
      updateData.moodAfter = moodAfter;
      updateData.moodLabelAfter = scoreToMood(moodAfter);
    }

    if (req.body.completed === true) {
      updateData.status = "completed";
      updateData.completedAt = completedAt || new Date();
    }

    const updated = await MoodFixActivityLog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json(apiFail("Activity not found", null));
    }

    res.json(apiSuccess(updated, "Activity updated successfully"));
  } catch (error) {
    res.status(400).json(apiFail("Failed to update activity", error.message));
  }
};

// GET /api/mood-fix/activities/:userId - Get all mood fix activities for a user
export const getUserMoodFixActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { mood } = req.query;

    const query = { userId };
    if (mood) query.moodLabelBefore = mood;

    const activities = await MoodFixActivityLog.find(query)
      .populate("activity")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(
      apiSuccess(
        { data: activities, count: activities.length },
        "Activities retrieved successfully"
      )
    );
  } catch (error) {
    res.status(400).json(apiFail("Failed to retrieve activities", error.message));
  }
};

// GET /api/mood-fix/activities/:userId/latest - Get latest mood fix activities for a user
export const getLatestMoodFixActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const parsedLimit = Number.parseInt(limit, 10) || 10;

    const activities = await MoodFixActivityLog.find({ userId })
      .populate("activity")
      .sort({ createdAt: -1 })
      .limit(parsedLimit);

    res.json(
      apiSuccess(
        { data: activities, count: activities.length },
        "Latest activities retrieved successfully"
      )
    );
  } catch (error) {
    res.status(400).json(apiFail("Failed to retrieve activities", error.message));
  }
};

// GET /api/mood-fix/activities/:userId/completed - Get completed activities for a user
export const getCompletedMoodFixActivities = async (req, res) => {
  try {
    const { userId } = req.params;

    const activities = await MoodFixActivityLog.find({ userId, status: "completed" })
      .populate("activity")
      .sort({ completedAt: -1 })
      .limit(100);

    res.json(
      apiSuccess(
        { data: activities, count: activities.length },
        "Completed activities retrieved successfully"
      )
    );
  } catch (error) {
    res.status(400).json(apiFail("Failed to retrieve activities", error.message));
  }
};
