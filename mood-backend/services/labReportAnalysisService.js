import Biomarker from "../models/biomarker.js";

const DEBUG_MODE = false;

const log = (message, data = "") => {
  if (DEBUG_MODE) {
    console.log(`[LAB-REPORT] ${message}`, data);
  }
};

const normalizeText = (text) => {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/['']/g, "'")
    .replace(/["''""]/g, '"')
    .toLowerCase();
};

const normalizeBiomarkerKey = (value = "") => {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
};

const cleanBiomarkerLabel = (value = "") => {
  return String(value || "")
    .replace(/[_*]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[:\-\s]+|[:\-\s]+$/g, "")
    .trim();
};

const isLikelyBiomarkerLabel = (label = "") => {
  const normalized = normalizeBiomarkerKey(label);
  if (!normalized || normalized.length < 2) return false;
  if (!/[a-z]/i.test(normalized)) return false;

  const ignoredTerms = [
    "reference",
    "range",
    "result",
    "results",
    "unit",
    "units",
    "patient",
    "report",
    "sample",
    "date",
    "age",
    "gender",
    "method",
    "flag",
    "name",
    "value",
    "status",
  ];

  return !ignoredTerms.some((term) => normalized.includes(term));
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const detectReportBiomarkers = (text, biomarkers) => {
  const normalizedText = normalizeText(text);
  const rawText = String(text || "").replace(/\r/g, "\n");
  const unique = new Map();
  const dbAliasesByKey = new Map();

  const registerCandidate = (candidate, fallbackName = "") => {
    const cleaned = cleanBiomarkerLabel(candidate);
    if (!isLikelyBiomarkerLabel(cleaned)) return;

    const displayName = fallbackName || cleaned;
    const normalizedKey = normalizeBiomarkerKey(displayName);
    if (!normalizedKey) return;

    if (!unique.has(normalizedKey)) {
      unique.set(normalizedKey, displayName);
    }
  };

  biomarkers.forEach((biomarker) => {
    const aliases = [biomarker.name, ...(biomarker.aliases || [])].filter(Boolean);
    aliases.forEach((alias) => {
      const aliasKey = normalizeBiomarkerKey(alias);
      if (aliasKey) {
        dbAliasesByKey.set(aliasKey, biomarker.name);
      }

      const flexibleAlias = escapeRegex(String(alias).trim().toLowerCase()).replace(/\s+/g, "\\s+");
      const aliasPattern = new RegExp(`\\b${flexibleAlias}\\b`, "i");

      if (aliasPattern.test(normalizedText)) {
        registerCandidate(alias, biomarker.name);
      }
    });
  });

  const linePatterns = [
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\s]{1,60}?)\s*[:=-]\s*(\d+(?:\.\d+)?)(?:\s*[A-Za-z%/]+)?\s*$/,
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\s]{1,60}?)\s{2,}(\d+(?:\.\d+)?)(?:\s*[A-Za-z%/]+)?\s*$/,
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\s]{1,60}?)\s+(\d+(?:\.\d+)?)(?:\s+[A-Za-z%/]+)?\s*$/,
  ];

  rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      for (const pattern of linePatterns) {
        const match = line.match(pattern);
        if (!match?.[1]) continue;

        const candidate = cleanBiomarkerLabel(match[1]);
        const aliasKey = normalizeBiomarkerKey(candidate);
        const mappedDbName = dbAliasesByKey.get(aliasKey);

        registerCandidate(candidate, mappedDbName || "");
        break;
      }
    });

  return Array.from(unique.values());
};

const buildRegexesForAlias = (alias, unit = "") => {
  const flexibleAlias = escapeRegex(alias).replace(/\s+/g, "\\s+");
  const safeUnit = unit ? escapeRegex(unit) : "";
  const unitPart = safeUnit ? `(?:\\s*(?:${safeUnit}))?` : "(?:\\s*[a-zA-Z/%]+)?";
  const optionalSubtypePart = "(?:\\s*\\([^)]{1,30}\\))?";
  const aliasWithBoundary = `\\b${flexibleAlias}\\b`;

  return [
    new RegExp(`${aliasWithBoundary}${optionalSubtypePart}\\s*[:=]\\s*(\\d+(?:\\.\\d+)?)${unitPart}\\b`, "gi"),
    new RegExp(`${aliasWithBoundary}${optionalSubtypePart}\\s{2,}(\\d+(?:\\.\\d+)?)${unitPart}\\b`, "gi"),
    new RegExp(`${aliasWithBoundary}${optionalSubtypePart}\\s+(\\d+(?:\\.\\d+)?)${unitPart}\\b`, "gi"),
    new RegExp(`${aliasWithBoundary}${optionalSubtypePart}\\s*[:=\\-]*\\n\\s*(\\d+(?:\\.\\d+)?)${unitPart}\\b`, "gi"),
  ];
};

