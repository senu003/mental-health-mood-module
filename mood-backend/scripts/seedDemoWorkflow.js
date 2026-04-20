import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Biomarker from "../models/biomarker.js";
import Mood from "../models/mood.js";
import Insight from "../models/insight.js";
import LabReport from "../models/labReport.js";
import Reminder from "../models/reminder.js";
import ReminderLog from "../models/reminderLog.js";
import Notification from "../models/notification.js";
import MoodFixActivity from "../models/moodFixActivity.js";
import MoodFixActivityLog from "../models/moodFixActivityLog.js";
import { getDashboardStats, getMoodHistory, getWeeklyInsights } from "../services/moodService.js";
import { hydrateReportMarkerRanges, toClientReport } from "../services/labReportService.js";
import {
  saveMoodFixActivity,
  updateMoodFixActivity,
  getUserMoodFixActivities,
  getCompletedMoodFixActivities,
} from "../controllers/moodFixController.js";
import {
  createReminder,
  completeReminder,
  skipReminder,
  processMissedReminders,
  getTodayReminders,
  getNotifications,
  getReminderNotificationCounts,
} from "../controllers/reminderController.js";
import { getReportHistory, getReportById } from "../controllers/labReportController.js";

const DEMO_MOOD_USER_ID = "demo-user-mental-001";
const DEMO_REPORT_USER_ID = "demo-user-lab-001";
const DEMO_REMINDER_USER_ID = "testuser001";

const DEMO_ACTIVITY_IDS = ["breathing-reset-5", "sunlight-walk-10"];

const MOCK_BIOMARKERS = [
  {
    name: "Hemoglobin",
    aliases: ["hemoglobin", "hb", "hgb"],
    unit: "g/dL",
    category: "blood",
    ranges: { normalMin: 13.5, normalMax: 17.5 },
    thresholds: { low: 13.5, high: 17.5 },
    weight: 0.3,
    recommendations: {
      low: { immediate: ["Discuss anemia evaluation with your clinician"], daily: ["Increase iron-rich foods"] },
      high: { immediate: ["Review hydration status with your clinician"], daily: ["Maintain adequate hydration"] },
      normal: { daily: ["Maintain balanced iron intake"] },
    },
    explanations: {
      low: "Hemoglobin is below the optimal range and may indicate anemia.",
      normal: "Hemoglobin is within the optimal range.",
      high: "Hemoglobin is above the optimal range.",
      notFound: "Hemoglobin could not be confidently detected from this report.",
    },
    priority: "high",
  },
  {
    name: "Vitamin D",
    aliases: ["vitamin d", "vit d", "25-oh vitamin d"],
    unit: "ng/ml",
    category: "vitamin",
    ranges: { normalMin: 30, normalMax: 100 },
    thresholds: { low: 30, high: 100 },
    weight: 0.35,
    recommendations: {
      low: { immediate: ["Increase sun exposure"], daily: ["Add vitamin D-rich foods"] },
      high: { immediate: ["Review current vitamin D supplementation dose"], daily: ["Monitor intake sources"] },
      normal: { daily: ["Maintain current vitamin D supportive habits"] },
    },
    explanations: {
      low: "Vitamin D is below the optimal range and may affect mood and energy.",
      normal: "Vitamin D is within the optimal range.",
      high: "Vitamin D is above the optimal range and should be reviewed if persistent.",
      notFound: "Vitamin D could not be confidently detected from this report.",
    },
    priority: "medium",
  },
  {
    name: "TSH",
    aliases: ["tsh", "thyroid stimulating hormone"],
    unit: "mIU/L",
    category: "hormone",
    ranges: { normalMin: 0.4, normalMax: 4.0 },
    thresholds: { low: 0.4, high: 4.0 },
    weight: 0.35,
    recommendations: {
      low: { immediate: ["Discuss low TSH with your clinician"], daily: ["Track palpitations or sleep disruption"] },
      high: { immediate: ["Arrange follow-up thyroid review"], daily: ["Support thyroid health with consistent sleep"] },
      normal: { daily: ["Maintain regular thyroid checkups as advised"] },
    },
    explanations: {
      low: "TSH is below the optimal range and may indicate thyroid overactivity.",
      normal: "TSH is within the optimal range.",
      high: "TSH is above the optimal range and may indicate thyroid underactivity.",
      notFound: "TSH could not be confidently detected from this report.",
    },
    priority: "high",
  },
  {
    name: "Vitamin B12",
    aliases: ["vitamin b12", "b12", "cobalamin"],
    unit: "pg/ml",
    category: "vitamin",
    ranges: { normalMin: 200, normalMax: 900 },
    thresholds: { low: 200, high: 900 },
    weight: 0.3,
    recommendations: {
      low: { immediate: ["Discuss B12 repletion options"], daily: ["Increase B12-rich foods"] },
      high: { immediate: ["Review supplement use if taking high-dose B12 products"], daily: ["Continue balanced nutrition"] },
      normal: { daily: ["Maintain current B12-supportive dietary pattern"] },
    },
    explanations: {
      low: "Vitamin B12 is below the optimal range and can affect energy and focus.",
      normal: "Vitamin B12 is within the optimal range.",
      high: "Vitamin B12 is above the optimal range and should be trended over time.",
      notFound: "Vitamin B12 could not be confidently detected from this report.",
    },
    priority: "medium",
  },
];

