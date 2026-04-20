import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { fetchReportById } from "../api/reportApi";
import LabReportIcon from "../assets/LabReportIcon";
import HealthScoreIcon from "../assets/HealthScoreIcon";
import {
  downloadReportAsText,
  getReportCompleteness,
  getReportDisplayName,
  getVisibleReportMarkers,
  shareReport,
} from "../utils/reportPresentation";


const statusPillClass = {
  normal: "bg-[#ECFDF3] text-[#15803D] border-[#86EFAC]",
  low: "bg-[#FEFCE8] text-[#A16207] border-[#FDE68A]",
  high: "bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]",
  "not-found": "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]",
};

const statusLabel = {
  normal: "Normal",
  low: "Low",
  high: "High",
  "not-found": "Not Found",
};

const getNormalRangeText = (marker = {}) => {
  const normalRange = marker.normalRange || marker.referenceRange || marker.range;
  if (typeof normalRange === "string" && normalRange.trim()) {
    return normalRange.trim();
  }

  const min = marker.normalMin ?? marker.ranges?.normalMin;
  const max = marker.normalMax ?? marker.ranges?.normalMax;
  if (min !== undefined && max !== undefined) {
    const unit = marker.unit ? ` ${marker.unit}` : "";
    return `${min} - ${max}${unit}`;
  }

  return "Unavailable";
};

const getScoreBand = (score) => {
  const safeScore = Number(score || 0);
  if (safeScore >= 80) {
    return {
      label: "Strong",
      className: "bg-[#ECFDF3] text-[#15803D] border-[#86EFAC]",
    };
  }
  if (safeScore >= 60) {
    return {
      label: "Moderate",
      className: "bg-[#FEFCE8] text-[#A16207] border-[#FDE68A]",
    };
  }
  return {
    label: "Needs Attention",
    className: "bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]",
  };
};