const extractBiomarkerValue = (text, biomarker) => {
  const normalizedText = normalizeText(text);
  const aliases = [biomarker.name, ...(biomarker.aliases || [])]
    .filter(Boolean)
    .map((alias) => String(alias).trim().toLowerCase());

  for (const alias of aliases) {
    const patterns = buildRegexesForAlias(alias, biomarker.unit);

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(normalizedText);
      if (match?.[1]) {
        const value = Number.parseFloat(match[1]);
        if (!Number.isNaN(value)) {
          return { value, rawToken: match[1], matchedAlias: alias };
        }
      }
    }
  }

  return { value: null, rawToken: "", matchedAlias: "" };
};

const resolveStatus = (value, biomarker) => {
  if (value === null || Number.isNaN(value)) return "not-found";
  if (value < biomarker.thresholds.low) return "low";
  if (value > biomarker.thresholds.high) return "high";
  return "normal";
};

const calculateScore = (value, biomarker) => {
  if (value === null) return null;

  const { normalMin, normalMax } = biomarker.ranges;
  const rangeSize = normalMax - normalMin;

  if (rangeSize <= 0) {
    return value >= normalMin && value <= normalMax ? 100 : 30;
  }

  if (value >= normalMin && value <= normalMax) return 100;

  const distance = value < normalMin ? normalMin - value : value - normalMax;
  const percent = (distance / rangeSize) * 100;

  if (percent <= 10) return 75;
  if (percent <= 25) return 50;
  return 30;
};

const resolveMarkerConfidence = (value, matchedAlias) => {
  if (value === null || Number.isNaN(value)) return "low";
  if (matchedAlias) return "high";
  return "medium";
};

const calculateOverallScore = (markers) => {
  const detectedMarkers = markers.filter(
    (marker) => marker.status !== "not-found" && marker.score !== null
  );

  if (detectedMarkers.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  detectedMarkers.forEach((marker) => {
    const safeWeight = typeof marker.weight === "number" ? marker.weight : 0;
    weightedSum += marker.score * safeWeight;
    totalWeight += safeWeight;
  });

  if (totalWeight <= 0) return 0;

  return Math.round(weightedSum / totalWeight);
};

const buildRecommendations = (markers, biomarkerByName) => {
  const immediateActions = [];
  const dailyPractices = [];

  markers.forEach((marker) => {
    const biomarker = biomarkerByName.get(marker.name);
    if (!biomarker) return;

    if (marker.status === "low") {
      immediateActions.push(...(biomarker.recommendations?.low?.immediate || []));
      dailyPractices.push(...(biomarker.recommendations?.low?.daily || []));
    }

    if (marker.status === "high") {
      immediateActions.push(...(biomarker.recommendations?.high?.immediate || []));
      dailyPractices.push(...(biomarker.recommendations?.high?.daily || []));
    }

    if (marker.status === "normal") {
      dailyPractices.push(...(biomarker.recommendations?.normal?.daily || []));
    }
  });

  return {
    immediateActions: [...new Set(immediateActions)],
    dailyPractices: [...new Set(dailyPractices)],
  };
};

const getTopKeyIssues = (markers, biomarkerByName) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return markers
    .filter((marker) => marker.status === "low" || marker.status === "high")
    .sort((a, b) => {
      const aPriority = biomarkerByName.get(a.name)?.priority || "medium";
      const bPriority = biomarkerByName.get(b.name)?.priority || "medium";
      const priorityDiff = (priorityOrder[aPriority] ?? 1) - (priorityOrder[bPriority] ?? 1);
      if (priorityDiff !== 0) return priorityDiff;

      const aScore = a.score ?? Number.POSITIVE_INFINITY;
      const bScore = b.score ?? Number.POSITIVE_INFINITY;
      return aScore - bScore;
    })
    .slice(0, 3)
    .map((marker) => ({
      name: marker.name,
      status: marker.status,
      value: marker.value,
    }));
};

