import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Reminder from "../models/reminder.js";
import ReminderLog from "../models/reminderLog.js";
import Notification from "../models/notification.js";
import {
  createReminder,
  getTodayReminders,
  completeReminder,
  skipReminder,
  processMissedReminders,
  getNotifications,
} from "../controllers/reminderController.js";
import { processAppointmentRemindersForTomorrow } from "../services/appointmentReminderScheduler.js";

const TEST_PREFIX = "[REMINDER-FLOW-TEST]";

const makeReq = ({ body = {}, query = {}, params = {} } = {}) => ({
  body,
  query,
  params,
});

const invokeController = async (controller, reqInput) => {
  const req = makeReq(reqInput);

  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({
          statusCode: this.statusCode,
          payload,
        });
      },
    };

    Promise.resolve(controller(req, res)).catch(reject);
  });
};

const formatDateYMD = (date) => date.toISOString().slice(0, 10);

const expect = (condition, passMessage, failMessage, failures) => {
  if (condition) {
    console.log(`PASS: ${passMessage}`);
    return;
  }

  failures.push(failMessage);
  console.error(`FAIL: ${failMessage}`);
};

const cleanupUsersData = async (userIds) => {
  await Promise.all([
    ReminderLog.deleteMany({ userId: { $in: userIds } }),
    Notification.deleteMany({ userId: { $in: userIds } }),
    Reminder.deleteMany({ userId: { $in: userIds } }),
  ]);
};

const createReminderViaController = async ({
  userId,
  title,
  category,
  time,
  frequency = "daily",
  timezone = "Asia/Colombo",
  email,
}) => {
  const response = await invokeController(createReminder, {
    body: {
      userId,
      title,
      description: `${TEST_PREFIX} ${title}`,
      category,
      time,
      frequency,
      createdFrom: "user",
      timezone,
      ...(email ? { email } : {}),
    },
  });

  if (response.statusCode !== 201 || !response.payload?.success) {
    throw new Error(
      `Failed creating reminder \"${title}\" for user ${userId}. Status: ${response.statusCode}`
    );
  }

  return response.payload.data.reminder;
};