const DEMO_MOOD_DAYS = [
  { daysAgo: 13, mood: "sad", note: "Poor sleep after a stressful deadline", sleepLevel: 4, anxietyLevel: 7, energyLevel: 4, motivationLevel: 4, socialInteraction: 3, stressLevel: 7, focusLevel: 4, tags: ["sleep", "work"] },
  { daysAgo: 12, mood: "okay", note: "Slow start but finished the workday", sleepLevel: 5, anxietyLevel: 6, energyLevel: 5, motivationLevel: 5, socialInteraction: 4, stressLevel: 6, focusLevel: 5, tags: ["work"] },
  { daysAgo: 11, mood: "sad", note: "Felt low energy in the afternoon", sleepLevel: 4, anxietyLevel: 6, energyLevel: 4, motivationLevel: 4, socialInteraction: 3, stressLevel: 6, focusLevel: 4, tags: ["energy"] },
  { daysAgo: 10, mood: "okay", note: "Kept a stable routine", sleepLevel: 5, anxietyLevel: 5, energyLevel: 5, motivationLevel: 5, socialInteraction: 4, stressLevel: 5, focusLevel: 5, tags: ["routine"] },
  { daysAgo: 9, mood: "good", note: "Felt more grounded after a walk", sleepLevel: 6, anxietyLevel: 5, energyLevel: 6, motivationLevel: 6, socialInteraction: 5, stressLevel: 5, focusLevel: 6, tags: ["walk"] },
  { daysAgo: 8, mood: "okay", note: "Balanced day with steady focus", sleepLevel: 6, anxietyLevel: 5, energyLevel: 6, motivationLevel: 6, socialInteraction: 5, stressLevel: 4, focusLevel: 6, tags: ["focus"] },
  { daysAgo: 7, mood: "good", note: "Good productivity and no major stress spikes", sleepLevel: 7, anxietyLevel: 4, energyLevel: 7, motivationLevel: 7, socialInteraction: 5, stressLevel: 4, focusLevel: 7, tags: ["productivity"] },
  { daysAgo: 6, mood: "good", note: "Completed a workout and felt lighter", sleepLevel: 7, anxietyLevel: 3, energyLevel: 7, motivationLevel: 7, socialInteraction: 6, stressLevel: 3, focusLevel: 7, tags: ["exercise"] },
  { daysAgo: 5, mood: "great", note: "Clear head after a good night's sleep", sleepLevel: 8, anxietyLevel: 3, energyLevel: 8, motivationLevel: 8, socialInteraction: 6, stressLevel: 3, focusLevel: 8, tags: ["sleep", "clarity"] },
  { daysAgo: 4, mood: "good", note: "Kept momentum through the afternoon", sleepLevel: 7, anxietyLevel: 3, energyLevel: 7, motivationLevel: 7, socialInteraction: 6, stressLevel: 3, focusLevel: 7, tags: ["momentum"] },
  { daysAgo: 3, mood: "great", note: "Social time helped a lot", sleepLevel: 8, anxietyLevel: 2, energyLevel: 8, motivationLevel: 8, socialInteraction: 8, stressLevel: 2, focusLevel: 8, tags: ["social"] },
  { daysAgo: 2, mood: "good", note: "Focused work without burnout", sleepLevel: 7, anxietyLevel: 3, energyLevel: 7, motivationLevel: 7, socialInteraction: 6, stressLevel: 3, focusLevel: 8, tags: ["work"] },
  { daysAgo: 1, mood: "great", note: "Strong recovery from the week", sleepLevel: 8, anxietyLevel: 2, energyLevel: 9, motivationLevel: 8, socialInteraction: 7, stressLevel: 2, focusLevel: 8, tags: ["recovery"] },
  { daysAgo: 0, mood: "great", note: "A very steady and positive day", sleepLevel: 8, anxietyLevel: 2, energyLevel: 9, motivationLevel: 9, socialInteraction: 7, stressLevel: 2, focusLevel: 9, tags: ["steady"] },
];

