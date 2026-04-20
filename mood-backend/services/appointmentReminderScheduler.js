import cron from "node-cron";
import Reminder from "../models/reminder.js";
import Notification from "../models/notification.js";

const DEFAULT_TIME_ZONE = "Asia/Colombo";
const DEFAULT_CRON_EXPRESSION = process.env.APPOINTMENT_REMINDER_CRON || "0 18 * * *";
const DEFAULT_SCHEDULER_TIME_ZONE = process.env.APPOINTMENT_REMINDER_TIME_ZONE || DEFAULT_TIME_ZONE;

const ACTIVE_REMINDER_FILTER = {
  $or: [
    { isActive: true },
    { isActive: { $exists: false } },
    { isActive: null },
  ],
};

const WEEKDAY_TO_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_NAME_TO_INDEX = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const getDatePartsInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
};

const formatDateToYMDInTimeZone = (date, timeZone) => {
  const dateParts = getDatePartsInTimeZone(date, timeZone);
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

const getTomorrowDateStringInTimeZone = (date, timeZone) => {
  const dateParts = getDatePartsInTimeZone(date, timeZone);
  const currentDay = new Date(
    Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day))
  );

  currentDay.setUTCDate(currentDay.getUTCDate() + 1);

  return currentDay.toISOString().slice(0, 10);
};

const getDayOfWeekInTimeZone = (date, timeZone) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  return WEEKDAY_TO_INDEX[weekday];
};

const normalizeFrequency = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["once", "one_time", "one time", "single", "single_date", "single date"].includes(normalized)) {
    return "once";
  }

  if (["daily", "everyday", "every_day", "every day"].includes(normalized)) {
    return "daily";
  }

  if (["weekly", "specific_days", "specific_days_of_week", "specific day", "specific days"].includes(normalized)) {
    return "weekly";
  }

  if (["custom", "specific_dates", "specific_dates_of_month", "specific date", "specific dates"].includes(normalized)) {
    return "specific";
  }

  return normalized;
};

const normalizeDayValue = (value) => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }

  const stringValue = String(value || "").trim();

  if (/^\d+$/.test(stringValue)) {
    const numericValue = Number(stringValue);
    if (numericValue >= 0 && numericValue <= 6) {
      return numericValue;
    }
  }

  return DAY_NAME_TO_INDEX[stringValue.toLowerCase()];
};

const getReminderWeekdays = (reminder) => {
  const rawWeekdays = Array.isArray(reminder?.daysOfWeek)
    ? reminder.daysOfWeek
    : Array.isArray(reminder?.specificDays)
      ? reminder.specificDays
      : Array.isArray(reminder?.weekDays)
        ? reminder.weekDays
        : [];

  return rawWeekdays
    .map(normalizeDayValue)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
};

const toYmdDateString = (value, timeZone) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return formatDateToYMDInTimeZone(value, timeZone);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Support canonical date strings with separators like '-', '.', or '/'.
    const normalizedCanonical = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (normalizedCanonical) {
      const [, year, month, day] = normalizedCanonical;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateToYMDInTimeZone(parsed, timeZone);
    }
  }

  return null;
};

const getReminderSpecificDateStrings = (reminder, timeZone) => {
  const rawDates = Array.isArray(reminder?.specificDates)
    ? reminder.specificDates
    : Array.isArray(reminder?.customDates)
      ? reminder.customDates
      : Array.isArray(reminder?.dates)
        ? reminder.dates
        : [];

  return Array.from(
    new Set(
      rawDates
        .map((dateValue) => toYmdDateString(dateValue, timeZone))
        .filter(Boolean)
    )
  );
};

const getReminderOnceDateString = (reminder, timeZone) => {
  if (reminder?.date) {
    return toYmdDateString(reminder.date, timeZone);
  }

  const specificDateStrings = getReminderSpecificDateStrings(reminder, timeZone);
  return specificDateStrings[0] || null;
};

const reminderOccursTomorrow = (reminder, tomorrowDate, tomorrowDayOfWeek, timeZone) => {
  const normalizedFrequency = normalizeFrequency(reminder?.frequency);

  if (normalizedFrequency === "once") {
    const onceDate = getReminderOnceDateString(reminder, timeZone);
    return onceDate === tomorrowDate;
  }

  if (normalizedFrequency === "daily") {
    return true;
  }

  if (normalizedFrequency === "weekly") {
    const weekdays = getReminderWeekdays(reminder);
    return weekdays.includes(tomorrowDayOfWeek);
  }

  if (normalizedFrequency === "specific") {
    const specificDateStrings = getReminderSpecificDateStrings(reminder, timeZone);
    return specificDateStrings.includes(tomorrowDate);
  }

  return false;
};

export const processAppointmentRemindersForTomorrow = async () => {
  const now = new Date();
  const reminders = await Reminder.find({
    ...ACTIVE_REMINDER_FILTER,
    category: "appointment",
  }).lean();

  const createdNotifications = [];

  for (const reminder of reminders) {
    const timeZone = reminder.timezone || DEFAULT_TIME_ZONE;
    const tomorrowDate = getTomorrowDateStringInTimeZone(now, timeZone);
    const tomorrowDayOfWeek = (getDayOfWeekInTimeZone(now, timeZone) + 1) % 7;

    if (!reminderOccursTomorrow(reminder, tomorrowDate, tomorrowDayOfWeek, timeZone)) {
      continue;
    }

    const existingNotification = await Notification.findOne({
      userId: reminder.userId,
      reminderId: reminder._id,
      scheduledDate: tomorrowDate,
      category: "reminder",
      type: "alert",
    }).lean();

    if (existingNotification) {
      continue;
    }

    const notification = await Notification.create({
      userId: reminder.userId,
      reminderId: reminder._id,
      scheduledDate: tomorrowDate,
      title: "Upcoming appointment",
      message: `Appointment tomorrow at ${reminder.time}`,
      type: "alert",
      category: "reminder",
    });

    createdNotifications.push(notification);
  }

  return {
    processed: reminders.length,
    created: createdNotifications.length,
    notifications: createdNotifications,
  };
};

let appointmentReminderJob = null;

export const startAppointmentReminderScheduler = () => {
  if (appointmentReminderJob) {
    return appointmentReminderJob;
  }

  appointmentReminderJob = cron.schedule(
    DEFAULT_CRON_EXPRESSION,
    () => {
      void processAppointmentRemindersForTomorrow().catch((error) => {
        console.error("Failed to process appointment reminder notifications", error);
      });
    },
    {
      timezone: DEFAULT_SCHEDULER_TIME_ZONE,
    }
  );

  console.log(
    `📅 Appointment reminder scheduler started with cron "${DEFAULT_CRON_EXPRESSION}" in ${DEFAULT_SCHEDULER_TIME_ZONE}`
  );

  return appointmentReminderJob;
};