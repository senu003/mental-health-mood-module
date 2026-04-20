import { useState, useEffect } from 'react';
import { fetchReportHistory, fetchReportById, LabReport } from '@/services/mood-api';

export const useReportHistory = (userId: string) => {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchReportHistory(userId);
        if (isMounted) {
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch reports');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchReportHistory(userId);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  return { reports, loading, error, refresh };
};

export const useReportDetail = (reportId: string) => {
  const [report, setReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchReportById(reportId);
        if (isMounted) {
          setReport(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch report');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  return { report, loading, error };
};

export const useReportStats = (reports: LabReport[]) => {
  return {
    totalReports: reports.length,
    latestScore: reports[0]?.overallScore ?? null,
    averageScore:
      reports.length > 0
        ? Math.round(
            reports.reduce((acc, r) => acc + (r.overallScore ?? 0), 0) / reports.length
          )
        : null,
    lastUploadDate: reports[0]?.uploadedAt ?? null,
  };
};
