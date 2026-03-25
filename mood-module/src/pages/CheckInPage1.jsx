// pages/CheckInPage1.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../components/Sidebar";
import { useMoodStore } from "../store/moodStore";

const CheckInPage1 = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Zustand store
  const setCurrentCheckIn = useMoodStore((state) => state.setCurrentCheckIn);
  const currentCheckIn = useMoodStore((state) => state.currentCheckIn);

  const [selectedMood, setSelectedMood] = useState('');
  const [note, setNote] = useState('');

  // Load saved draft if exists
  useEffect(() => {
    const savedDraft = localStorage.getItem('moodDraft');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      if (draft.mood) setSelectedMood(draft.mood);
      if (draft.note) setNote(draft.note);
    } else if (currentCheckIn.mood) {
      setSelectedMood(currentCheckIn.mood);
      setNote(currentCheckIn.note);
    }
  }, [currentCheckIn]);

  // Get current date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Mood options with colors
  const moodOptions = [
    { value: 'terrible', label: 'Terrible', emoji: '😫' },
    { value: 'sad', label: 'Sad', emoji: '😔' },
    { value: 'okay', label: 'Okay', emoji: '😐' },
    { value: 'good', label: 'Good', emoji: '🙂' },
    { value: 'great', label: 'Great', emoji: '😊' }
  ];

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
  };

  const handleSaveForLater = () => {
    // Update store and localStorage
    setCurrentCheckIn({
      mood: selectedMood,
      note,
      date: formattedDate
    });

    const draft = { mood: selectedMood, note, date: formattedDate };
    localStorage.setItem('moodDraft', JSON.stringify(draft));

    alert('Progress saved! You can continue later from Mood Track.');
    navigate('/dashboard');
  };

  const handleContinue = () => {
    if (!selectedMood) {
      alert('Please select a mood to continue');
      return;
    }

    // Save to store
    setCurrentCheckIn({
      mood: selectedMood,
      note,
      date: formattedDate
    });

    // Also save draft in case user navigates back
    const draft = { mood: selectedMood, note, date: formattedDate };
    localStorage.setItem('moodDraft', JSON.stringify(draft));

    // Navigate to second check-in page
    navigate('/check-in/details', {
      state: { mood: selectedMood, note, date: formattedDate }
    });
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'} p-8`}>
        {/* Header with Date */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Daily Check-in</h1>
          <p className="text-gray-500 mt-1">{formattedDate}</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Progress</span>
            <span className="text-sm font-medium text-[#0C5BD5]">1 of 2</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0C5BD5] rounded-full transition-all duration-500"
              style={{ width: '50%' }}
            />
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-8">
              How are you feeling right now?
            </h2>

            {/* Mood Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => handleMoodSelect(mood.value)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg
                    ${selectedMood === mood.value 
                      ? 'border-[#0C5BD5] bg-[#0C5BD5]/5' 
                      : 'border-gray-200 hover:border-[#0C5BD5]/30'
                    }`}
                >
                  <div className="text-4xl mb-3">{mood.emoji}</div>
                  <div className="font-semibold text-gray-800">{mood.label}</div>
                </button>
              ))}
            </div>

            {/* Note Section */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's contributing to this feeling? How was your day?... "
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C5BD5] focus:border-transparent resize-none"
                rows="4"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors duration-300"
              >
                ← Back to Dashboard
              </button>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveForLater}
                  className="px-6 py-3 text-gray-600 font-medium hover:text-[#0C5BD5] transition-colors duration-300 border border-gray-200 rounded-xl hover:border-[#0C5BD5]"
                >
                  Save for later
                </button>
                
                <button
                  onClick={handleContinue}
                  disabled={!selectedMood}
                  className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                    selectedMood 
                      ? 'bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] hover:scale-105 shadow-lg cursor-pointer' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Helpful Tips Card */}
        <div className="mt-6 bg-[#0C5BD5]/5 rounded-xl p-4 border border-[#0C5BD5]/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0C5BD5]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#0C5BD5] text-lg">💡</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Mental Health Tip</h3>
              <p className="text-sm text-gray-600 mt-1">
                Regular check-ins help track patterns in your emotional wellbeing. 
                Try to check in at the same time each day for the most accurate insights.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckInPage1;