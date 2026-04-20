import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useMoodStore } from "../store/moodStore";
import { createCheckIn } from "../api/moodApi";
import { getCurrentUserId } from "../config";
import { handleError } from "../utils/errorHandler";

const defaultLevels = {
  sleepLevel: 5,
  anxietyLevel: 5,
  energyLevel: 5,
  motivationLevel: 5,
  socialInteraction: 5,
  stressLevel: 5,
  focusLevel: 5
};

const questionConfig = [
  { key: "sleepLevel", label: "How well did you sleep last night" },
  { key: "anxietyLevel", label: "How anxious do you feel today" },
  { key: "energyLevel", label: "Rate your energy level" },
  { key: "motivationLevel", label: "How motivated do you feel?" },
  { key: "socialInteraction", label: "Rate your social interaction today" },
  { key: "stressLevel", label: "How stressed do you feel?" },
  { key: "focusLevel", label: "Rate your focus level" }
];

const getSliderFillPercent = (value) => ((value - 1) / 9) * 100;

const CheckInPage2 = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  const {
    currentCheckIn,
    dashboardData,
    setCurrentCheckIn,
    setDashboardData,
    setLastSubmission,
  } = useMoodStore();
  const { mood, note, date } = currentCheckIn || {};

  const [levels, setLevels] = useState(currentCheckIn?.levels || defaultLevels);

  useEffect(() => {
    if (!mood) navigate("/check-in");
  }, [mood, navigate]);

  useEffect(() => {
    if (currentCheckIn?.levels) setLevels(currentCheckIn.levels);
  }, [currentCheckIn]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: "", message: "" }), 4000);
  };

  const handleLevelChange = (field, value) => {
    const newLevels = { ...levels, [field]: Number(value) };
    setLevels(newLevels);
    setCurrentCheckIn({ ...currentCheckIn, levels: newLevels });
  };

  const validateLevels = () => {
    for (const key in levels) {
      if (levels[key] < 1 || levels[key] > 10) {
        showAlert("error", "All values must be between 1 and 10");
        return false;
      }
    }
    return true;
  };

  const submitCheckIn = async () => {
    if (!validateLevels()) return;

    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const payload = { userId, mood, note: note || "", ...levels };
      const submission = await createCheckIn(payload);

      if (typeof submission?.checkInStreak === "number") {
        setDashboardData({
          ...dashboardData,
          checkInStreak: submission.checkInStreak,
        });
      }

      setLastSubmission(submission || null);

      showAlert("success", "Check-in completed!");

      // Reset current check-in values so a fresh session starts with defaults.
      setLevels(defaultLevels);
      setCurrentCheckIn({
        mood: "",
        note: "",
        date: "",
        levels: defaultLevels,
      });
      localStorage.removeItem("moodDraft");

      // Navigate to summary **before** clearing Zustand
      setTimeout(() => {
        navigate("/check-in/summary", {
          state: {
            mood,
            note,
            levels,
            date: date || new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            mentalHealthScore: submission?.mentalHealthScore,
            checkInStreak: submission?.checkInStreak,
            isFirstCheckInToday: submission?.isFirstCheckInToday,
            checkInId: submission?._id || submission?.saved?._id || submission?.data?._id,
          }
        });
      }, 1200);

    } catch (err) {
      showAlert("error", handleError(err, "CheckInPage2.submitCheckIn"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        {alert.show && (
          <div className={`fixed top-5 right-5 p-4 rounded-xl shadow-lg text-white z-[60]
            ${alert.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {alert.message}
          </div>
        )}

        <section className="w-full max-w-none">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Daily Check-in</h1>
            <p className="text-gray-500 mt-1">Help us understand your wellbeing</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm font-medium text-[#0C5BD5]">2 of 2</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#0C5BD5] rounded-full transition-all duration-500" style={{ width: "100%" }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 space-y-4">
            {questionConfig.map((question) => (
              <div
                key={question.key}
                className="rounded-xl border border-gray-200 bg-white px-6 py-5"
              >
                <h2 className="text-2xl font-semibold leading-tight text-gray-800 mb-5">{question.label}</h2>

                <div className="mb-2 flex items-center justify-between text-[12px] text-gray-500">
                  <span>Not at all</span>
                  <span>Extremely</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={levels[question.key]}
                  onChange={(e) => handleLevelChange(question.key, e.target.value)}
                  style={{
                    background: `linear-gradient(to right, #0C5BD5 0%, #0C5BD5 ${getSliderFillPercent(levels[question.key])}%, #dbdcde ${getSliderFillPercent(levels[question.key])}%, #dbdcde 100%)`
                  }}
                  className="w-full h-2 rounded-full bg-[#dbdcde] appearance-none cursor-pointer accent-[#0C5BD5]
                    [&::-webkit-slider-runnable-track]:h-2
                    [&::-webkit-slider-runnable-track]:rounded-full
                    [&::-webkit-slider-runnable-track]:bg-transparent
                    [&::-moz-range-track]:h-2
                    [&::-moz-range-track]:rounded-full
                    [&::-moz-range-track]:bg-transparent
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:mt-[-5px]
                    [&::-webkit-slider-thumb]:h-[18px]
                    [&::-webkit-slider-thumb]:w-[18px]
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border
                    [&::-webkit-slider-thumb]:border-[#0C5BD5]
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-moz-range-thumb]:h-[18px]
                    [&::-moz-range-thumb]:w-[18px]
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border
                    [&::-moz-range-thumb]:border-[#0C5BD5]
                    [&::-moz-range-thumb]:bg-white"
                />

                <div className="mt-3 flex justify-center">
                  <span className="inline-flex min-w-12 justify-center rounded-full bg-[#0C5BD5] px-4 py-[3px] text-xs font-medium text-white">
                    {levels[question.key]}/10
                  </span>
                </div>
              </div>
            ))}
            </div>

            <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={() => navigate(-1)}
                className="h-12 min-w-[150px] rounded-xl border border-[#0C5BD5] bg-white px-8 text-sm font-medium text-[#0C5BD5] hover:bg-[#f0f6ff]"
              >
                Back
              </button>

              <button
                onClick={submitCheckIn}
                disabled={loading}
                className="h-12 min-w-[180px] rounded-xl bg-[#0C5BD5] px-8 text-sm font-semibold text-white hover:bg-[#0A4AB0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                  {loading ? "Saving..." : "Complete Check-in"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CheckInPage2;