import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AverageIcon from "../assets/AverageIcon";
import HistoryIcon from "../assets/HistoryIcon";
import InsightIcon from "../assets/InsightIcon";
import { useMoodHistoryData } from "../hooks/useMood";
import { moodMap } from "../constants/moodMap";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const moodVisual = {
  terrible: { color: "#DC2626", label: "Terrible" },
  sad: { color: "#F97316", label: "Sad" },
  okay: { color: "#EAB308", label: "Okay" },
  good: { color: "#3B82F6", label: "Good" },
  great: { color: "#16A34A", label: "Great" },
};

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatDateLong = (dateKey) => {
  if (!dateKey) return "Select a date";
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (isoDate) => {
  const d = new Date(isoDate);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatPct = (value) => {
  const n = Number(value || 0);
  if (n > 0) return `+${n}%`;
  return `${n}%`;
};

const SummaryCard = ({ icon: Icon, title, value, subtitle }) => {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: "rgba(12, 91, 213, 0.14)" }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
          <Icon className="w-6 h-6 text-[#0C5BD5] relative z-10" />
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

const MoodHistory = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "calendar"
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { moodHistoryData, moodHistoryLoading, moodHistoryError } = useMoodHistoryData();
  const entries = moodHistoryData?.entries || [];
  const insights = moodHistoryData?.insights;

  const groupedByDate = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const key = getDateKey(entry.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [entries]);

  const latestDateWithData = useMemo(() => {
    const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
    return dates[0] || "";
  }, [groupedByDate]);

  const [selectedDate, setSelectedDate] = useState("");

  const effectiveSelectedDate = selectedDate || latestDateWithData;
  const selectedEntries = groupedByDate[effectiveSelectedDate] || [];

  const monthData = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startOffset; i++) {
      days.push({ key: `pad-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = getDateKey(date);
      const items = groupedByDate[key] || [];
      const avgMood =
        items.length > 0
          ? items.reduce((sum, item) => sum + (moodMap[item.mood] || 0), 0) / items.length
          : 0;

      days.push({
        key,
        empty: false,
        day,
        dateKey: key,
        entriesCount: items.length,
        avgMood,
      });
    }

    return { days, monthLabel: visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }, [visibleMonth, groupedByDate]);

  if (moodHistoryLoading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Appointment History" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <div className="h-[70vh] flex items-center justify-center text-gray-500">Loading mood history...</div>
        </main>
      </div>
    );
  }

  if (moodHistoryError) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Appointment History" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <div className="h-[70vh] flex items-center justify-center text-red-600">{moodHistoryError}</div>
        </main>
      </div>
    );
  }

  const weeklySummary = insights?.weeklySummary;
  const recovery = insights?.recoveryProgress;
  const moodDistribution = insights?.moodDistribution || {};
  const totalDistribution = Object.values(moodDistribution).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Appointment History" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Mood History</h1>
            <p className="text-gray-500 mt-1">Weekly analytics and full check-in calendar</p>
          </div>
          <button
            onClick={() => navigate("/check-in")}
            className="bg-[#0C5BD5] text-white px-5 py-2.5 rounded-xl hover:bg-[#0A4AB0]"
          >
            New Check-in
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setViewMode("chart")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "chart"
                ? "bg-[#0C5BD5] text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Chart View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-[#0C5BD5] text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Calendar View
          </button>
        </div>

        {viewMode === "chart" && (
          <>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <SummaryCard
            icon={AverageIcon}
            title="Avg Mood (7d)"
            value={`${weeklySummary?.averageMoodScore ?? 0}/10`}
          />
          <SummaryCard
            icon={HistoryIcon}
            title="Total Check-ins (7d)"
            value={weeklySummary?.totalCheckIns ?? 0}
          />
          <SummaryCard
            icon={InsightIcon}
            title="Best Day"
            value={weeklySummary?.bestDay?.day || "-"}
            subtitle={weeklySummary?.bestDay?.date || "No data"}
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Mood Score Trend View</h2>
            <p className="text-sm text-gray-500">Past 7 days</p>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end min-h-[180px]">
            {(weeklySummary?.dailyMoodAverages || []).map((item) => (
              <div key={item.date} className="flex flex-col items-center">
                <div className="w-full max-w-[42px] h-[120px] bg-[#E9F0FB] rounded-xl relative overflow-hidden">
                  <div
                    className="absolute left-0 bottom-0 w-full bg-[#0C5BD5] rounded-xl transition-all duration-500"
                    style={{ height: `${Math.max(4, (item.averageMoodScore / 10) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{item.day}</p>
                <p className="text-xs text-gray-700 font-medium">{item.averageMoodScore}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recovery Progress</h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-700 font-medium">Overall Recovery Score</span>
                <span className="font-bold text-blue-600">{recovery?.currentAverages?.overallRecovery ?? 0}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Overall Change</span>
                <span className="font-semibold text-gray-900">{formatPct(recovery?.overallRecoveryChangePct)}</span>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sleep Quality</span>
                <span className="font-semibold text-green-600">{formatPct(recovery?.sleepQualityIncreasePct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Anxiety Level</span>
                <span className="font-semibold text-blue-600">{formatPct(recovery?.anxietyLevelDecreasePct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Stress Level</span>
                <span className="font-semibold text-orange-600">{formatPct(recovery?.stressLevelDecreasePct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Energy Level</span>
                <span className="font-semibold text-purple-600">{formatPct(recovery?.energyLevelIncreasePct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Motivation</span>
                <span className="font-semibold text-indigo-600">{formatPct(recovery?.motivationLevelIncreasePct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Focus Level</span>
                <span className="font-semibold text-cyan-600">{formatPct(recovery?.focusLevelIncreasePct)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Social Interaction</span>
                <span className="font-semibold text-pink-600">{formatPct(recovery?.socialInteractionIncreasePct)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Mood Distribution</h2>
            <div className="space-y-3">
              {["great", "good", "okay", "sad", "terrible"].map((key) => {
                const count = moodDistribution[key] || 0;
                const pct = totalDistribution ? Math.round((count / totalDistribution) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium" style={{ color: moodVisual[key].color }}>
                        {moodVisual[key].label}
                      </span>
                      <span className="text-gray-600">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: moodVisual[key].color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
          </>
        )}

        {viewMode === "calendar" && (
          <>
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Calendar View</h2>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-[#f8fafc] p-1">
                <button
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                    )
                  }
                  className="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-[#eaf1ff] hover:text-[#0C5BD5] transition"
                  aria-label="Previous month"
                >
                  <span className="text-base">&#8249;</span>
                </button>
                <p className="min-w-[170px] text-center text-sm font-semibold text-gray-700 px-2">{monthData.monthLabel}</p>
                <button
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                    )
                  }
                  className="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-[#eaf1ff] hover:text-[#0C5BD5] transition"
                  aria-label="Next month"
                >
                  <span className="text-base">&#8250;</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-xs font-semibold text-gray-500 text-center py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthData.days.map((cell) => {
                if (cell.empty) {
                  return <div key={cell.key} className="h-20 rounded-lg bg-gray-50" />;
                }

                const isSelected = effectiveSelectedDate === cell.dateKey;
                const hasData = cell.entriesCount > 0;
                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDate(cell.dateKey)}
                    className={`h-20 rounded-lg border p-2 text-left transition ${
                      isSelected
                        ? "border-[#0C5BD5] bg-[#0C5BD5]/10"
                        : hasData
                        ? "border-blue-100 bg-blue-50/40 hover:border-blue-300"
                        : "border-gray-100 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-700">{cell.day}</div>
                    {hasData && (
                      <>
                        <div className="text-[11px] text-gray-500 mt-1">{cell.entriesCount} check-ins</div>
                        <div className="text-[11px] font-semibold text-[#0C5BD5]">Avg {cell.avgMood.toFixed(1)}</div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Selected Date</h3>
            <p className="text-base font-semibold text-gray-900 mb-4">{formatDateLong(effectiveSelectedDate)}</p>

            {!selectedEntries.length && (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No check-ins for this day.
              </div>
            )}

            {!!selectedEntries.length && (
              <div className="space-y-2 max-h-[430px] overflow-auto pr-1">
                {selectedEntries.map((entry) => {
                  const visual = moodVisual[entry.mood] || moodVisual.okay;
                  return (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: visual.color }}>
                          {visual.label}
                        </p>
                        <p className="text-xs text-gray-500">{entry.note || "No note"}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatTime(entry.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MoodHistory;
