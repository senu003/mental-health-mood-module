import Reminder from "../models/reminder.js";
import ReminderLog from "../models/reminderLog.js";
import Notification from "../models/notification.js";
import { apiSuccess, apiFail } from "../utils/apiResponse.js";
import { sendAppointmentReminderEmail } from "../services/emailService.js";

const DEFAULT_TIME_ZONE = "Asia/Colombo";

const formatDateToYMD = (date) => date.toISOString().slice(0, 10);

const formatDateToYMDInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const dateParts = parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

const getMinutesInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const timeParts = parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  return Number(timeParts.hour) * 60 + Number(timeParts.minute);
};

const parseTimeToMinutes = (time) => {
  const [hours, minutes] = String(time).split(":").map(Number);
  return (hours * 60) + minutes;
};

const ACTIVE_REMINDER_FILTER = {
  $or: [
    { isActive: true },
    { isActive: { $exists: false } },
    { isActive: null },
  ],
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

const normalizeDateList = (values, timeZone) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => toYmdDateString(value, timeZone))
        .filter(Boolean)
    )
  ).sort();
};

const toYmdDateString = (value, timeZone) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return timeZone
      ? formatDateToYMDInTimeZone(value, timeZone)
      : formatDateToYMD(value);
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
      return timeZone
        ? formatDateToYMDInTimeZone(parsed, timeZone)
        : formatDateToYMD(parsed);
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

  return normalizeDateList(rawDates, timeZone);
};

const getReminderOnceDateString = (reminder, timeZone) => {
  if (reminder?.date) {
    return toYmdDateString(reminder.date, timeZone);
  }

  const specificDateStrings = getReminderSpecificDateStrings(reminder, timeZone);
  return specificDateStrings[0] || null;
};

