import path from "path";
import LabReport from "../models/labReport.js";
import Biomarker from "../models/biomarker.js";
import { extractTextFromReport } from "./labReportOcrService.js";
import { parseAndAnalyzeMarkers } from "./labReportAnalysisService.js";

const formatNormalRange = (normalMin, normalMax, unit = "") => {
  if (normalMin === undefined || normalMax === undefined) {
    return "";
  }
  const unitText = unit ? ` ${unit}` : "";
  return `${normalMin} - ${normalMax}${unitText}`;
};

export const hydrateReportMarkerRanges = async (report) => {
  if (!report || !Array.isArray(report.markers) || report.markers.length === 0) {
    return report;
  }

  const markerNames = [...new Set(report.markers.map((marker) => marker?.name).filter(Boolean))];
  if (!markerNames.length) {
    return report;
  }

  const biomarkerDocs = await Biomarker.find({ name: { $in: markerNames }, isActive: true })
    .select("name unit ranges")
    .lean();

  const biomarkerByName = new Map(biomarkerDocs.map((item) => [item.name, item]));

  const markers = report.markers.map((marker) => {
    const biomarker = biomarkerByName.get(marker?.name);
    const normalMin = biomarker?.ranges?.normalMin;
    const normalMax = biomarker?.ranges?.normalMax;

    if (normalMin === undefined || normalMax === undefined) {
      return marker;
    }

    const unit = marker?.unit || biomarker?.unit || "";

    return {
      ...marker,
      normalMin,
      normalMax,
      normalRange: formatNormalRange(normalMin, normalMax, unit),
    };
  });

  return {
    ...report,
    markers,
  };
};

export const createLabReportAnalysis = async ({ userId, file }) => {
  if (!file) {
    throw new Error("Report file is required.");
  }

  const extractedText = await extractTextFromReport({
    filePath: file.path,
    mimeType: file.mimetype,
  });

  const analysisResult = await parseAndAnalyzeMarkers(extractedText);
  const {
    overallScore,
    summary,
    dataQuality,
    analysisCoverage,
    reportBiomarkers,
    keyIssues,
    markers,
    recommendations,
    confidence,
  } = analysisResult;

  const reportDoc = await LabReport.create({
    userId,
    filePath: file.path,
    originalFileName: file.originalname,
    extractedText,
    markers,
    overallScore,
    confidence,
    summary,
    dataQuality,
    analysisCoverage,
    reportBiomarkers,
    keyIssues,
    recommendations,
    explanation: "This is not a medical diagnosis. Please consult a doctor.",
  });

  return reportDoc;
};

export const getLabReportHistory = async (userId) => {
  const reports = await LabReport.find({ userId })
    .sort({ createdAt: -1 })
    .select("userId filePath originalFileName markers reportBiomarkers overallScore confidence summary dataQuality analysisCoverage keyIssues recommendations explanation createdAt")
    .lean();

  return reports;
};

export const getLabReportDetail = async (reportId) => {
  const report = await LabReport.findById(reportId).lean();
  return report;
};

export const toClientReport = (report) => {
  if (!report) return null;

  const relativeFilePath = report.filePath
    ? report.filePath.split(path.sep).join("/")
    : "";

  return {
    id: String(report._id),
    userId: report.userId,
    filePath: relativeFilePath,
    originalFileName: report.originalFileName,
    overallScore: report.overallScore || 0,
    summary: report.summary || "",
    dataQuality: report.dataQuality || { detected: 0, total: 0, percentage: 0 },
    analysisCoverage: report.analysisCoverage || { analyzed: 0, available: 0, percentage: 0 },
    reportBiomarkers: report.reportBiomarkers || [],
    keyIssues: report.keyIssues || [],
    markers: report.markers || [],
    recommendations: report.recommendations || { immediateActions: [], dailyPractices: [] },
    confidence: report.confidence || 0,
    explanation: report.explanation || "",
    createdAt: report.createdAt,
  };
};
