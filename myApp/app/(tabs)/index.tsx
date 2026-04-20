import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MobilePalette } from '@/constants/theme';
import { SidebarDrawer } from '@/components/mobile/sidebar-drawer';

export default function MoodFixScreen() {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <SidebarDrawer visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setSidebarVisible(true)} style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={24} color="#111" />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerKicker}>Mood Fix</Text>
            <Text style={styles.headerTitle}>Track and recover</Text>
          </View>

          <Pressable onPress={() => router.push('/dashboard' as never)} style={styles.iconButton}>
            <MaterialCommunityIcons name="view-dashboard" size={22} color="#111" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="heart-pulse" size={26} color={MobilePalette.primary} />
          </View>
          <Text style={styles.heroTitle}>Start with your latest mood check-in</Text>
          <Text style={styles.heroDescription}>
            Continue the mood-fix flow, then jump into the dashboard to review your weekly trends,
            recovery score, and check-in streak.
          </Text>

          <Pressable onPress={() => router.push('/dashboard' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open Dashboard</Text>
          </Pressable>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="shield-account-outline" size={22} color={MobilePalette.primary} />
            <Text style={styles.infoCardTitle}>Same backend</Text>
            <Text style={styles.infoCardText}>Connects to the existing mood API and database.</Text>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="phone-outline" size={22} color={MobilePalette.primary} />
            <Text style={styles.infoCardTitle}>Mobile first</Text>
            <Text style={styles.infoCardText}>Optimized for smaller screens with a slide-in sidebar.</Text>
          </View>
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
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: MobilePalette.softSurface,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: MobilePalette.softSurface,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  headerKicker: {
    color: '#111',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  headerTitle: {
    color: '#6f6a6a',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: MobilePalette.softSurface,
    borderWidth: 1,
    borderColor: '#bfe9fb',
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#111',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  heroDescription: {
    color: '#5f5a5a',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#111',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  infoGrid: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    padding: 18,
    gap: 8,
  },
  infoCardTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '800',
  },
  infoCardText: {
    color: '#6f6a6a',
    fontSize: 15,
    lineHeight: 22,
  },
});