const buildScheduleFields = ({ source, timeZone, requireFrequency }) => {
  const frequency = normalizeFrequency(source?.frequency);

  if (!frequency) {
    if (requireFrequency) {
      return { error: "Frequency is required." };
    }

    return {
      frequency,
      date: undefined,
      daysOfWeek: [],
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "once") {
    const date = toYmdDateString(source?.date, timeZone)
      || normalizeDateList(source?.specificDates, timeZone)[0]
      || normalizeDateList(source?.customDates, timeZone)[0];

    if (!date) {
      return { error: "A date is required for once frequency." };
    }

    return {
      frequency,
      date,
      daysOfWeek: [],
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "daily") {
    return {
      frequency,
      date: undefined,
      daysOfWeek: [],
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "weekly") {
    const daysOfWeek = Array.from(
      new Set(
        (Array.isArray(source?.daysOfWeek) ? source.daysOfWeek : [])
          .map(normalizeDayValue)
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      )
    ).sort((a, b) => a - b);

    if (daysOfWeek.length === 0) {
      return { error: "Select at least one day for weekly frequency." };
    }

    return {
      frequency,
      date: undefined,
      daysOfWeek,
      specificDates: [],
      customDates: [],
    };
  }

  if (frequency === "specific") {
    const specificDates = normalizeDateList(
      Array.isArray(source?.specificDates)
        ? source.specificDates
        : source?.customDates,
      timeZone
    );

    if (specificDates.length === 0) {
      return { error: "Select at least one date for specific frequency." };
    }

    return {
      frequency,
      date: undefined,
      daysOfWeek: [],
      specificDates,
      customDates: [],
    };
  }

  return { error: "Invalid frequency value." };
};

const reminderOccursOnDate = ({ reminder, dateYMD, dayOfWeek, timeZone }) => {
  const normalizedFrequency = normalizeFrequency(reminder?.frequency);

  if (normalizedFrequency === "once") {
    const onceDate = getReminderOnceDateString(reminder, timeZone);
    return onceDate === dateYMD;
  }

  if (normalizedFrequency === "daily") {
    return true;
  }

  if (normalizedFrequency === "weekly") {
    const weekdays = getReminderWeekdays(reminder);
    return weekdays.includes(dayOfWeek);
  }

  if (normalizedFrequency === "specific") {
    const specificDateStrings = getReminderSpecificDateStrings(reminder, timeZone);
    return specificDateStrings.includes(dateYMD);
  }

  return false;
};

const getReminderDisabledDates = (reminder) => (
  Array.isArray(reminder?.disabledDates)
    ? reminder.disabledDates.map((value) => String(value).trim()).filter(Boolean)
    : []
);

const shouldShowReminder = (reminder, currentDate = new Date()) => {
  const timeZone = reminder?.timezone || DEFAULT_TIME_ZONE;
  const currentDateYMD = formatDateToYMDInTimeZone(currentDate, timeZone);

  if (reminder?.isDisabledToday) {
    return false;
  }

  if (getReminderDisabledDates(reminder).includes(currentDateYMD)) {
    return false;
  }

  const currentDayOfWeek = new Date(`${currentDateYMD}T00:00:00`).getDay();

  return reminderOccursOnDate({
    reminder,
    dateYMD: currentDateYMD,
    dayOfWeek: currentDayOfWeek,
    timeZone,
  });
};

const getTodaysRemindersWithStatus = async (userId) => {
  const today = new Date();
  const todayDay = today.getDay();
  const todayDate = formatDateToYMD(today);
  const reminders = await Reminder.find({
    userId,
    ...ACTIVE_REMINDER_FILTER,
  }).lean();

  const remindersScheduledToday = reminders.filter((reminder) => {
    return shouldShowReminder(reminder, today);
  });

  const scheduledDateByReminderId = new Map(
    remindersScheduledToday.map((reminder) => {
      const timeZone = reminder.timezone || "Asia/Colombo";
      return [String(reminder._id), formatDateToYMDInTimeZone(today, timeZone)];
    })
  );

  const reminderIds = remindersScheduledToday.map((reminder) => reminder._id);
  const reminderDates = [...new Set(scheduledDateByReminderId.values())];

  const todayLogs = reminderIds.length
    ? await ReminderLog.find({
      userId,
      date: { $in: reminderDates },
      reminderId: { $in: reminderIds },
    })
      .select("reminderId date status")
      .lean()
    : [];

  const statusByReminderId = new Map(
    todayLogs.map((log) => [`${String(log.reminderId)}|${log.date}`, log.status])
  );

  const remindersWithStatus = remindersScheduledToday
    .map((reminder) => ({
      ...reminder,
      disabledToday: !shouldShowReminder(reminder, today),
      status: statusByReminderId.get(
        `${String(reminder._id)}|${scheduledDateByReminderId.get(String(reminder._id))}`
      ) || "pending",
    }))
    .sort((firstReminder, secondReminder) => parseTimeToMinutes(firstReminder.time) - parseTimeToMinutes(secondReminder.time));

  return {
    todayDate,
    todayDay,
    reminders: remindersWithStatus,
  };
};

const getRequestUserId = (req) => req.body?.userId || req.query?.userId;
const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object || {}, field);
const getAppointmentRecipientEmail = (req) => (
  req.body?.email
  || req.body?.userEmail
  || req.body?.recipientEmail
  || req.body?.user?.email
);

const buildReminderPayload = (req) => {
  const reminderPayload = {
    ...req.body,
    createdFrom: req.body?.createdFrom || "user",
  };

  delete reminderPayload.email;
  delete reminderPayload.userEmail;
  delete reminderPayload.recipientEmail;
  delete reminderPayload.user;

  return reminderPayload;
};

export const createReminder = async (req, res) => {
  const userId = getRequestUserId(req);

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminderPayload = buildReminderPayload(req);
  const reminderCategory = reminderPayload.category;
  const recipientEmail = reminderCategory === "appointment"
    ? getAppointmentRecipientEmail(req)
    : null;

  if (reminderCategory === "appointment" && !recipientEmail) {
    return res.status(400).json(apiFail("email is required for appointment reminders."));
  }

  const scheduleFields = buildScheduleFields({
    source: reminderPayload,
    timeZone: reminderPayload.timezone || DEFAULT_TIME_ZONE,
    requireFrequency: true,
  });

  if (scheduleFields.error) {
    return res.status(400).json(apiFail(scheduleFields.error));
  }

  const reminder = await Reminder.create({
    ...reminderPayload,
    ...scheduleFields,
    userId,
  });

  let emailSent = false;

  if (recipientEmail) {
    try {
      await sendAppointmentReminderEmail({
        to: recipientEmail,
        reminder,
      });
      emailSent = true;
    } catch (error) {
      console.error("Failed to send appointment reminder email", error);
    }
  }

  return res.status(201).json(
    apiSuccess(
      {
        reminder,
        emailSent,
      },
      reminderCategory === "appointment"
        ? "Appointment reminder created"
        : "Reminder created"
    )
  );
};

const createReminderLogForToday = async (req, res, status) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId).lean();

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to update this reminder."));
  }

  const timeZone = reminder.timezone || "Asia/Colombo";
  const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);
  const existingLog = await ReminderLog.findOne({
    userId,
    reminderId,
    date: todayDate,
  }).lean();

  if (existingLog) {
    return res.status(409).json(
      apiFail(`Reminder already marked as ${existingLog.status} for today.`)
    );
  }

  let log;
  try {
    log = await ReminderLog.create({
      userId,
      reminderId,
      date: todayDate,
      status,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json(
        apiFail("Reminder already has a log for today.")
      );
    }
    throw error;
  }

  if (status === "skipped") {
    // Off Today should suppress any missed reminder alert for this reminder on the same date.
    await Notification.deleteMany({
      userId,
      reminderId,
      category: "reminder",
      scheduledDate: todayDate,
    });
  }

  return res.status(201).json(
    apiSuccess(
      {
        reminderId,
        date: todayDate,
        status: log.status,
      },
      `Reminder marked as ${status}`
    )
  );
};

