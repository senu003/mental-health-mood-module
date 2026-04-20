// mood-backend/routes/moodRoutes.js

import express from "express";
import { 
  createMood,
  updateMood,
  getDashboard, 
  getWeekly, 
  getHistory,
  getInsights,
} from "../controllers/moodController.js";
import { asyncHandler } from "../middlewares/errorMiddleware.js";

const router = express.Router();

router.post("/", asyncHandler(createMood));
router.patch("/:id", asyncHandler(updateMood));
router.get("/dashboard/:userId", asyncHandler(getDashboard));
router.get("/weekly/:userId", asyncHandler(getWeekly));
router.get("/history/:userId", asyncHandler(getHistory));
router.get("/insights/:userId", asyncHandler(getInsights));

export default router;