import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MobilePalette } from '@/constants/theme';
import { updateShareWithDoctor } from '@/services/mood-api';

type MoodValue = 'terrible' | 'sad' | 'okay' | 'good' | 'great';

type LevelKey =
  | 'sleepLevel'
  | 'anxietyLevel'
  | 'energyLevel'
  | 'motivationLevel'
  | 'socialInteraction'
  | 'stressLevel'
  | 'focusLevel';

const moodMeta: Record<MoodValue, { label: string; emoji: string; color: string }> = {
  terrible: { label: 'Terrible', emoji: '😫', color: '#8b0000' },
  sad: { label: 'Sad', emoji: '😔', color: '#4a6fa5' },
  okay: { label: 'Okay', emoji: '😐', color: '#f4a261' },
  good: { label: 'Good', emoji: '🙂', color: '#2a9d8f' },
  great: { label: 'Great', emoji: '😊', color: MobilePalette.primary },
};

const levelLabels: Record<LevelKey, string> = {
  sleepLevel: 'Sleep',
  anxietyLevel: 'Anxiety',
  energyLevel: 'Energy',
  motivationLevel: 'Motivation',
  socialInteraction: 'Social',
  stressLevel: 'Stress',
  focusLevel: 'Focus',
};

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBarColor = (key: LevelKey, value: number) => {
  if (key === 'anxietyLevel' || key === 'stressLevel') {
    if (value <= 3) return '#10b981';
    if (value <= 6) return '#f59e0b';
    return '#ef4444';
  }

  if (value >= 7) return '#10b981';
  if (value >= 4) return MobilePalette.primary;
  return '#f59e0b';
};

