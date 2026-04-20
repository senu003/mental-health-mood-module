import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReportDetail } from '@/hooks/use-report-data';
import {
  ScoreGauge,
  BiomarkerCard,
  StatsCard,
  RecommendationItem,
} from '@/components/mobile/report-components';

export default function ReportDetailScreen() {
  const router = useRouter();
  const { reportId } = useLocalSearchParams();
  const { report, loading, error } = useReportDetail(reportId as string);
  const [expandedBiomarkers, setExpandedBiomarkers] = useState(false);

  const handleShare = async () => {
    if (!report) return;

    try {
      const reportText = `
Report: ${report.displayName || report.fileName}
Date: ${new Date(report.uploadedAt).toLocaleDateString()}
Health Score: ${Math.round(report.overallScore ?? 0)}/100
Data Quality: ${Math.round(report.dataQuality ?? 0)}%

Biomarkers Detected: ${report.biomarkers?.length || 0}
${
  report.summary
    ? `Summary: ${report.summary}`
    : ''
}
      `.trim();

      await Share.share({
        message: reportText,
        title: `Health Report - ${report.displayName || report.fileName}`,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    alert('Download feature coming soon!');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C5BD5" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Report</Text>
          <Text style={styles.errorText}>{error || 'Report not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const immediateActions = report.recommendations?.find((r) => r.category === 'immediate')
    ?.items || [];
  const dailyPractices = report.recommendations?.find((r) => r.category === 'daily')?.items || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.shareIcon}>⤴</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Report Title & Metadata */}
        <View style={styles.section}>
          <Text style={styles.reportTitle}>{report.displayName || report.fileName}</Text>
          <Text style={styles.reportDate}>
            Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Overall Health Score */}
        {report.overallScore !== undefined && (
          <View style={styles.section}>
            <ScoreGauge score={report.overallScore} />
          </View>
        )}

        {/* Key Metrics */}
        {(report.biomarkers || report.dataQuality !== undefined) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              {report.biomarkers && (
                <StatsCard
                  label="Biomarkers Detected"
                  value={report.biomarkers.length}
                />
              )}
              {report.dataQuality !== undefined && (
                <StatsCard label="Completeness" value={`${Math.round(report.dataQuality)}%`} />
              )}
            </View>
            {report.suggestions && (
              <StatsCard label="Suggestions" value={report.suggestions.length} />
            )}
          </View>
        )}

        {/* Summary */}
        {report.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{report.summary}</Text>
            </View>
          </View>
        )}

        {/* Biomarker Results */}
        {report.biomarkers && report.biomarkers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.biomarkerHeader}>
              <Text style={styles.sectionTitle}>Biomarker Results</Text>
              <Text style={styles.biomarkerCount}>{report.biomarkers.length}</Text>
            </View>

            {report.biomarkers
              .slice(0, expandedBiomarkers ? report.biomarkers.length : 5)
              .map((biomarker, index) => (
                <BiomarkerCard key={index} biomarker={biomarker} index={index} />
              ))}

            {report.biomarkers.length > 5 && !expandedBiomarkers && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpandedBiomarkers(true)}
              >
                <Text style={styles.expandText}>
                  Show {report.biomarkers.length - 5} more biomarkers
                </Text>
              </TouchableOpacity>
            )}

            {expandedBiomarkers && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpandedBiomarkers(false)}
              >
                <Text style={styles.expandText}>Show less</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Care Recommendations */}
        {(immediateActions.length > 0 || dailyPractices.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Care Recommendations</Text>

            {immediateActions.length > 0 && (
              <>
                <Text style={styles.recommendationCategory}>Immediate Actions</Text>
                {immediateActions.map((item, index) => (
                  <RecommendationItem key={`immediate-${index}`} text={item} isDaily={false} />
                ))}
              </>
            )}

            {dailyPractices.length > 0 && (
              <>
                <Text style={styles.recommendationCategory}>Daily Practices</Text>
                {dailyPractices.map((item, index) => (
                  <RecommendationItem key={`daily-${index}`} text={item} isDaily={true} />
                ))}
              </>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This report is for informational purposes only and should not replace professional
            medical advice. Please consult with a healthcare provider to discuss these results.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Text style={styles.downloadIcon}>⬇</Text>
            <Text style={styles.downloadText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButtonFull} onPress={handleShare}>
            <Text style={styles.shareIcon}>⤴</Text>
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  backButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#0C5BD5',
  },
  shareButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 18,
    color: '#0C5BD5',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0C5BD5',
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  biomarkerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  biomarkerCount: {
    fontSize: 12,
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  expandButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  expandText: {
    fontSize: 13,
    color: '#0C5BD5',
    fontWeight: '600',
  },
  recommendationCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  disclaimerSection: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  downloadIcon: {
    fontSize: 16,
  },
  downloadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  shareButtonFull: {
    flex: 1,
    backgroundColor: '#0C5BD5',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0C5BD5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
