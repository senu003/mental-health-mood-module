import { apiSuccess, apiFail } from "../utils/apiResponse.js";
import {
  createLabReportAnalysis,
  getLabReportHistory,
  getLabReportDetail,
  hydrateReportMarkerRanges,
  toClientReport,
} from "../services/labReportService.js";

export const uploadAndAnalyzeReport = async (req, res) => {
  const userId = req.body?.userId || "testuser001";

  if (!req.file) {
    return res.status(400).json(apiFail("Please upload a PDF or image report file."));
  }

  const report = await createLabReportAnalysis({ userId, file: req.file });

  return res.status(201).json(
    apiSuccess(
      { report: toClientReport(report) },
      "Report uploaded and analyzed successfully"
    )
  );
};

export const getReportHistory = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json(apiFail("userId is required."));
  }

  const reports = await getLabReportHistory(userId);

  return res.json(
    apiSuccess(
      {
        reports: reports.map(toClientReport),
        count: reports.length,
      },
      "Report history retrieved"
    )
  );
};

export const getReportById = async (req, res) => {
  const { reportId } = req.params;

  const report = await getLabReportDetail(reportId);

  if (!report) {
    return res.status(404).json(apiFail("Report not found."));
  }

  const reportWithRanges = await hydrateReportMarkerRanges(report);

  return res.json(apiSuccess({ report: toClientReport(reportWithRanges) }, "Report detail retrieved"));
};
