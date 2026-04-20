import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getCurrentUserId } from "../config";
import { completeReminder, fetchRemindersToday } from "../api/reminderApi";

const formatTime = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") {
    return "--:--";
  }

  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeValue;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCurrentTimeInReminderZone = (timeZone) => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone || "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(now);

  const valueByType = parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  return `${valueByType.hour}:${valueByType.minute}`;
};

const isReminderDueNow = (reminder) => {
  const reminderTime = String(reminder?.time || "").slice(0, 5);

  if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
    return false;
  }

  const currentTime = getCurrentTimeInReminderZone(reminder?.timezone);
  return reminderTime === currentTime;
};

const NotificationsPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reminders, setReminders] = useState([]);
  const [busyReminderId, setBusyReminderId] = useState("");

  const userId = getCurrentUserId();

  const loadReminders = async () => {
    try {
      setError("");
      const data = await fetchRemindersToday(userId);
      const list = Array.isArray(data?.reminders) ? data.reminders : [];

      const sortedList = [...list].sort((firstReminder, secondReminder) => {
        const firstTime = String(firstReminder?.time || "99:99");
        const secondTime = String(secondReminder?.time || "99:99");
        return firstTime.localeCompare(secondTime);
      });

      setReminders(sortedList);
    } catch (requestError) {
      setError(requestError.message || "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    const refreshNotifications = () => {
      loadReminders();
    };

    const intervalId = window.setInterval(refreshNotifications, 10000);
    window.addEventListener("focus", refreshNotifications);
    document.addEventListener("visibilitychange", refreshNotifications);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshNotifications);
      document.removeEventListener("visibilitychange", refreshNotifications);
    };
  }, [userId]);

  const visibleReminders = useMemo(() => reminders, [reminders]);

  const pendingTodayCount = useMemo(() => {
    return reminders.filter((reminder) => reminder.status !== "completed").length;
  }, [reminders]);

  const doneCount = useMemo(() => reminders.filter((reminder) => reminder.status === "completed").length, [reminders]);

  const handleMarkAsDone = async (reminderId) => {
    if (!reminderId) {
      return;
    }

    setActionError("");
    setBusyReminderId(String(reminderId));

    try {
      await completeReminder(reminderId, userId);
      setReminders((previous) => previous.map((item) => {
        if (String(item._id) !== String(reminderId)) {
          return item;
        }

        return {
          ...item,
          status: "completed",
        };
      }));
    } catch (requestError) {
      setActionError(requestError.message || "Unable to mark reminder as done.");
    } finally {
      setBusyReminderId("");
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Notifications" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
            <p className="text-gray-500 mt-1">Today's reminders stay visible until you mark them as done.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-[#DCE8FF] rounded-xl p-4">
              <p className="text-xs text-gray-500">Due Right Now</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{pendingTodayCount}</p>
            </div>
            <div className="bg-white border border-[#DCE8FF] rounded-xl p-4">
              <p className="text-xs text-gray-500">Completed Today</p>
              <p className="text-2xl font-bold text-[#0C5BD5] mt-1">{doneCount}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <section className="bg-[#DCE6F6] rounded-2xl border border-[#6BB5FF] p-4 sm:p-6">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
                Loading reminders...
              </div>
            ) : visibleReminders.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                No notifications for today yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleReminders.map((reminder) => {
                  const isBusy = busyReminderId === String(reminder._id);
                  const isDone = reminder.status === "completed";

                  return (
                    <article
                      key={String(reminder._id)}
                      className={`bg-white rounded-xl border shadow-sm p-4 sm:p-5 transition ${
                        isDone ? "border-emerald-200 opacity-70" : "border-gray-100"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-800">{reminder.title}</h2>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                isDone
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isDone ? "Done" : "Pending"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{reminder.description || "No description provided."}</p>
                          <p className="text-xs text-gray-500 mt-2">{formatTime(reminder.time)}</p>
                        </div>

                        <button
                          type="button"
                          disabled={isDone || isBusy}
                          onClick={() => handleMarkAsDone(reminder._id)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {isBusy ? "Saving..." : isDone ? "Completed" : "Mark as Done"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