const ReportDetailPage = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchReportById(reportId);
        setReport(response?.report || null);
      } catch (err) {
        setError(err.message || "Failed to load report details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reportId]);

  const handleShare = async () => {
    if (!report) return;
    try {
      const reportUrl = `${window.location.origin}/reports/${report.id}`;
      const result = await shareReport(report, reportUrl);
      if (result === "copied") {
        setActionMessage("Report link copied to clipboard.");
      }
      if (result === "unsupported") {
        setActionMessage("Sharing is not supported on this device.");
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        setActionMessage("Unable to share this report right now.");
      }
    }
  };

  const handleDownload = () => {
    if (!report) return;
    downloadReportAsText(report);
    setActionMessage("Report downloaded.");
  };

  const THEME_BLUE = "#0C5BD5";
  const THEME_BLUE_LIGHT = "rgba(12, 91, 213, 0.14)";
  const actionButtonClass =
    "px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-[#0C5BD5] hover:bg-[#F8FBFF] transition text-sm font-medium text-gray-700 flex items-center gap-2 shadow-sm hover:shadow-md";

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} flex items-center justify-center`}>
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#0C5BD5]"></div>
              <p className="text-gray-600 mt-4">Loading report details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} flex items-center justify-center p-8`}>
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-semibold text-lg">{error || "Report not found"}</p>
            <button
              onClick={() => navigate("/reports")}
              className="mt-6 px-6 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-900 font-medium transition"
            >
              Back to Reports
            </button>
          </div>
        </main>
      </div>
    );
  }

  const visibleMarkers = getVisibleReportMarkers(report);
  const completeness = getReportCompleteness(report);
  const detectedCount = visibleMarkers.filter((marker) => marker.status !== "not-found").length;
  const recommendationsCount =
    (report.recommendations?.immediateActions || []).length +
    (report.recommendations?.dailyPractices || []).length;
  const scoreUI = getScoreBand(report.overallScore);
  const scoreValue = Math.max(0, Number(report.overallScore || 0));
  const scorePercent = Math.min(100, Math.round(scoreValue));

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`relative flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8 overflow-hidden`}>
        <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#0C5BD5]/10 blur-3xl"></div>
        <div className="pointer-events-none absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-[#0C5BD5]/10 blur-3xl"></div>
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-[#0C5BD5]/5 blur-3xl"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate("/reports")}
            className="text-sm text-[#0C5BD5] hover:text-[#0A4AB0] font-semibold mb-6 transition-all duration-200 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-[#0C5BD5]/20 shadow-sm hover:shadow"
          >
            <span aria-hidden="true">←</span>
            Back
          </button>

          {/* Report Header */}
          <section className="mb-8 bg-gradient-to-br from-[#0C5BD5]/10 via-white to-[#F8FBFF] border border-[#0C5BD5]/15 rounded-3xl p-6 shadow-[0_12px_34px_-24px_rgba(12,91,213,0.55)]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-[#0C5BD5]/20"
                    style={{ backgroundColor: THEME_BLUE_LIGHT }}
                  >
                    <LabReportIcon className="w-7 h-7" style={{ color: THEME_BLUE }} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{getReportDisplayName(report)}</h1>
                    <p className="text-sm text-gray-500 mt-1">Last Updated: {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className={`${actionButtonClass} hover:-translate-y-0.5`}
                  title="Share report"
                  aria-label="Share report"
                >
                  <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className={`${actionButtonClass} hover:-translate-y-0.5`}
                  title="Download report"
                  aria-label="Download report"
                >
                  <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mt-6">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0C5BD5]/12 via-[#EAF2FF] to-white border border-[#0C5BD5]/20 rounded-2xl p-5">
                <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-[#0C5BD5]/10"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#0C5BD5]">Overall Health Score</p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: `conic-gradient(#0C5BD5 ${scorePercent * 3.6}deg, #E5E7EB ${scorePercent * 3.6}deg 360deg)` }}>
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#0C5BD5]">{Math.round(scoreValue)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Wellness Score</p>
                    <p className="text-xs text-gray-500 mt-1">Out of 100</p>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border mt-2 ${scoreUI.className}`}>
                      {scoreUI.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#0C5BD5]/15 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: THEME_BLUE_LIGHT }}
                  >
                    <HealthScoreIcon className="w-4 h-4" style={{ color: THEME_BLUE }} />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600">Summary</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {report.summary || "No summary available for this report."}
                </p>
              </div>
            </div>
          </section>

          {actionMessage && (
            <div className="mb-8 bg-[#0C5BD5]/10 border border-[#0C5BD5]/30 rounded-lg p-4 flex items-center gap-3 text-sm text-[#0C5BD5] font-medium">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {actionMessage}
            </div>
          )}

          <section className="grid md:grid-cols-3 gap-6 mb-8">
            <article className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border border-[#0C5BD5]/15">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center relative"
                  style={{ backgroundColor: THEME_BLUE_LIGHT }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
                  <svg className="w-6 h-6 relative z-10" style={{ color: THEME_BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M7 3v6a3 3 0 01-3 3h0a3 3 0 003 3v6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M17 3v6a3 3 0 003 3h0a3 3 0 01-3 3v6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9.5 7h5M9.5 12h5M9.5 17h5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Biomarkers</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{detectedCount}/{visibleMarkers.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Detected in report</p>
                </div>
              </div>
            </article>

            <article className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border border-[#0C5BD5]/15">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center relative"
                  style={{ backgroundColor: THEME_BLUE_LIGHT }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
                  <svg className="w-6 h-6 relative z-10" style={{ color: THEME_BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9 3h6l3 3v12a3 3 0 01-3 3H9a3 3 0 01-3-3V6a3 3 0 013-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9 11h6M9 15h4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 3v3h3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Completeness</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{completeness.percentage}%</p>
                  <p className="text-xs text-gray-500 mt-1">Complete</p>
                </div>
              </div>
            </article>

            <article className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border border-[#0C5BD5]/15">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center relative"
                  style={{ backgroundColor: THEME_BLUE_LIGHT }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
                  <svg className="w-6 h-6 relative z-10" style={{ color: THEME_BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 3l2.3 4.67L19.5 8.4l-3.75 3.66.88 5.19L12 14.9l-4.63 2.35.88-5.19L4.5 8.4l5.2-.73L12 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Suggestions</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{recommendationsCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Care recommendations</p>
                </div>
              </div>
            </article>
          </section>

          {/* Biomarker Results */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: THEME_BLUE_LIGHT }}
              >
                <svg className="w-4 h-4" style={{ color: THEME_BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v6a3 3 0 01-3 3h0a3 3 0 003 3v6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 3v6a3 3 0 003 3h0a3 3 0 01-3 3v6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 7h5M9.5 12h5M9.5 17h5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Biomarker Results</h2>
            </div>

            {(visibleMarkers || []).length > 0 ? (
              <div className="space-y-4">
                {visibleMarkers.map((marker, index) => {
                  const markerStatus = (marker.status || "not-found").toLowerCase();
                  const pillClass = statusPillClass[markerStatus] || statusPillClass["not-found"];
                  const pillLabel = statusLabel[markerStatus] || statusLabel["not-found"];
                  const markerValue = marker.currentValue ?? marker.value ?? marker.measuredValue ?? "N/A";
                  const markerUnit = marker.unit ? ` ${marker.unit}` : "";

                  return (
                    <article
                      key={`${marker.name || "marker"}-${index}`}
                      className="group rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-[#0C5BD5]/35 hover:shadow-md"
                    >
                      <div className="p-5 md:p-6">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M7 3v6a3 3 0 01-3 3h0a3 3 0 003 3v6" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M17 3v6a3 3 0 003 3h0a3 3 0 01-3 3v6" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9.5 7h5M9.5 12h5M9.5 17h5" />
                            </svg>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 leading-tight">{marker.name || "Unknown Biomarker"}</h3>
                                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 font-semibold">Biomarker</p>
                              </div>
                              <span className={`inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-semibold border ${pillClass}`}>
                                {pillLabel}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Reference Range</p>
                                <p className="mt-1 text-sm text-gray-800 font-semibold">{getNormalRangeText(marker)}</p>
                              </div>
                              <div className="rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] px-3 py-2 sm:text-right">
                                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Current Value</p>
                                <p className="mt-1 text-2xl font-bold text-[#0C5BD5] leading-none tracking-tight">
                                  {markerValue}
                                  <span className="text-sm ml-1.5 text-[#0C5BD5]/85 font-semibold">{markerUnit}</span>
                                </p>
                              </div>
                            </div>

                            {marker.explanation && (
                              <div className="mt-4 border-l-2 border-gray-200 pl-3">
                                <p className="text-sm text-gray-600 leading-relaxed">{marker.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500">
                No biomarkers available for this report.
              </div>
            )}
          </section>

          {/* Recommendations */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: THEME_BLUE_LIGHT }}
              >
                <svg className="w-4 h-4" style={{ color: THEME_BLUE }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2a2 2 0 002 2h4a2 2 0 002-2v-2zM16 15v2a2 2 0 002 2h1a1 1 0 001-1v-2a4 4 0 00-4-4h-1.5a4 4 0 00-1 .109V9a2 2 0 002-2m0 0V7a2 2 0 012-2h.5a2 2 0 012 2v.5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Care Recommendations</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-[#0C5BD5]/15 shadow-sm">
                <div className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#0C5BD5] to-[#5FA0FF]"></div>
                <div className="flex items-center gap-2 mb-4">
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: THEME_BLUE_LIGHT }}
                  >
                    <svg className="w-4 h-4" style={{ color: THEME_BLUE }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Immediate Actions</h3>
                </div>
                <ul className="space-y-3">
                  {(report.recommendations?.immediateActions || []).length > 0 ? (
                    (report.recommendations.immediateActions).map((item, idx) => (
                      <li key={`ia-${idx}`} className="rounded-lg border border-[#0C5BD5]/20 bg-[#F8FBFF] p-3 flex items-start gap-3">
                        <span className="text-[#0C5BD5] font-bold text-lg flex-shrink-0 leading-none">✓</span>
                        <span className="text-sm text-gray-700 font-medium">{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic py-4 text-center">No immediate actions needed</li>
                  )}
                </ul>
              </div>

              <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-[#0C5BD5]/15 shadow-sm">
                <div className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#0C5BD5] to-[#5FA0FF]"></div>
                <div className="flex items-center gap-2 mb-4">
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: THEME_BLUE_LIGHT }}
                  >
                    <svg className="w-4 h-4" style={{ color: THEME_BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3L9 20" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Daily Practices</h3>
                </div>
                <ul className="space-y-3">
                  {(report.recommendations?.dailyPractices || []).length > 0 ? (
                    (report.recommendations.dailyPractices).map((item, idx) => (
                      <li key={`dp-${idx}`} className="rounded-lg border border-[#0C5BD5]/20 bg-[#F8FBFF] p-3 flex items-start gap-3">
                        <span className="text-[#0C5BD5] font-bold flex-shrink-0 leading-none">→</span>
                        <span className="text-sm text-gray-700 font-medium">{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic py-4 text-center">Maintain current practices</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-gradient-to-r from-[#FFFBEB] to-white border border-[#FDE68A] rounded-2xl p-5 text-sm shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-bold text-[#92400E]">Medical Disclaimer</p>
                <p className="mt-2 text-[#78350F]">This analysis is not a medical diagnosis. Please consult a healthcare professional for medical advice or diagnosis. Always seek professional medical advice for health concerns.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportDetailPage;
