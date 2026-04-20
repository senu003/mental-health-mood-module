import { API_BASE_URL } from '@/config/api';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  details?: unknown;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (payload?.data ?? payload) as T;
};

export type DashboardStats = {
  sevenDayAverage: number | string;
  checkInStreak: number;
  recoveryScore: number;
};

export type WeeklyMoodPoint = {
  day: string;
  displayDate: string;
  fullDate: string;
  value: number;
  hasData: boolean;
  entries: number;
};

export type MoodEntry = {
  _id: string;
  userId?: string;
  mood?: string;
  note?: string;
  sleepLevel?: number;
  anxietyLevel?: number;
  energyLevel?: number;
  motivationLevel?: number;
  socialInteraction?: number;
  stressLevel?: number;
  focusLevel?: number;
  mentalHealthScore?: number;
  shareWithDoctor?: boolean;
  createdAt?: string;
};

export type CheckInPayload = {
  userId: string;
  mood: 'terrible' | 'sad' | 'okay' | 'good' | 'great';
  shareWithDoctor?: boolean;
  note?: string;
  sleepLevel: number;
  anxietyLevel: number;
  energyLevel: number;
  motivationLevel: number;
  socialInteraction: number;
  stressLevel: number;
  focusLevel: number;
};

export type MoodFixActivity = {
  _id?: string;
  activityId?: string;
  id?: string;
  title?: string;
  duration?: string;
  difficulty?: string;
  focusTag?: string;
  benefit?: string;
  description?: string;
  moods?: string[];
  steps?: string[];
};

// Lab Report Types (Backend Response Format)
export type Marker = {
  name: string;
  value?: string | number;
  unit?: string;
  referenceRange?: string;
  normalRange?: string;
  normalMin?: number;
  normalMax?: number;
  explanation?: string;
  status?: 'normal' | 'low' | 'high' | 'not-found';
};

export type LabReportRecommendation = {
  immediateActions?: string[];
  dailyPractices?: string[];
};

export type LabReportData = {
  id: string;
  userId: string;
  originalFileName: string;
  filePath?: string;
  overallScore: number;
  summary: string;
  dataQuality?: number | { percentage?: number };
  markers?: Marker[];
  reportBiomarkers?: string[];
  keyIssues?: string[];
  recommendations?: LabReportRecommendation;
  createdAt?: string;
};

type LabReportHistoryPayload = {
  reports: LabReportData[];
  count: number;
};

type LabReportDetailPayload = {
  report: LabReportData;
};

export type UploadReportFile = {
  uri: string;
  name: string;
  type?: string;
};

// Mobile App Format (for UI)
export type LabReport = {
  _id: string;
  userId: string;
  fileName: string;
  displayName?: string;
  uploadedAt: string;
  createdAt?: string;
  summary?: string;
  biomarkers?: Marker[];
  overallScore?: number;
  dataQuality?: number;
  recommendations?: { category: 'immediate' | 'daily'; items: string[] }[];
  suggestions?: string[];
};

const transformLabReport = (data: LabReportData): LabReport => {
  const qualityPercent =
    typeof data.dataQuality === 'number'
      ? data.dataQuality
      : (data.dataQuality as any)?.percentage ?? 0;

  const biomarkers = (data.markers || []).map((marker) => ({
    name: marker.name,
    value: marker.value,
    unit: marker.unit,
    referenceRange: marker.normalRange || marker.referenceRange,
    explanation: marker.explanation || `Detected value: ${marker.value}`,
    status: marker.status || (marker.value ? 'normal' : 'not-found'),
  }));

  const recommendations = [];
  if (data.recommendations?.immediateActions && data.recommendations.immediateActions.length > 0) {
    recommendations.push({
      category: 'immediate' as const,
      items: data.recommendations.immediateActions,
    });
  }
  if (data.recommendations?.dailyPractices && data.recommendations.dailyPractices.length > 0) {
    recommendations.push({
      category: 'daily' as const,
      items: data.recommendations.dailyPractices,
    });
  }

  return {
    _id: data.id,
    userId: data.userId,
    fileName: data.originalFileName,
    displayName: data.originalFileName.replace(/\.[^.]+$/, ''),
    uploadedAt: data.createdAt || new Date().toISOString(),
    createdAt: data.createdAt,
    summary: data.summary,
    biomarkers,
    overallScore: data.overallScore,
    dataQuality: qualityPercent,
    recommendations,
    suggestions: data.keyIssues,
  };
};

export const fetchReportHistory = async (userId: string): Promise<LabReport[]> => {
  const response = await request<LabReportHistoryPayload>(
    `/api/lab-reports/user/${userId}`
  );
  return (response.reports || []).map(transformLabReport);
};

export const fetchReportById = async (reportId: string): Promise<LabReport> => {
  const response = await request<LabReportDetailPayload>(`/api/lab-reports/${reportId}`);
  return transformLabReport(response.report);
};

export const uploadReport = async (userId: string, file: UploadReportFile) => {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('report', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'application/octet-stream',
  } as any);

  const response = await fetch(`${API_BASE_URL}/api/lab-reports/upload`, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; message?: string; data?: { report: LabReportData } }
    | null;

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  const reportData = (payload?.data as any)?.report ?? payload;
  return transformLabReport(reportData);
};

export const fetchDashboardStats = (userId: string) =>
  request<DashboardStats>(`/api/moods/dashboard/${userId}`);

export const fetchWeeklyMood = (userId: string) =>
  request<WeeklyMoodPoint[]>(`/api/moods/weekly/${userId}`);

export const fetchMoodHistory = (userId: string) =>
  request<MoodEntry[]>(`/api/moods/history/${userId}`);

export const createCheckIn = (payload: CheckInPayload) =>
  request<MoodEntry>(`/api/moods`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateShareWithDoctor = (moodId: string, shareWithDoctor: boolean) =>
  request<MoodEntry>(`/api/moods/${moodId}`, {
    method: 'PATCH',
    body: JSON.stringify({ shareWithDoctor }),
  });

export const fetchMoodFixActivities = () => request<MoodFixActivity[]>(`/api/mood-fix/activities`);