const MOOD_FIX_LOGS = [
  {
    activityId: DEMO_ACTIVITY_IDS[0],
    activityTitle: "5-minute breathing reset",
    mood: "sad",
    duration: "5 minutes",
    benefit: "Calms the nervous system quickly",
    description: "Short breathing cycle to interrupt stress spiral",
    moods: ["sad", "okay"],
    steps: ["Sit comfortably", "Inhale for 4", "Exhale for 6"],
    difficulty: "easy",
    focusTag: "breathing",
    completed: true,
    moodAfter: 7,
    rating: 4,
    feedback: "This made it easier to settle back into work.",
  },
  {
    activityId: DEMO_ACTIVITY_IDS[1],
    activityTitle: "10-minute sunlight walk",
    mood: "okay",
    duration: "10 minutes",
    benefit: "Adds movement and daylight",
    description: "Brief outdoor walk for a mood lift",
    moods: ["okay", "good"],
    steps: ["Go outside", "Walk at a steady pace", "Notice surroundings"],
    difficulty: "easy",
    focusTag: "movement",
    completed: false,
  },
];

const MOCK_LAB_REPORT = {
  userId: DEMO_REPORT_USER_ID,
  filePath: "uploads/demo-lab-report.pdf",
  originalFileName: "demo-lab-report.pdf",
  extractedText: "Hemoglobin 11.2 g/dL, Vitamin D 18 ng/ml, TSH 5.8 mIU/L, Vitamin B12 260 pg/ml",
  markers: [
    { name: "Hemoglobin", value: 11.2, unit: "g/dL", status: "low", score: 72, confidence: "high", reviewNote: "Below normal", explanation: "Hemoglobin is below range." },
    { name: "Vitamin D", value: 18, unit: "ng/ml", status: "low", score: 65, confidence: "high", reviewNote: "Below normal", explanation: "Vitamin D is below range." },
    { name: "TSH", value: 5.8, unit: "mIU/L", status: "high", score: 58, confidence: "high", reviewNote: "Above normal", explanation: "TSH is above range." },
    { name: "Vitamin B12", value: 260, unit: "pg/ml", status: "normal", score: 86, confidence: "medium", reviewNote: "In range", explanation: "Vitamin B12 is within range." },
  ],
  overallScore: 69,
  confidence: 0.75,
  summary: "The report shows a few actionable gaps, especially hemoglobin, vitamin D, and thyroid balance.",
  dataQuality: { detected: 4, total: 4, percentage: 100 },
  analysisCoverage: { analyzed: 4, available: 4, percentage: 100 },
  reportBiomarkers: ["Hemoglobin", "Vitamin D", "TSH", "Vitamin B12"],
  keyIssues: [
    { name: "Hemoglobin", status: "low", value: 11.2 },
    { name: "Vitamin D", status: "low", value: 18 },
    { name: "TSH", status: "high", value: 5.8 },
  ],
  recommendations: {
    immediateActions: ["Discuss the report with a clinician", "Review vitamin D supplementation"],
    dailyPractices: ["Track sleep consistency", "Keep hydration and movement steady"],
  },
  explanation: "This is a demo report for workflow verification.",
  createdAt: new Date(),
};

const makeReq = ({ body = {}, query = {}, params = {} } = {}) => ({ body, query, params });

const invokeController = async (controller, reqInput = {}) => {
  const req = makeReq(reqInput);

  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, payload });
      },
    };

    Promise.resolve(controller(req, res)).catch(reject);
  });
};

