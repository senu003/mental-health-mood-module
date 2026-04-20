import { useState } from 'react';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MobilePalette } from '@/constants/theme';
import { CURRENT_USER_ID } from '@/config/api';
import { createCheckIn, fetchDashboardStats } from '@/services/mood-api';

type SliderQuestionProps = {
  title: string;
  value: number;
  onChange: (value: number) => void;
};

type QuestionKey =
  | 'sleepLevel'
  | 'anxietyLevel'
  | 'energyLevel'
  | 'motivationLevel'
  | 'socialInteraction'
  | 'stressLevel'
  | 'focusLevel';

const questionConfig: Array<{ key: QuestionKey; label: string }> = [
  { key: 'sleepLevel', label: 'How well did you sleep last night' },
  { key: 'anxietyLevel', label: 'How anxious do you feel today' },
  { key: 'energyLevel', label: 'Rate your energy level' },
  { key: 'motivationLevel', label: 'How motivated do you feel?' },
  { key: 'socialInteraction', label: 'Rate your social interaction today' },
  { key: 'stressLevel', label: 'How stressed do you feel?' },
  { key: 'focusLevel', label: 'Rate your focus level' },
];

function ProgressCard({ current, total }: { current: number; total: number }) {
  const percent = (current / total) * 100;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeaderRow}>
        <Text style={styles.progressLabel}>Progress</Text>
        <Text style={styles.progressCount}>{current} of {total}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function SliderQuestion({ title, value, onChange }: SliderQuestionProps) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionTitle}>{title}</Text>

      <View style={styles.scaleHeader}>
        <Text style={styles.scaleLabel}>Not at all</Text>
        <Text style={styles.scaleLabel}>Extremely</Text>
      </View>

      <Slider
        style={styles.sliderTrack}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        minimumTrackTintColor={MobilePalette.primary}
        maximumTrackTintColor="#d1d1d1"
        thumbTintColor={MobilePalette.primary}
        onValueChange={onChange}
      />

      <View style={styles.valueBadge}>
        <Text style={styles.valueBadgeText}>{value}/10</Text>
      </View>
    </View>
  );
}

export default function CheckinStepTwoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mood?: string; note?: string }>();

  const mood = typeof params.mood === 'string' ? params.mood : '';
  const note = typeof params.note === 'string' ? params.note : '';

  const [levels, setLevels] = useState<Record<QuestionKey, number>>({
    sleepLevel: 5,
    anxietyLevel: 5,
    energyLevel: 5,
    motivationLevel: 5,
    socialInteraction: 5,
    stressLevel: 5,
    focusLevel: 5,
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateLevel = (key: QuestionKey, value: number) => {
    setLevels((prev) => ({ ...prev, [key]: value }));
  };

  const submitCheckIn = async () => {
    if (!mood) {
      router.replace('/(tabs)/checkin-step-one');
      return;
    }

    if (!CURRENT_USER_ID) {
      setSubmitError('User is not configured. Please set EXPO_PUBLIC_USER_ID.');
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      const created = await createCheckIn({
        userId: CURRENT_USER_ID,
        mood: mood as 'terrible' | 'sad' | 'okay' | 'good' | 'great',
        shareWithDoctor: false,
        note,
        ...levels,
      });

      const dashboard = await fetchDashboardStats(CURRENT_USER_ID);
      const now = new Date();
      const createdCheckInId =
        (typeof created?._id === 'string' && created._id) ||
        (typeof (created as { id?: string })?.id === 'string' && (created as { id?: string }).id) ||
        (typeof (created as { saved?: { _id?: string } })?.saved?._id === 'string' &&
          (created as { saved?: { _id?: string } }).saved?._id) ||
        (typeof (created as { data?: { _id?: string } })?.data?._id === 'string' &&
          (created as { data?: { _id?: string } }).data?._id) ||
        '';

      router.replace({
        pathname: '/(tabs)/checkin-summary',
        params: {
          checkInId: createdCheckInId,
          mood,
          note,
          moodScore: String(Number(created?.mentalHealthScore || 0).toFixed(1)),
          shareWithDoctor: String(Boolean(created?.shareWithDoctor)),
          checkInStreak: String(Number(dashboard?.checkInStreak || 0)),
          date: now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sleepLevel: String(levels.sleepLevel),
          anxietyLevel: String(levels.anxietyLevel),
          energyLevel: String(levels.energyLevel),
          motivationLevel: String(levels.motivationLevel),
          socialInteraction: String(levels.socialInteraction),
          stressLevel: String(levels.stressLevel),
          focusLevel: String(levels.focusLevel),
        },
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to complete check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={MobilePalette.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Assessment question</Text>
            <Text style={styles.headerSubtitle}>Help us understand your wellbeing</Text>
          </View>
          <View style={styles.iconSpacer} />
        </View>

        <ProgressCard current={2} total={3} />

        {questionConfig.map((question) => (
          <SliderQuestion
            key={question.key}
            title={question.label}
            value={levels[question.key]}
            onChange={(value) => updateLevel(question.key, value)}
          />
        ))}

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <View style={styles.footerButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={submitCheckIn} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Complete check-in'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 36,
    height: 36,
  },
  headerCopy: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#1b1b1b',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#636363',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '500',
  },
  progressCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#3f3f3f',
    fontSize: 13,
    fontWeight: '600',
  },
  progressCount: {
    color: '#4a4a4a',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#dadada',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#101010',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  questionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfcfcf',
    backgroundColor: '#f4f4f4',
    padding: 16,
  },
  questionTitle: {
    color: '#151515',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    marginBottom: 12,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scaleLabel: {
    color: '#5e5e5e',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderTrack: {
    width: '100%',
    height: 36,
    marginVertical: -6,
  },
  valueBadge: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: MobilePalette.primary,
    borderRadius: 10,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  valueBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  footerButtons: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: MobilePalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: '#f4f4f4',
  },
  secondaryButtonText: {
    color: MobilePalette.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: MobilePalette.primary,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
});
