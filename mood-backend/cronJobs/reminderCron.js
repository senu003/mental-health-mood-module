import cron from "node-cron";
import Reminder from "../models/reminder.js";
import Notification from "../models/notification.js";

const REMINDER_CRON_EXPRESSION = "* * * * *";
const DAILY_RESET_CRON_EXPRESSION = "0 0 * * *";

const ACTIVE_REMINDER_FILTER = {
  $or: [
    { isActive: true },
    { isActive: { $exists: false } },
    { isActive: null },
  ],
};

const normalizeFrequency = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["daily", "everyday", "every_day", "every day"].includes(normalized)) {
    return "daily";
  }

  return normalized;
};

const pad = (value) => String(value).padStart(2, "0");

const getServerTimeHHMM = (date = new Date()) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const getServerDateYMD = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isDisabledForToday = (reminder, todayDate) => {
  if (reminder?.isDisabledToday) {
    return true;
  }

  if (!Array.isArray(reminder?.disabledDates)) {
    return false;
  }

  return reminder.disabledDates.includes(todayDate);
};

export const processReminderNotificationsForCurrentMinute = async () => {
  const now = new Date();
  const currentTime = getServerTimeHHMM(now);
  const todayDate = getServerDateYMD(now);

  console.log(`[ReminderCron] Running minute check at ${todayDate} ${currentTime}`);

  const matchingTimeReminders = await Reminder.find({
    ...ACTIVE_REMINDER_FILTER,
    time: currentTime,
    $or: [
      { isDisabledToday: false },
      { isDisabledToday: { $exists: false } },
      { isDisabledToday: null },
    ],
  }).lean();

  const dailyReminders = matchingTimeReminders.filter((reminder) => (
    normalizeFrequency(reminder.frequency) === "daily"
  ));

  let createdCount = 0;
  let skippedDuplicateCount = 0;

  for (const reminder of dailyReminders) {
    if (isDisabledForToday(reminder, todayDate)) {
      console.log(`[ReminderCron] Skipped disabled reminder ${reminder._id} for user ${reminder.userId}`);
      continue;
    }

    console.log(`[ReminderCron] Triggering reminder ${reminder._id} for user ${reminder.userId} at ${currentTime}`);

    const duplicateNotification = await Notification.findOne({
      userId: reminder.userId,
      reminderId: reminder._id,
      scheduledDate: todayDate,
      time: currentTime,
      category: "reminder",
      type: "alert",
    }).lean();

    if (duplicateNotification) {
      skippedDuplicateCount += 1;
      console.log(`[ReminderCron] Duplicate skipped for reminder ${reminder._id} at ${todayDate} ${currentTime}`);
      continue;
    }

    await Notification.create({
      userId: reminder.userId,
      reminderId: reminder._id,
      scheduledDate: todayDate,
      time: currentTime,
      title: "Reminder",
      message: `It's time for ${reminder.title}`,
      type: "alert",
      category: "reminder",
    });

    createdCount += 1;
    console.log(`[ReminderCron] Notification created for reminder ${reminder._id} at ${todayDate} ${currentTime}`);
  }

  console.log(
    `[ReminderCron] Minute check completed. Checked=${matchingTimeReminders.length}, Daily=${dailyReminders.length}, Created=${createdCount}, DuplicatesSkipped=${skippedDuplicateCount}`
  );

  return {
    checked: matchingTimeReminders.length,
    dailyMatched: dailyReminders.length,
    created: createdCount,
    duplicatesSkipped: skippedDuplicateCount,
  };
};

export const resetDisabledTodayFlags = async () => {
  const result = await Reminder.updateMany(
    { isDisabledToday: true },
    { $set: { isDisabledToday: false } }
  );

  const modifiedCount = result?.modifiedCount || 0;
  console.log(`[ReminderCron] Midnight reset completed. Reset reminders=${modifiedCount}`);

  return {
    resetCount: modifiedCount,
  };
};

let reminderMinuteJob = null;
let reminderMidnightResetJob = null;

export const startReminderCronJobs = () => {
  if (!reminderMinuteJob) {
    reminderMinuteJob = cron.schedule(REMINDER_CRON_EXPRESSION, () => {
      void processReminderNotificationsForCurrentMinute().catch((error) => {
        console.error("[ReminderCron] Failed to process reminders:", error);
      });
    });
  }

  if (!reminderMidnightResetJob) {
    reminderMidnightResetJob = cron.schedule(DAILY_RESET_CRON_EXPRESSION, () => {
      void resetDisabledTodayFlags().catch((error) => {
        console.error("[ReminderCron] Failed to reset disabled reminders:", error);
      });
    });
  }

  console.log("[ReminderCron] Scheduler started. Minute job=* * * * *, reset job=0 0 * * *");

  return {
    reminderMinuteJob,
    reminderMidnightResetJob,
  };
};