const assertCondition = (condition, passMessage, failMessage, failures) => {
  if (condition) {
    console.log(`PASS: ${passMessage}`);
    return;
  }

  failures.push(failMessage);
  console.error(`FAIL: ${failMessage}`);
};

const deleteDemoData = async () => {
  await Promise.all([
    Mood.deleteMany({ userId: DEMO_MOOD_USER_ID }),
    Insight.deleteOne({ userId: DEMO_MOOD_USER_ID }),
    LabReport.deleteMany({ userId: DEMO_REPORT_USER_ID }),
    ReminderLog.deleteMany({ userId: DEMO_REMINDER_USER_ID }),
    Notification.deleteMany({ userId: DEMO_REMINDER_USER_ID }),
    Reminder.deleteMany({ userId: DEMO_REMINDER_USER_ID }),
    MoodFixActivityLog.deleteMany({ userId: DEMO_MOOD_USER_ID }),
  ]);
};

const seedBiomarkers = async () => {
  for (const biomarker of MOCK_BIOMARKERS) {
    await Biomarker.updateOne(
      { name: biomarker.name },
      { $set: biomarker },
      { upsert: true, runValidators: true }
    );
  }
};

const seedMoodEntries = async () => {
  const now = new Date();
  const moodDocs = DEMO_MOOD_DAYS.map((entry) => {
    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - entry.daysAgo);
    createdAt.setHours(12, 0, 0, 0);

    return {
      userId: DEMO_MOOD_USER_ID,
      mood: entry.mood,
      note: entry.note,
      sleepLevel: entry.sleepLevel,
      anxietyLevel: entry.anxietyLevel,
      energyLevel: entry.energyLevel,
      motivationLevel: entry.motivationLevel,
      socialInteraction: entry.socialInteraction,
      stressLevel: entry.stressLevel,
      focusLevel: entry.focusLevel,
      shareWithDoctor: false,
      tags: entry.tags,
      createdAt,
      updatedAt: createdAt,
    };
  });

  await Mood.insertMany(moodDocs, { ordered: true });
};

const seedMoodFixWorkflow = async () => {
  const startedLogs = [];

  for (const item of MOOD_FIX_LOGS) {
    const response = await invokeController(saveMoodFixActivity, {
      body: {
        userId: DEMO_MOOD_USER_ID,
        activityId: item.activityId,
        activityTitle: item.activityTitle,
        mood: item.mood,
        moodBefore: item.moodBefore,
        duration: item.duration,
        benefit: item.benefit,
        description: item.description,
        moods: item.moods,
        steps: item.steps,
        difficulty: item.difficulty,
        focusTag: item.focusTag,
      },
    });

    if (response.statusCode !== 201 || !response.payload?.success) {
      throw new Error(`Failed to create mood fix activity log for ${item.activityId}`);
    }

    startedLogs.push(response.payload.data);
  }

  const completionTarget = startedLogs[0]?.activityLogId;
  const completedResponse = await invokeController(updateMoodFixActivity, {
    params: { id: completionTarget },
    body: {
      completed: true,
      moodAfter: MOOD_FIX_LOGS[0].moodAfter,
      duration: MOOD_FIX_LOGS[0].duration,
      feedback: MOOD_FIX_LOGS[0].feedback,
      rating: MOOD_FIX_LOGS[0].rating,
      completedAt: new Date(),
    },
  });

  if (completedResponse.statusCode !== 200 || !completedResponse.payload?.success) {
    throw new Error("Failed to complete seeded mood fix activity log");
  }

  return startedLogs;
};

