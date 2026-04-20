import client from "./client";
import { API_CONFIG } from "../config";

export const uploadAndAnalyzeReport = async ({ userId, file }) => {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("report", file);

  return client.post(API_CONFIG.ENDPOINTS.reportUpload, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const fetchReportHistory = async (userId) => {
  return client.get(API_CONFIG.ENDPOINTS.reportHistory(userId));
};

export const fetchReportById = async (reportId) => {
  return client.get(API_CONFIG.ENDPOINTS.reportDetail(reportId));
};
