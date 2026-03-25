import axios from "axios";
import { API_CONFIG } from "../config";

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.response.use(
  (response) => {
    const payload = response?.data;

    if (payload && typeof payload === "object" && "success" in payload) {
      if (!payload.success) {
        const error = new Error(payload.message || "Request failed");
        error.type = "ApiError";
        error.status = response.status;
        error.details = payload.details || null;
        throw error;
      }
      const { success, message, data, ...extra } = payload;
      if (data && typeof data === "object") {
        return Object.keys(extra).length ? { ...data, ...extra } : data;
      }
      return Object.keys(extra).length ? { data, ...extra } : data;
    }

    return payload;
  },
  (error) => {
    if (error?.response) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Request failed";
      const customError = new Error(message);
      customError.type =
        error.response.status >= 500 ? "ServerError" : "ValidationError";
      customError.status = error.response.status;
      customError.details = error.response?.data?.details || null;
      throw customError;
    }

    if (error?.request) {
      const customError = new Error("Network error. Please check your connection.");
      customError.type = "NetworkError";
      customError.status = 0;
      customError.details = null;
      throw customError;
    }

    const customError = new Error(error?.message || "Something went wrong");
    customError.type = "UnknownError";
    customError.status = 0;
    customError.details = null;
    throw customError;
  }
);

export default client;
