const toTitleCase = (value = "") => {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const stripExtension = (fileName = "") => {
  return fileName.replace(/\.[^/.]+$/, "");
};

export const getReportDisplayName = (report) => {
  const originalFileName = report?.originalFileName || "";
  if (originalFileName) {
    const cleanName = stripExtension(originalFileName).replace(/[_-]+/g, " ").trim();
    if (cleanName) {
      return toTitleCase(cleanName);
    }
  }

  const createdAt = report?.createdAt ? new Date(report.createdAt) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return `Lab Analysis ${createdAt.toLocaleDateString()}`;
  }

  return "Lab Analysis";
};

export const getReportCompleteness = (report) => {
  const dataQuality = report?.dataQuality;
  const qualityDetected = Number(dataQuality?.detected);
  const qualityTotal = Number(dataQuality?.total);
  const qualityPercentage = Number(dataQuality?.percentage);

  if (Number.isFinite(qualityDetected) && Number.isFinite(qualityTotal)) {
    const safeDetected = Math.max(0, qualityDetected);
    const safeTotal = Math.max(0, qualityTotal);
    const derivedPercentage = safeTotal > 0 ? Math.round((safeDetected / safeTotal) * 100) : 0;
    const percentage = Number.isFinite(qualityPercentage) ? Math.max(0, Math.min(100, qualityPercentage)) : derivedPercentage;

    return {
      detected: safeDetected,
      total: safeTotal,
      percentage,
      text:
        safeTotal > 0
          ? `${safeDetected} of ${safeTotal} report biomarkers analyzed`
          : "No report biomarkers detected",
    };
  }

  const reportBiomarkers = Array.isArray(report?.reportBiomarkers) ? report.reportBiomarkers : [];
  const markers = Array.isArray(report?.markers) ? report.markers : [];

  if (reportBiomarkers.length > 0) {
    const detected = markers.filter(
      (marker) => reportBiomarkers.includes(marker?.name) && marker?.status !== "not-found"
    ).length;
    const total = reportBiomarkers.length;
    const percentage = total > 0 ? Math.round((detected / total) * 100) : 0;

    return {
      detected,
      total,
      percentage,
      text: `${detected} of ${total} report biomarkers analyzed`,
    };
  }
  const detected = markers.filter(
    (marker) => marker?.status !== "not-found" && marker?.value !== null && marker?.value !== undefined
  ).length;
  const total = markers.length;

  if (total > 0) {
    const percentage = Math.round((detected / total) * 100);
    return {
      detected,
      total,
      percentage,
      text: `${detected} of ${total} biomarkers detected`,
    };
  }

  const fallbackPercentage = Math.round((report?.confidence || 0) * 100);
  return {
    detected: 0,
    total: 0,
    percentage: fallbackPercentage,
    text: fallbackPercentage > 0 ? "Extraction confidence from OCR" : "No biomarker extraction data",
  };
};

export const getVisibleReportMarkers = (report) => {
  const markers = Array.isArray(report?.markers) ? report.markers : [];
  const reportBiomarkers = Array.isArray(report?.reportBiomarkers) ? report.reportBiomarkers : [];

  if (reportBiomarkers.length > 0) {
    return markers.filter((marker) => reportBiomarkers.includes(marker?.name));
  }

  // Legacy reports may not have reportBiomarkers populated.
  return markers;
};

const buildReportText = (report) => {
  const title = getReportDisplayName(report);
  const date = report?.createdAt ? new Date(report.createdAt).toLocaleString() : "Unknown";
  const score = report?.overallScore ?? 0;
  const summary = report?.summary || "No summary available.";
  const filteredMarkers = getVisibleReportMarkers(report);
  const markerRows = filteredMarkers.length
    ? filteredMarkers
        .map((marker) => {
          const valueText = marker?.value !== null && marker?.value !== undefined ? marker.value : "N/A";
          const unitText = marker?.unit ? ` ${marker.unit}` : "";
          const statusText = marker?.status || "not-found";
          return `- ${marker?.name || "Unknown"}: ${valueText}${unitText} (${statusText})`;
        })
        .join("\n")
    : "- No biomarkers available";

  return [
    title,
    "",
    `Date: ${date}`,
    `Overall Score: ${score}`,
    "",
    "Summary:",
    summary,
    "",
    "Biomarkers:",
    markerRows,
  ].join("\n");
};

export const downloadReportAsText = (report) => {
  const textContent = buildReportText(report);
  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const fileNameBase = getReportDisplayName(report).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "lab-analysis";

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileNameBase}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const shareReport = async (report, reportUrl) => {
  const shareTitle = getReportDisplayName(report);
  const shareText = report?.summary || "Lab report analysis";

  if (navigator.share) {
    await navigator.share({
      title: shareTitle,
      text: shareText,
      url: reportUrl,
    });
    return "shared";
  }

  if (navigator.clipboard && reportUrl) {
    await navigator.clipboard.writeText(reportUrl);
    return "copied";
  }

  return "unsupported";
};
