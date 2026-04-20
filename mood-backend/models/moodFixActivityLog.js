import mongoose from "mongoose";

const moodFixActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MoodFixActivity",
      required: true,
    },
    activityId: {
      type: String,
      required: true,
      index: true,
    },
    activityTitle: {
      type: String,
      required: true,
    },
    moodBefore: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    moodAfter: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    moodLabelBefore: {
      type: String,
      enum: ["terrible", "sad", "okay", "good", "great"],
      default: "okay",
    },
    moodLabelAfter: {
      type: String,
      enum: ["terrible", "sad", "okay", "good", "great"],
      default: null,
    },
    duration: {
      type: String,
      default: "",
    },
    feedback: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    status: {
      type: String,
      enum: ["started", "completed"],
      default: "started",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

moodFixActivityLogSchema.index({ userId: 1, createdAt: -1 });
moodFixActivityLogSchema.index({ userId: 1, status: 1, completedAt: -1 });

const MoodFixActivityLog = mongoose.model("MoodFixActivityLog", moodFixActivityLogSchema);

export default MoodFixActivityLog;