export const getTodayReminders = async (req, res) => {
  const userId = req.params.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const {
    todayDate,
    todayDay,
    reminders: sortedReminders,
  } = await getTodaysRemindersWithStatus(userId);

  return res.json(
    apiSuccess(
      {
        date: todayDate,
        day: todayDay,
        reminders: sortedReminders,
        count: sortedReminders.length,
      },
      "Today's reminders retrieved"
    )
  );
};

export const getReminderNotificationCounts = async (req, res) => {
  const userId = req.params.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const { reminders } = await getTodaysRemindersWithStatus(userId);
  const pendingRemindersCount = reminders.filter((reminder) => reminder.status === "pending" && !reminder.disabledToday).length;

  const unreadNotificationsCount = await Notification.countDocuments({
    userId,
    isRead: false,
  });

  return res.json(
    apiSuccess(
      {
        pendingRemindersCount,
        unreadNotificationsCount,
      },
      "Reminder and notification counts retrieved"
    )
  );
};

export const getNotifications = async (req, res) => {
  const userId = req.params.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return res.json(
    apiSuccess(
      {
        notifications,
        count: notifications.length,
      },
      "Notifications retrieved"
    )
  );
};

export const markNotificationRead = async (req, res) => {
  const userId = getRequestUserId(req);
  const notificationId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const notification = await Notification.findById(notificationId).lean();

  if (!notification) {
    return res.status(404).json(apiFail("Notification not found."));
  }

  if (String(notification.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to update this notification."));
  }

  if (notification.isRead) {
    return res.json(
      apiSuccess(
        {
          notificationId,
          isRead: true,
        },
        "Notification already marked as read"
      )
    );
  }

  await Notification.updateOne({ _id: notificationId }, { $set: { isRead: true } });

  return res.json(
    apiSuccess(
      {
        notificationId,
        isRead: true,
      },
      "Notification marked as read"
    )
  );
};

export const completeReminder = async (req, res) => createReminderLogForToday(req, res, "completed");

export const skipReminder = async (req, res) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId).lean();

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to update this reminder."));
  }

  const timeZone = reminder.timezone || DEFAULT_TIME_ZONE;
  const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);

  await Reminder.updateOne(
    { _id: reminderId },
    {
      $addToSet: { disabledDates: todayDate },
      $set: { isDisabledToday: true },
    }
  );

  await Notification.deleteMany({
    userId,
    reminderId,
    category: "reminder",
    scheduledDate: todayDate,
  });

  return res.json(
    apiSuccess(
      {
        reminderId,
        date: todayDate,
        disabledToday: true,
      },
      "Reminder turned off for today"
    )
  );
};

export const reactivateReminderForToday = async (req, res) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId).lean();

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to update this reminder."));
  }

  const timeZone = reminder.timezone || DEFAULT_TIME_ZONE;
  const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);

  await Reminder.updateOne(
    { _id: reminderId },
    {
      $pull: { disabledDates: todayDate },
      $set: { isDisabledToday: false },
    }
  );

  return res.json(
    apiSuccess(
      {
        reminderId,
        date: todayDate,
        status: "pending",
      },
      "Reminder reactivated for today"
    )
  );
};

