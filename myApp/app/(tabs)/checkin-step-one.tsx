import { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MobilePalette } from '@/constants/theme';

type MoodValue = 'terrible' | 'sad' | 'okay' | 'good' | 'great';

const moodOptions: Array<{ value: MoodValue; label: string; emoji: string }> = [
  { value: 'terrible', label: 'Terrible', emoji: '😫' },
  { value: 'sad', label: 'Sad', emoji: '😔' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'great', label: 'Great', emoji: '😊' },
];

const formatDate = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

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

export default function CheckinStepOneScreen() {
  const router = useRouter();
  const [mood, setMood] = useState<MoodValue>('good');
  const [note, setNote] = useState('');
  const displayDate = useMemo(() => formatDate(), []);

  const continueToStepTwo = () => {
    router.push({
      pathname: '/(tabs)/checkin-step-two',
      params: { mood, note },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={MobilePalette.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Daily Check-in</Text>
            <Text style={styles.headerSubtitle}>{displayDate}</Text>
          </View>
          <View style={styles.iconSpacer} />
        </View>

        <ProgressCard current={1} total={3} />

        <View style={styles.card}>
          <Text style={styles.questionTitle}>How are you feeling right now</Text>
          <View style={styles.moodRow}>
            {moodOptions.map((option) => {
              const isSelected = mood === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMood(option.value)}
                  style={[styles.moodPill, isSelected && styles.moodPillSelected]}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={[styles.moodPillText, isSelected && styles.moodPillTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.cardDivider} />

          <Text style={styles.noteLabel}>Add Note   (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What's contributing to this feeling"
            placeholderTextColor="#8f8f8f"
            multiline
            style={styles.noteInput}
          />
        </View>

        <View style={styles.footerButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={styles.secondaryButtonText}>Save for later</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={continueToStepTwo}>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
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
    gap: 14,
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
    fontWeight: '800',
    lineHeight: 34,
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfcfcf',
    backgroundColor: '#f4f4f4',
    padding: 16,
  },
  questionTitle: {
    color: '#151515',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  moodRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodPill: {
    flex: 1,
    minHeight: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d1d1',
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  moodPillSelected: {
    backgroundColor: MobilePalette.primary,
    borderColor: MobilePalette.primary,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodPillText: {
    color: '#1f1f1f',
    fontSize: 13,
    fontWeight: '600',
  },
  moodPillTextSelected: {
    color: '#fff',
  },
  cardDivider: {
    marginTop: 18,
    marginBottom: 14,
    height: 1,
    backgroundColor: '#d6d6d6',
  },
  noteLabel: {
    color: '#222',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 76,
    borderTopWidth: 1,
    borderColor: '#d1d1d1',
    paddingTop: 10,
    color: '#222',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  footerButtons: {
    marginTop: 10,
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
    fontSize: 17,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: MobilePalette.primary,
    flexDirection: 'row',
    gap: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
