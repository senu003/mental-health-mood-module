import express from "express";
import { asyncHandler } from "../middlewares/errorMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  uploadAndAnalyzeReport,
  getReportHistory,
  getReportById,
} from "../controllers/labReportController.js";

const router = express.Router();

router.post("/upload", upload.single("report"), asyncHandler(uploadAndAnalyzeReport));
router.get("/user/:userId", asyncHandler(getReportHistory));
router.get("/:reportId", asyncHandler(getReportById));

export default router;
