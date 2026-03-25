// mood-backend/server.js

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import moodRoutes from "./routes/moodRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

// ==================
// MIDDLEWARE
// ==================
app.use(cors());
app.use(express.json());

// ==================
// ROUTES
// ==================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mood backend is running.",
    docs: "Use /api/moods endpoints for data.",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api/moods", moodRoutes);

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
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
};

startServer();