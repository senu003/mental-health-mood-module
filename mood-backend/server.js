// mood-backend/server.js

import express from "express";
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import moodRoutes from "./routes/moodRoutes.js";
import moodFixRoutes from "./routes/moodFixRoutes.js";
import labReportRoutes from "./routes/labReportRoutes.js";
import biomarkerRoutes from "./routes/biomarkerRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import { startAppointmentReminderScheduler } from "./services/appointmentReminderScheduler.js";
import { startReminderCronJobs } from "./cronJobs/reminderCron.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

// ==================
// MIDDLEWARE
// ==================
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

// ==================
// ROUTES
// ==================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mood backend is running.",
    docs: "Use /api/moods, /api/mood-fix, /api/reminders, /api/lab-reports, and /api/biomarkers endpoints for data.",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api/moods", moodRoutes);
app.use("/api/mood-fix", moodFixRoutes);
app.use("/api/lab-reports", labReportRoutes);
app.use("/api/biomarkers", biomarkerRoutes);
app.use("/api/reminders", reminderRoutes);

// ==================
// ERROR HANDLING (MUST BE LAST)
// ==================
app.use(errorHandler);

// ==================
// SERVER START
// ==================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  startAppointmentReminderScheduler();
  startReminderCronJobs();
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
};

startServer();