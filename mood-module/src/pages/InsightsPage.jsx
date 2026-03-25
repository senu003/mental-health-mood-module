import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useInsightsData } from "../hooks/useMood";

const InsightsPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { insights, insightsLoading, insightsError } = useInsightsData();

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Mood Insights</h1>
          <p className="text-gray-500 mt-1">Insights are loaded from backend and refreshed once per day.</p>
        </div>

        {insightsLoading && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-gray-600">Loading insights...</div>
        )}

        {insightsError && (
          <div className="bg-white rounded-xl border border-red-100 p-8 text-red-600">{insightsError}</div>
        )}

        {!insightsLoading && !insightsError && insights && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Summary</h2>
              <p className="text-sm text-gray-700">{insights.summaryText || insights.summary || "No summary available."}</p>
              <p className="text-sm text-gray-600 mt-2">
                Overall Mood Trend: <span className="font-semibold text-gray-800">{insights.overallMoodTrend || insights.moodTrend || "stable"}</span>
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Pattern Analysis: Factors Affecting Mood</h2>

              {Array.isArray(insights.factorInsights) && insights.factorInsights.length > 0 ? (
                <div className="space-y-3">
                  {insights.factorInsights.map((item, idx) => (
                    <div key={`${item.factor || "factor"}-${idx}`} className="rounded-lg border border-gray-100 p-3">
                      <p className="text-sm font-semibold text-gray-800">
                        {item.factor} ({item.direction}) | Change: {item.change}% | Impact: {item.impactScore}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{item.message}</p>
                      {item.researchBasis && (
                        <p className="text-xs text-gray-500 mt-1">Research Note: {item.researchBasis}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No factor analysis available.</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Personalized Recommendations</h2>
              {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {insights.recommendations.map((rec, idx) => (
                    <li key={`${idx}-${rec.slice(0, 20)}`} className="text-sm text-gray-700 rounded-lg border border-gray-100 px-3 py-2">
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No recommendations available.</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Raw Insight Data</h2>
              <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto max-h-[45vh]">
                {JSON.stringify(insights, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InsightsPage;