const buildSummary = ({ detectedCount, markers, overallScore, dataQualityPercentage }) => {
  const abnormal = markers.filter((marker) => marker.status === "low" || marker.status === "high");

  let summary = "";

  if (detectedCount === 0) {
    summary = "No biomarkers could be detected.";
  } else if (abnormal.length === 0) {
    summary = "All detected biomarkers are within optimal ranges.";
  } else if (abnormal.length === 1) {
    summary = `${abnormal[0].name} is ${abnormal[0].status === "high" ? "above" : "below"} the optimal range. Other biomarkers are normal.`;
  } else {
    const names = abnormal.slice(0, 2).map((item) => item.name).join(" and ");
    summary = `${names} show abnormal levels, suggesting areas for improvement.`;
  }

  let interpretation = "needs attention";
  if (overallScore >= 80) interpretation = "strong";
  else if (overallScore >= 60) interpretation = "moderate";

  return `${summary} Detection coverage: ${dataQualityPercentage}%. Overall biomarker profile is ${interpretation}.`;
};

export const parseAndAnalyzeMarkers = async (text = "") => {
  const biomarkers = await Biomarker.find({ isActive: true }).lean();
  log("Loaded active biomarkers", biomarkers.length);

  if (!biomarkers.length) {
    return {
      overallScore: 0,
      summary: "No biomarkers could be detected.",
      reportBiomarkers: [],
      dataQuality: {
        detected: 0,
        total: 0,
        percentage: 0,
      },
      analysisCoverage: {
        analyzed: 0,
        available: 0,
        percentage: 0,
      },
      keyIssues: [],
      markers: [],
      recommendations: {
        immediateActions: [],
        dailyPractices: [],
      },
      confidence: 0,
    };
  }

  const markers = biomarkers.map((biomarker) => {
    const { value, matchedAlias } = extractBiomarkerValue(text, biomarker);
    const status = resolveStatus(value, biomarker);
    const score = calculateScore(value, biomarker);
    const explanation =
      biomarker.explanations?.[
        status === "not-found" ? "notFound" : status
      ] || "";

    return {
      name: biomarker.name,
      value,
      unit: biomarker.unit,
      status,
      score,
      confidence: resolveMarkerConfidence(value, matchedAlias),
      explanation,
      weight: biomarker.weight,
    };
  });

  const reportBiomarkers = detectReportBiomarkers(text, biomarkers);

  const detectedCount = markers.filter((marker) => marker.status !== "not-found").length;
  const reportDetectedTotal = reportBiomarkers.length;
  const availableCount = biomarkers.length;
  const dataQualityPercentage = reportDetectedTotal
    ? Math.round((detectedCount / reportDetectedTotal) * 100)
    : 0;

  const dataQuality = {
    detected: detectedCount,
    total: reportDetectedTotal,
    percentage: dataQualityPercentage,
  };

  const analysisCoveragePercentage = availableCount
    ? Math.round((detectedCount / availableCount) * 100)
    : 0;

  const analysisCoverage = {
    analyzed: detectedCount,
    available: availableCount,
    percentage: analysisCoveragePercentage,
  };

  const overallScore = calculateOverallScore(markers);
  const biomarkerByName = new Map(biomarkers.map((item) => [item.name, item]));
  const keyIssues = getTopKeyIssues(markers, biomarkerByName);
  const recommendations = buildRecommendations(markers, biomarkerByName);
  const confidence = availableCount ? Number((detectedCount / availableCount).toFixed(2)) : 0;
  const summary = buildSummary({
    detectedCount,
    markers,
    overallScore,
    dataQualityPercentage,
  });

  return {
    overallScore,
    summary,
    reportBiomarkers,
    dataQuality,
    analysisCoverage,
    keyIssues,
    markers: markers.map(({ weight, ...marker }) => marker),
    recommendations,
    confidence,
  };
};
