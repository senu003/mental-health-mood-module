import express from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import {
	createReminder,
	completeReminder,
	getTodayReminders,
	getNotifications,
	getReminderNotificationCounts,
	markNotificationRead,
	skipReminder,
	reactivateReminderForToday,
	processMissedReminders,
	updateReminder,
	deleteReminder,
} from "../controllers/reminderController.js";

const router = express.Router();

router.post("/", asyncHandler(createReminder));
router.get("/today", asyncHandler(getTodayReminders));
router.get("/today/:userId", asyncHandler(getTodayReminders));
router.get("/counts/:userId", asyncHandler(getReminderNotificationCounts));
router.get("/notifications/:userId", asyncHandler(getNotifications));
router.patch("/notifications/:id/read", asyncHandler(markNotificationRead));
router.post("/missed", asyncHandler(processMissedReminders));
router.post("/:id/complete", asyncHandler(completeReminder));
router.post("/:id/skip", asyncHandler(skipReminder));
router.post("/:id/reactivate", asyncHandler(reactivateReminderForToday));
router.patch("/:id", asyncHandler(updateReminder));
router.delete("/:id", asyncHandler(deleteReminder));

export default router;