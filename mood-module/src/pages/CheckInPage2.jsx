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
            checkInId: submission?.saved?._id || submission?.data?._id,
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
    <div className="flex bg-[#f3f3f4] min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main
        className={`flex-1 transition-all duration-300 ml-0 ${
          collapsed ? "md:ml-20" : "md:ml-64"
        } px-4 sm:px-6 py-6 sm:py-8`}
      >
        {alert.show && (
          <div className={`fixed top-5 right-5 p-4 rounded-xl shadow-lg text-white z-[60]
            ${alert.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {alert.message}
          </div>
        )}

        <section className="mx-auto w-full max-w-[760px]">
          <div className="mb-6 sm:mb-7">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-[15px] text-gray-700 hover:text-gray-900"
            >
              <span className="text-lg leading-none">&#8592;</span>
              <span>Back</span>
            </button>
            <h1 className="mt-3 text-[30px] leading-none font-semibold text-[#171717]">Assesment Question</h1>
            <p className="mt-1 text-sm text-gray-500">Help us understand your wellbeing</p>
          </div>

          <div className="rounded-lg border border-[#dfdfe2] bg-white px-4 py-3 sm:px-5 sm:py-4 mb-5">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>3 of 3</span>
            </div>
            <div className="h-[6px] w-full rounded-full bg-[#dedee1] overflow-hidden">
              <div className="h-full w-full rounded-full bg-[#1f66e5]" />
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {questionConfig.map((question) => (
              <div
                key={question.key}
                className="rounded-lg border border-[#d9dadd] bg-white px-4 py-4 sm:px-6 sm:py-5"
              >
                <h2 className="text-[22px] font-medium leading-tight text-[#181818] mb-5">{question.label}</h2>

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
                  className="w-full h-2 rounded-full bg-[#dbdcde] appearance-none cursor-pointer accent-[#1f66e5]
                    [&::-webkit-slider-runnable-track]:h-2
                    [&::-webkit-slider-runnable-track]:rounded-full
                    [&::-webkit-slider-runnable-track]:bg-[#dbdcde]
                    [&::-moz-range-track]:h-2
                    [&::-moz-range-track]:rounded-full
                    [&::-moz-range-track]:bg-[#dbdcde]
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:mt-[-5px]
                    [&::-webkit-slider-thumb]:h-[18px]
                    [&::-webkit-slider-thumb]:w-[18px]
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border
                    [&::-webkit-slider-thumb]:border-[#1f66e5]
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-moz-range-thumb]:h-[18px]
                    [&::-moz-range-thumb]:w-[18px]
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border
                    [&::-moz-range-thumb]:border-[#1f66e5]
                    [&::-moz-range-thumb]:bg-white"
                />

                <div className="mt-3 flex justify-center">
                  <span className="inline-flex min-w-12 justify-center rounded-full bg-[#0c4cb3] px-4 py-[3px] text-xs font-medium text-white">
                    {levels[question.key]}/10
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-12 min-w-[150px] rounded-lg border border-[#1f66e5] bg-white px-8 text-sm font-medium text-[#1f66e5] hover:bg-[#f0f5ff]"
            >
              Back
            </button>

            <button
              onClick={submitCheckIn}
              disabled={loading}
              className="h-12 min-w-[180px] rounded-lg bg-[#0c4cb3] px-8 text-sm font-semibold text-white hover:bg-[#0a429d] disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loading ? "Saving..." : "Complete Check-in"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CheckInPage2;