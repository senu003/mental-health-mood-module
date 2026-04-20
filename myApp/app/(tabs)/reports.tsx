import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CURRENT_USER_ID } from '@/config/api';
import { useReportHistory, useReportStats } from '@/hooks/use-report-data';
import { uploadReport } from '@/services/mood-api';
import { ReportCard, StatsCard } from '@/components/mobile/report-components';

export default function ReportAnalysisScreen() {
  const router = useRouter();
  const { reports, loading, error, refresh } = useReportHistory(CURRENT_USER_ID);
  const [showAllReports, setShowAllReports] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedReportId, setUploadedReportId] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');

  const stats = useReportStats(reports);
  const displayReports = showAllReports ? reports : reports.slice(0, 3);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleReportPress = (reportId: string) => {
    router.push({
      pathname: '/report-detail',
      params: { reportId },
    });
  };

  const handleUploadReport = async () => {
    try {
      const selected = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (selected.canceled || !selected.assets?.length) {
        return;
      }

      const file = selected.assets[0];
      setIsUploading(true);
      setUploadedReportId(null);
      setUploadFileName(file.name || 'Selected report');

      const uploaded = await uploadReport(CURRENT_USER_ID, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      setUploadedReportId(uploaded._id);
      await refresh();
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Unable to upload the selected report.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenUploadedReport = () => {
    if (!uploadedReportId) return;
    setUploadedReportId(null);
    setUploadFileName('');
    handleReportPress(uploadedReportId);
  };

  const showUploadExperience = isUploading || Boolean(uploadedReportId);

  if (loading && !reports.length) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C5BD5" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  if (showUploadExperience) {
    return (
      <View style={styles.uploadExperienceContainer}>
        <View style={styles.uploadExperienceTop}>
          <Text style={styles.uploadExperienceTitle}>Report uploading</Text>
          <Text style={styles.uploadExperienceSubtitle}>Wait for few seconds</Text>
        </View>

        <View style={styles.brainIllustrationWrap}>
          <View style={styles.brainBlob}>
            <MaterialCommunityIcons name="brain" size={210} color="#55ABD8" />
          </View>
          <View style={styles.brainShadow} />
        </View>

        {isUploading ? (
          <View style={styles.uploadProgressButton}>
            <Text style={styles.uploadProgressText}>Uploading ...</Text>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadDoneButton} onPress={handleOpenUploadedReport}>
            <Text style={styles.uploadDoneText}>View Report</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Report Analysis</Text>
        <Text style={styles.subtitle}>Track & understand your health metrics</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>Upload Report</Text>
          <Text style={styles.uploadSubtitle}>PDF, PNG, JPG or WEBP</Text>

          {!isUploading && !uploadedReportId && (
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadReport}>
              <Text style={styles.uploadButtonText}>Upload Report</Text>
            </TouchableOpacity>
          )}

          {isUploading && (
            <View style={styles.uploadingBox}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.uploadingText}>Uploading {uploadFileName}...</Text>
            </View>
          )}

          {!isUploading && uploadedReportId && (
            <TouchableOpacity style={styles.viewReportButton} onPress={handleOpenUploadedReport}>
              <Text style={styles.viewReportButtonText}>View Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      {reports.length > 0 && (
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatsCard label="Total Reports" value={stats.totalReports} />
            <StatsCard label="Latest Score" value={stats.latestScore} />
          </View>
          <View style={styles.statsGrid}>
            <StatsCard label="Average Score" value={stats.averageScore} />
            <StatsCard
              label="Last Upload"
              value={
                stats.lastUploadDate
                  ? new Date(stats.lastUploadDate).toLocaleDateString()
                  : 'N/A'
              }
            />
          </View>
        </View>
      )}

      {/* Recent Reports */}
      {reports.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Analysis Reports {reports.length > 3 && `(${reports.length})`}
          </Text>

          {displayReports.map((report) => (
            <ReportCard
              key={report._id}
              report={report}
              onPress={() => handleReportPress(report._id)}
            />
          ))}

          {!showAllReports && reports.length > 3 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllReports(true)}
            >
              <Text style={styles.showMoreText}>Show All Reports</Text>
            </TouchableOpacity>
          )}

          {showAllReports && reports.length > 3 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllReports(false)}
            >
              <Text style={styles.showMoreText}>Show Less</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Empty State */}
      {reports.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Reports Yet</Text>
          <Text style={styles.emptyMessage}>
            No reports are available for this account yet. Reports added from the same backend and
            database will appear here.
          </Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  uploadCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#89D2FF',
    backgroundColor: '#EAF6FF',
    padding: 14,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#7AA5BE',
    borderRadius: 999,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  uploadingText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewReportButton: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewReportButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C5BD5',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gapY: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  uploadExperienceContainer: {
    flex: 1,
    backgroundColor: '#B8DDF2',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 112,
    paddingHorizontal: 20,
  },
  uploadExperienceTop: {
    alignItems: 'center',
  },
  uploadExperienceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 4,
  },
  uploadExperienceSubtitle: {
    fontSize: 14,
    color: '#22324A',
  },
  brainIllustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 30,
  },
  brainBlob: {
    width: 320,
    height: 245,
    borderRadius: 130,
    backgroundColor: '#F6FAFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainShadow: {
    marginTop: -16,
    width: 140,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#58AEDA',
    opacity: 0.9,
  },
  uploadProgressButton: {
    width: 230,
    backgroundColor: '#7FA7BF',
    borderRadius: 999,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadProgressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F8FBFF',
  },
  uploadDoneButton: {
    width: 250,
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadDoneText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