const run = async () => {
  const failures = [];
  const userIds = [
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
  ];

  const [userA, userB, userC] = userIds.map((id) => String(id));

  await connectDB();

  try {
    await cleanupUsersData(userIds);

    console.log("\n=== Creating reminders for multiple users ===");
    const reminderAAction = await createReminderViaController({
      userId: userA,
      title: "User A action",
      category: "activity",
      time: "09:00",
    });

    const reminderAMissed = await createReminderViaController({
      userId: userA,
      title: "User A missed candidate",
      category: "mood",
      time: "00:00",
    });

    const reminderBAction = await createReminderViaController({
      userId: userB,
      title: "User B action",
      category: "meditation",
      time: "10:00",
    });

    const reminderCAppointment = await createReminderViaController({
      userId: userC,
      title: "User C appointment",
      category: "appointment",
      time: "14:30",
      email: "appt-test@example.com",
    });

    console.log("\n=== Simulating today reminders fetch ===");
    const todayAInitial = await invokeController(getTodayReminders, {
      query: { userId: userA },
    });
    const todayBInitial = await invokeController(getTodayReminders, {
      query: { userId: userB },
    });

    expect(
      todayAInitial.statusCode === 200 && todayAInitial.payload?.success,
      "Fetched user A reminders for today",
      "Could not fetch user A reminders for today",
      failures
    );
    expect(
      todayBInitial.statusCode === 200 && todayBInitial.payload?.success,
      "Fetched user B reminders for today",
      "Could not fetch user B reminders for today",
      failures
    );

    const userAReminders = todayAInitial.payload?.data?.reminders || [];
    const userBReminders = todayBInitial.payload?.data?.reminders || [];

    expect(
      userAReminders.every((reminder) => String(reminder.userId) === userA),
      "No cross-user reminders returned for user A",
      "Cross-user data leak in user A today reminders",
      failures
    );
    expect(
      userBReminders.every((reminder) => String(reminder.userId) === userB),
      "No cross-user reminders returned for user B",
      "Cross-user data leak in user B today reminders",
      failures
    );

    console.log("\n=== Simulating complete/skip actions ===");
    const completeA = await invokeController(completeReminder, {
      params: { id: String(reminderAAction._id) },
      body: { userId: userA },
    });

    const skipB = await invokeController(skipReminder, {
      params: { id: String(reminderBAction._id) },
      body: { userId: userB },
    });

    expect(
      completeA.statusCode === 201,
      "User A reminder marked completed",
      "User A reminder was not marked completed",
      failures
    );
    expect(
      skipB.statusCode === 201,
      "User B reminder marked skipped",
      "User B reminder was not marked skipped",
      failures
    );

    const duplicateCompleteA = await invokeController(completeReminder, {
      params: { id: String(reminderAAction._id) },
      body: { userId: userA },
    });

    expect(
      duplicateCompleteA.statusCode === 409,
      "Duplicate completion blocked (no duplicate logs)",
      "Duplicate completion was not blocked",
      failures
    );

    const crossUserAttempt = await invokeController(completeReminder, {
      params: { id: String(reminderAAction._id) },
      body: { userId: userB },
    });

    expect(
      crossUserAttempt.statusCode === 403,
      "Cross-user complete attempt blocked",
      "Cross-user complete attempt was allowed",
      failures
    );

    const todayAAfterAction = await invokeController(getTodayReminders, {
      query: { userId: userA },
    });
    const todayBAfterAction = await invokeController(getTodayReminders, {
      query: { userId: userB },
    });

    const todayAStatusMap = new Map(
      (todayAAfterAction.payload?.data?.reminders || []).map((reminder) => [
        String(reminder._id),
        reminder.status,
      ])
    );

    const todayBStatusMap = new Map(
      (todayBAfterAction.payload?.data?.reminders || []).map((reminder) => [
        String(reminder._id),
        reminder.status,
      ])
    );

    expect(
      todayAStatusMap.get(String(reminderAAction._id)) === "completed",
      "Completed status is reflected for user A",
      "Completed status not reflected for user A",
      failures
    );
    expect(
      todayBStatusMap.get(String(reminderBAction._id)) === "skipped",
      "Skipped status is reflected for user B",
      "Skipped status not reflected for user B",
      failures
    );

    const todayDate = formatDateYMD(new Date());
    const duplicateLogsCount = await ReminderLog.countDocuments({
      userId: userA,
      reminderId: reminderAAction._id,
      date: todayDate,
    });

    expect(
      duplicateLogsCount === 1,
      "Only one log exists for a reminder/day/user",
      `Expected 1 log for user A reminder, found ${duplicateLogsCount}`,
      failures
    );

    console.log("\n=== Simulating missed reminders ===");
    const missedFirstRun = await invokeController(processMissedReminders, {
      body: { userId: userA },
    });
    const missedSecondRun = await invokeController(processMissedReminders, {
      body: { userId: userA },
    });

    expect(
      missedFirstRun.statusCode === 200,
      "Missed reminder processing completed (run 1)",
      "Missed reminder processing failed (run 1)",
      failures
    );
    expect(
      missedSecondRun.statusCode === 200,
      "Missed reminder processing completed (run 2)",
      "Missed reminder processing failed (run 2)",
      failures
    );

    const missedNotificationCount = await Notification.countDocuments({
      userId: userA,
      title: "Reminder missed",
      message: `You missed ${reminderAMissed.title}`,
      category: "reminder",
      type: "alert",
    });

    expect(
      missedNotificationCount === 1,
      "Missed reminder notification is deduplicated",
      `Expected 1 missed notification for user A reminder, found ${missedNotificationCount}`,
      failures
    );

    console.log("\n=== Simulating appointment notifications ===");
    await processAppointmentRemindersForTomorrow();
    await processAppointmentRemindersForTomorrow();

    const appointmentNotificationCount = await Notification.countDocuments({
      userId: userC,
      reminderId: reminderCAppointment._id,
      title: "Upcoming appointment",
      category: "reminder",
      type: "alert",
    });

    expect(
      appointmentNotificationCount === 1,
      "Appointment notification is created once",
      `Expected 1 appointment notification for user C reminder, found ${appointmentNotificationCount}`,
      failures
    );

    const userANotifications = await invokeController(getNotifications, {
      params: { userId: userA },
    });

    expect(
      userANotifications.statusCode === 200,
      "Fetched user A notifications",
      "Could not fetch user A notifications",
      failures
    );

    const userANotificationLeak = (userANotifications.payload?.data?.notifications || []).some(
      (notification) => String(notification.userId) !== userA
    );

    expect(
      !userANotificationLeak,
      "No cross-user notifications returned for user A",
      "Cross-user data leak in user A notifications",
      failures
    );

    console.log("\n=== Verification summary ===");
    if (failures.length === 0) {
      console.log("All reminder flow checks passed.");
      return;
    }

    failures.forEach((failure, index) => {
      console.error(`${index + 1}. ${failure}`);
    });

    throw new Error(`${failures.length} reminder flow check(s) failed.`);
  } finally {
    await cleanupUsersData(userIds);
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Reminder flow test script failed:", error.message);
  process.exit(1);
});