export default function CheckinSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const moodValue = (typeof params.mood === 'string' ? params.mood : 'okay') as MoodValue;
  const mood = moodMeta[moodValue] || moodMeta.okay;

  const moodScore = toNumber(params.moodScore, 0);
  const checkInStreak = toNumber(params.checkInStreak, 0);

  const levels: Record<LevelKey, number> = {
    sleepLevel: toNumber(params.sleepLevel, 5),
    anxietyLevel: toNumber(params.anxietyLevel, 5),
    energyLevel: toNumber(params.energyLevel, 5),
    motivationLevel: toNumber(params.motivationLevel, 5),
    socialInteraction: toNumber(params.socialInteraction, 5),
    stressLevel: toNumber(params.stressLevel, 5),
    focusLevel: toNumber(params.focusLevel, 5),
  };

  const essentials: LevelKey[] = ['sleepLevel', 'energyLevel', 'anxietyLevel', 'stressLevel'];
  const note = typeof params.note === 'string' ? params.note : '';
  const date = typeof params.date === 'string' ? params.date : '';
  const time = typeof params.time === 'string' ? params.time : '';
  const checkInId = typeof params.checkInId === 'string' ? params.checkInId : '';

  const [shareWithDoctor, setShareWithDoctor] = useState(
    typeof params.shareWithDoctor === 'string' ? params.shareWithDoctor === 'true' : false,
  );
  const [updatingShare, setUpdatingShare] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const onToggleShareWithDoctor = async (nextValue: boolean) => {
    if (!checkInId || updatingShare) {
      return;
    }

    const previous = shareWithDoctor;
    setShareWithDoctor(nextValue);
    setUpdatingShare(true);
    setShareMessage('');

    try {
      await updateShareWithDoctor(checkInId, nextValue);
      setShareMessage(nextValue ? 'Doctor sharing enabled.' : 'Doctor sharing disabled.');
    } catch {
      setShareWithDoctor(previous);
      setShareMessage('Could not update right now. Please try again.');
    } finally {
      setUpdatingShare(false);
    }
  };

  const handleShare = async () => {
    const levelsList = Object.entries(levels)
      .filter(([key]) => essentials.includes(key as LevelKey))
      .map(([key, value]) => `  • ${levelLabels[key as LevelKey]}: ${value}/10`)
      .join('\n');

    const shareText = `MediLink Mood Check-in Summary
Date: ${date}${time ? ` at ${time}` : ''}
Mood: ${mood.label}
Mood Score: ${moodScore.toFixed(1)}/10

Wellness Indicators:
${levelsList}

Check-in Streak: ${checkInStreak} days${note ? `\n\nNote: ${note}` : ''}`;

    try {
      await Share.share({
        message: shareText,
        title: 'My Mood Check-in Summary',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push('/(tabs)/dashboard')} style={styles.iconButton}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={MobilePalette.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Check-in Summary</Text>
            <Text style={styles.headerSubtitle}>Essential details from your latest check-in</Text>
          </View>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <MaterialCommunityIcons name="check-bold" size={22} color="#fff" />
          </View>
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>Check-in completed</Text>
            <Text style={styles.successSubtitle}>Saved to backend successfully</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.moodHeroRow}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <View>
              <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
              <Text style={styles.moodMeta}>{date}{time ? ` at ${time}` : ''}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Mood Score</Text>
              <Text style={styles.statValue}>{moodScore.toFixed(1)}/10</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Questions</Text>
              <Text style={styles.statValue}>7/7</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{checkInStreak}d</Text>
            </View>
          </View>

          {note ? (
            <View style={styles.noteWrap}>
              <Text style={styles.noteLabel}>Your Note</Text>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.levelsCard}>
          <Text style={styles.levelsTitle}>Key wellness indicators</Text>
          {essentials.map((key) => (
            <View key={key} style={styles.levelRow}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelLabel}>{levelLabels[key]}</Text>
                <Text style={[styles.levelValue, { color: getBarColor(key, levels[key]) }]}>{levels[key]}/10</Text>
              </View>
              <View style={styles.levelTrack}>
                <View
                  style={[
                    styles.levelFill,
                    {
                      width: `${(levels[key] / 10) * 100}%`,
                      backgroundColor: getBarColor(key, levels[key]),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.shareCard}>
          <View style={styles.shareHeader}>
            <View>
              <Text style={styles.shareTitle}>Share with doctor</Text>
              <Text style={styles.shareSubtitle}>Allow your doctor to view this check-in</Text>
            </View>
            <View style={styles.shareControlWrap}>
              {updatingShare ? <ActivityIndicator size="small" color={MobilePalette.primary} /> : null}
              <Switch
                value={shareWithDoctor}
                onValueChange={onToggleShareWithDoctor}
                disabled={updatingShare || !checkInId}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={shareWithDoctor ? MobilePalette.primary : '#f4f4f5'}
              />
            </View>
          </View>
          {!checkInId ? <Text style={styles.shareMessage}>Missing check-in id. Open this summary right after check-in to update sharing.</Text> : null}
          {shareMessage ? <Text style={styles.shareMessage}>{shareMessage}</Text> : null}
        </View>

        <Pressable style={styles.shareButton} onPress={handleShare}>
          <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Share Summary</Text>
        </Pressable>

        <View style={styles.moodFixCard}>
          <View style={styles.moodFixIconWrap}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={MobilePalette.primary} />
          </View>
          <View style={styles.moodFixCopyWrap}>
            <Text style={styles.moodFixTitle}>Based on your responses...</Text>
            <Text style={styles.moodFixSuggestionText}>We've curated personalized mood fix activities for you.</Text>
          </View>
          <Pressable
            style={styles.moodFixButton}
            onPress={() => router.push('/(tabs)/mood-fix-suggestion' as never)}
          >
            <Text style={styles.moodFixButtonText}>View Suggestion</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.footerButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/(tabs)/checkin-step-one')}>
            <Text style={styles.primaryButtonText}>New check-in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7fbff',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: MobilePalette.softSurface,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -90,
    left: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: MobilePalette.softSurface,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 30,
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
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  headerSubtitle: {
    color: '#636363',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  successCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b9ebcd',
    backgroundColor: '#eafdf2',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
  },
  successCopy: {
    flex: 1,
  },
  successTitle: {
    color: '#064e3b',
    fontSize: 16,
    fontWeight: '800',
  },
  successSubtitle: {
    color: '#047857',
    fontSize: 13,
    marginTop: 2,
  },
  mainCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d2e7ff',
    backgroundColor: '#fff',
    padding: 16,
    gap: 14,
    shadowColor: MobilePalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 2,
  },
  moodHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moodEmoji: {
    fontSize: 34,
  },
  moodLabel: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  moodMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f1f7ff',
    borderWidth: 1,
    borderColor: '#cfeeff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: MobilePalette.primary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  noteWrap: {
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  noteLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  levelsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce7f6',
    backgroundColor: '#fff',
    padding: 16,
    gap: 10,
  },
  levelsTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  levelRow: {
    gap: 6,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  levelValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  levelTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 999,
  },
  shareCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce7f6',
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  shareControlWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '800',
  },
  shareSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  shareMessage: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  shareButton: {
    borderRadius: 10,
    backgroundColor: MobilePalette.primary,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  moodFixCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdcff',
    backgroundColor: '#eef6ff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodFixIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dcecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodFixCopyWrap: {
    flex: 1,
    minWidth: 180,
  },
  moodFixTitle: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '800',
  },
  moodFixSuggestionText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  moodFixButton: {
    borderRadius: 10,
    backgroundColor: MobilePalette.primary,
    minHeight: 42,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    marginTop: 6,
  },
  moodFixButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  footerButtons: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MobilePalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: MobilePalette.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: MobilePalette.primary,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