const seedReminderWorkflow = async () => {
  const reminderPayloads = [
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Morning mood check-in",
      description: "Demo reminder for the morning check-in flow",
      category: "mood",
      time: "09:00",
      frequency: "daily",
      createdFrom: "user",
      timezone: "Asia/Colombo",
    },
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Afternoon breathing break",
      description: "Demo reminder for a completed task",
      category: "activity",
      time: "10:00",
      frequency: "daily",
      createdFrom: "user",
      timezone: "Asia/Colombo",
    },
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Evening reset reminder",
      description: "Demo reminder that will be marked as missed",
      category: "meditation",
      time: "00:00",
      frequency: "daily",
      createdFrom: "user",
      timezone: "Asia/Colombo",
    },
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Midday stretch reminder",
      description: "A short movement break that is already completed for today",
      category: "activity",
      time: "13:30",
      frequency: "daily",
      createdFrom: "user",
      timezone: "Asia/Colombo",
    },
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Evening wind-down",
      description: "A calm end-of-day reminder that has already been skipped",
      category: "meditation",
      time: "21:15",
      frequency: "daily",
      createdFrom: "user",
      timezone: "Asia/Colombo",
    },
  ];

  const reminders = [];
  for (const payload of reminderPayloads) {
    const response = await invokeController(createReminder, { body: payload });
    if (response.statusCode !== 201 || !response.payload?.success) {
      throw new Error(`Failed to create reminder: ${payload.title}`);
    }

    reminders.push(response.payload.data.reminder);
  }

  const completeResponse = await invokeController(completeReminder, {
    params: { id: String(reminders[0]._id) },
    body: { userId: DEMO_REMINDER_USER_ID },
  });

  const skipResponse = await invokeController(skipReminder, {
    params: { id: String(reminders[1]._id) },
    body: { userId: DEMO_REMINDER_USER_ID },
  });

  if (completeResponse.statusCode !== 201 || skipResponse.statusCode !== 201) {
    throw new Error("Failed to mark reminder completion states");
  }

  const missedResponse = await invokeController(processMissedReminders, {
    body: { userId: DEMO_REMINDER_USER_ID },
  });

  if (missedResponse.statusCode !== 200 || !missedResponse.payload?.success) {
    throw new Error("Failed to process missed reminders");
  }

  const hydratedNotifications = [
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Weekly wellness summary",
      message: "Your reminder streak is on track and 3 of 5 activities were completed today.",
      type: "system",
      category: "summary",
      isRead: true,
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      userId: DEMO_REMINDER_USER_ID,
      title: "Hydration streak unlocked",
      message: "You have logged enough hydration check-ins to keep your streak alive.",
      type: "system",
      category: "achievement",
      isRead: true,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  ];

  for (const notification of hydratedNotifications) {
    const createdNotification = await Notification.create(notification);
    if (!createdNotification?._id) {
      throw new Error(`Failed to seed notification: ${notification.title}`);
    }
  }

  return reminders;
};

const seedLabReport = async () => {
  const reportDoc = await LabReport.collection.insertOne(MOCK_LAB_REPORT);
  return reportDoc.insertedId;
};