export const updateReminder = async (req, res) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId);

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to update this reminder."));
  }

  const scheduleFieldsTouched = ["frequency", "date", "daysOfWeek", "specificDates", "customDates"]
    .some((field) => hasOwn(req.body, field));

  if (scheduleFieldsTouched) {
    const nextTimeZone = req.body.timezone || reminder.timezone || DEFAULT_TIME_ZONE;
    const mergedScheduleSource = {
      frequency: hasOwn(req.body, "frequency") ? req.body.frequency : reminder.frequency,
      date: hasOwn(req.body, "date") ? req.body.date : reminder.date,
      daysOfWeek: hasOwn(req.body, "daysOfWeek") ? req.body.daysOfWeek : reminder.daysOfWeek,
      specificDates: hasOwn(req.body, "specificDates")
        ? req.body.specificDates
        : (Array.isArray(reminder.specificDates) ? reminder.specificDates : reminder.customDates),
      customDates: hasOwn(req.body, "customDates")
        ? req.body.customDates
        : (Array.isArray(reminder.customDates) ? reminder.customDates : reminder.specificDates),
    };

    const normalizedSchedule = buildScheduleFields({
      source: mergedScheduleSource,
      timeZone: nextTimeZone,
      requireFrequency: true,
    });

    if (normalizedSchedule.error) {
      return res.status(400).json(apiFail(normalizedSchedule.error));
    }

    reminder.frequency = normalizedSchedule.frequency;
    reminder.date = normalizedSchedule.date;
    reminder.daysOfWeek = normalizedSchedule.daysOfWeek;
    reminder.specificDates = normalizedSchedule.specificDates;
    reminder.customDates = normalizedSchedule.customDates;
  }

  const allowedFields = [
    "title",
    "description",
    "category",
    "time",
    "disabledDates",
    "isActive",
    "timezone",
  ];

  const previousDisabledDates = getReminderDisabledDates(reminder);

  allowedFields.forEach((field) => {
    if (hasOwn(req.body, field)) {
      reminder[field] = req.body[field];
    }
  });

  const updatedReminder = await reminder.save();

  if (hasOwn(req.body, "disabledDates")) {
    const timeZone = updatedReminder.timezone || reminder.timezone || DEFAULT_TIME_ZONE;
    const todayDate = formatDateToYMDInTimeZone(new Date(), timeZone);
    const hadTodayBefore = previousDisabledDates.includes(todayDate);
    const hasTodayAfter = getReminderDisabledDates(updatedReminder).includes(todayDate);

    if (!hadTodayBefore && hasTodayAfter) {
      await Notification.deleteMany({
        userId,
        reminderId,
        category: "reminder",
        scheduledDate: todayDate,
      });
    }

    await Reminder.updateOne(
      { _id: reminderId },
      { $set: { isDisabledToday: hasTodayAfter } }
    );
  }

  return res.json(
    apiSuccess(
      {
        reminder: updatedReminder,
      },
      "Reminder updated"
    )
  );
};

export const deleteReminder = async (req, res) => {
  const userId = getRequestUserId(req);
  const reminderId = req.params.id;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reminder = await Reminder.findById(reminderId).lean();

  if (!reminder) {
    return res.status(404).json(apiFail("Reminder not found."));
  }

  if (String(reminder.userId) !== String(userId)) {
    return res.status(403).json(apiFail("You are not allowed to delete this reminder."));
  }

  await Reminder.deleteOne({ _id: reminderId });
  await ReminderLog.deleteMany({ userId, reminderId });
  await Notification.deleteMany({
    userId,
    reminderId,
    category: "reminder",
  });

  return res.json(
    apiSuccess(
      {
        reminderId,
      },
      "Reminder deleted"
    )
  );
};

export const processMissedReminders = async (req, res) => {
  const userId = getRequestUserId(req);
  const now = new Date();

  const reminders = await Reminder.find({
    ...ACTIVE_REMINDER_FILTER,
    ...(userId ? { userId } : {}),
  }).lean();

  const missedNotifications = [];

  for (const reminder of reminders) {
    const timeZone = reminder.timezone || "Asia/Colombo";
    const todayDate = formatDateToYMDInTimeZone(now, timeZone);

    if (!shouldShowReminder(reminder, now)) {
      continue;
    }

    const currentMinutes = getMinutesInTimeZone(now, timeZone);
    const reminderMinutes = parseTimeToMinutes(reminder.time);

    if (currentMinutes < reminderMinutes) {
      continue;
    }

    const alreadyTriggeredToday = reminder.lastTriggeredAt
      ? formatDateToYMDInTimeZone(reminder.lastTriggeredAt, timeZone) === todayDate
      : false;

    if (alreadyTriggeredToday) {
      continue;
    }

    const existingLog = await ReminderLog.findOne({
      userId: reminder.userId,
      reminderId: reminder._id,
      date: todayDate,
    }).lean();

    if (existingLog) {
      continue;
    }

    const notification = await Notification.create({
      userId: reminder.userId,
      title: "Reminder missed",
      message: `You missed ${reminder.title}`,
      type: "alert",
      category: "reminder",
      reminderId: reminder._id,
      scheduledDate: todayDate,
    });

    await Reminder.updateOne(
      { _id: reminder._id },
      { $set: { lastTriggeredAt: now } }
    );

    missedNotifications.push(notification);
  }

  return res.json(
    apiSuccess(
      {
        processed: reminders.length,
        created: missedNotifications.length,
        notifications: missedNotifications,
      },
      "Missed reminder notifications processed"
    )
  );
};