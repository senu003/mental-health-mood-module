// mood-backend/routes/moodFixRoutes.js

import express from "express";
import {
  getMoodFixActivities,
  saveMoodFixActivity,
  updateMoodFixActivity,
  getUserMoodFixActivities,
  getLatestMoodFixActivities,
  getCompletedMoodFixActivities
} from "../controllers/moodFixController.js";
import { asyncHandler } from "../middlewares/errorMiddleware.js";

const router = express.Router();

// Get all activity catalog entries
router.get("/activities", asyncHandler(getMoodFixActivities));

// Save mood fix activity
router.post("/activities", asyncHandler(saveMoodFixActivity));

// Update mood fix activity
router.patch("/activities/:id", asyncHandler(updateMoodFixActivity));

// Get all activities for user (with optional mood filter)
router.get("/activities/:userId", asyncHandler(getUserMoodFixActivities));

// Get latest activities for user
router.get("/activities/:userId/latest", asyncHandler(getLatestMoodFixActivities));

// Get completed activities for user
router.get("/activities/:userId/completed", asyncHandler(getCompletedMoodFixActivities));

export default router;