const run = async () => {
  const failures = [];

  await connectDB();

  try {
    await deleteDemoData();
    await seedBiomarkers();
    await seedMoodEntries();
    const moodFixLogs = await seedMoodFixWorkflow();
    const reminders = await seedReminderWorkflow();
    const reportId = await seedLabReport();

    const moodCount = await Mood.countDocuments({ userId: DEMO_MOOD_USER_ID });
    const dashboard = await getDashboardStats(DEMO_MOOD_USER_ID);
    const history = await getMoodHistory(DEMO_MOOD_USER_ID);
    const insights = await getWeeklyInsights(DEMO_MOOD_USER_ID);

    assertCondition(moodCount === DEMO_MOOD_DAYS.length, "Seeded 14 demo mood entries", `Expected ${DEMO_MOOD_DAYS.length} demo moods, found ${moodCount}`, failures);
    assertCondition(dashboard.checkInStreak >= 7, "Dashboard streak reflects the seeded 7-day run", `Expected a 7+ day streak, found ${dashboard.checkInStreak}`, failures);
    assertCondition(dashboard.sevenDayAverage > 0, "Dashboard average was computed", "Dashboard average was not computed", failures);
    assertCondition(history.count === DEMO_MOOD_DAYS.length, "Mood history returned all seeded entries", `Expected ${DEMO_MOOD_DAYS.length} history entries, found ${history.count}`, failures);
    assertCondition(insights && insights.sourceEntryCount === DEMO_MOOD_DAYS.length, "Weekly insights were generated from the seeded moods", "Weekly insights did not match the seeded mood count", failures);

    const moodFixHistory = await invokeController(getUserMoodFixActivities, {
      params: { userId: DEMO_MOOD_USER_ID },
    });
    const moodFixCompleted = await invokeController(getCompletedMoodFixActivities, {
      params: { userId: DEMO_MOOD_USER_ID },
    });

    assertCondition(moodFixHistory.statusCode === 200, "Mood fix history endpoint responded", "Mood fix history endpoint failed", failures);
    assertCondition((moodFixHistory.payload?.data?.count || 0) >= 2, "Mood fix activities were seeded", "Mood fix activities were not seeded", failures);
    assertCondition((moodFixCompleted.payload?.data?.count || 0) >= 1, "Completed mood fix activity was captured", "Completed mood fix activity was not captured", failures);
    const moodFixCatalogCount = await MoodFixActivity.countDocuments({ activityId: { $in: DEMO_ACTIVITY_IDS } });
    assertCondition(moodFixCatalogCount >= 2, "Mood fix catalog entries exist", "Mood fix catalog entries were not created", failures);
    assertCondition(moodFixLogs.length === 2, "Mood fix workflow created two logs", `Expected 2 mood fix logs, found ${moodFixLogs.length}`, failures);

    const todayReminders = await invokeController(getTodayReminders, {
      params: { userId: DEMO_REMINDER_USER_ID },
    });
    const reminderCounts = await invokeController(getReminderNotificationCounts, {
      params: { userId: DEMO_REMINDER_USER_ID },
    });
    const notifications = await invokeController(getNotifications, {
      params: { userId: DEMO_REMINDER_USER_ID },
    });
    const notificationList = notifications.payload?.data?.notifications || [];

    const reminderStatuses = (todayReminders.payload?.data?.reminders || []).map((reminder) => reminder.status);
    assertCondition(todayReminders.statusCode === 200, "Today's reminders endpoint responded", "Today's reminders endpoint failed", failures);
    assertCondition(reminderStatuses.includes("completed") && reminderStatuses.includes("skipped") && reminderStatuses.includes("pending"), "Reminder status workflow produced completed, skipped, and pending items", "Reminder statuses were not fully populated", failures);
    assertCondition((reminderCounts.payload?.data?.pendingRemindersCount ?? -1) >= 1, "At least one reminder remains pending after the workflow", "Pending reminder count did not match expectations", failures);
    assertCondition((reminderCounts.payload?.data?.unreadNotificationsCount ?? -1) >= 1, "At least one unread missed-reminder notification was created", "Unread notification count did not match expectations", failures);
    assertCondition(notificationList.length >= 3, "Notification list returned the seeded alerts", "Notification list did not contain the seeded alerts", failures);
    assertCondition(notificationList.some((notification) => notification.title === "Reminder missed" || notification.category === "reminder"), "Notification list contained the missed reminder alert", "Notification list did not contain the missed reminder alert", failures);

    const reportHistory = await invokeController(getReportHistory, {
      params: { userId: DEMO_REPORT_USER_ID },
    });
    const reportDetail = await invokeController(getReportById, {
      params: { reportId: String(reportId) },
    });
    const hydratedReport = await hydrateReportMarkerRanges(await LabReport.findById(reportId).lean());
    const clientReport = toClientReport(hydratedReport);

    assertCondition(reportHistory.statusCode === 200, "Report history endpoint responded", "Report history endpoint failed", failures);
    assertCondition((reportHistory.payload?.data?.count ?? 0) === 1, "One demo lab report was seeded", "Demo lab report count did not match", failures);
    assertCondition(reportDetail.statusCode === 200, "Report detail endpoint responded", "Report detail endpoint failed", failures);
    assertCondition(Array.isArray(clientReport?.markers) && clientReport.markers[0]?.normalRange, "Lab report markers were hydrated with biomarker ranges", "Lab report hydration did not add biomarker ranges", failures);

    console.log("\n=== Demo workflow summary ===");
    console.log(`Mood entries: ${moodCount}`);
    console.log(`Mood fix logs: ${moodFixLogs.length}`);
    console.log(`Reminders: ${reminders.length}`);
    console.log(`Lab reports: 1`);

    if (failures.length) {
      failures.forEach((failure, index) => {
        console.error(`${index + 1}. ${failure}`);
      });
      throw new Error(`${failures.length} demo workflow check(s) failed.`);
    }

    console.log("All demo workflow checks passed.");
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Demo workflow seed failed:", error.message);
  process.exitCode = 1;
});