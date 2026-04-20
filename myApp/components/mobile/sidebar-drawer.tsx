import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';

import { MobilePalette } from '@/constants/theme';

type SidebarDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route?: '/' | '/dashboard' | '/history' | '/reports';
};

const menuItems: MenuItem[] = [
  { label: 'Mood Fix', icon: 'heart-pulse', route: '/' },
  { label: 'Dashboard', icon: 'view-dashboard', route: '/dashboard' },
  { label: 'History', icon: 'calendar-text', route: '/history' },
  { label: 'Report Analysis', icon: 'file-document', route: '/reports' },
  { label: 'Settings', icon: 'cog-outline', route: undefined },
];

export const SidebarDrawer = ({ visible, onClose }: SidebarDrawerProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const slide = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (visible) {
      slide.setValue(-1);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [slide, visible]);

  if (!visible) {
    return null;
  }

  const translateX = slide.interpolate({
    inputRange: [-1, 0],
    outputRange: [-width * 0.78, 0],
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.brandTitle}>MediLink</Text>
              <Text style={styles.brandSubtitle}>Mobile mood workspace</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#111" />
            </Pressable>
          </View>

          <View style={styles.menuList}>
            {menuItems.map((item) => {
              const active = item.route ? pathname === item.route : false;

              return (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route as never);
                      onClose();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    active && styles.menuItemActive,
                    pressed && styles.menuItemPressed,
                    !item.route && styles.menuItemMuted,
                  ]}
                >
                  <View style={styles.menuIconWrap}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={active ? '#fff' : MobilePalette.primary}
                    />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
                    <Text style={[styles.menuHint, active && styles.menuHintActive]}>
                      {item.route ? 'Open screen' : 'Coming soon'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sidebarNote}>
            <Text style={styles.sidebarNoteTitle}>Backend connected</Text>
            <Text style={styles.sidebarNoteBody}>
              Dashboard metrics and weekly mood data come from the same mood API used by the web app.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  panel: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: MobilePalette.primary,
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  menuItemActive: {
    backgroundColor: MobilePalette.primary,
  },
  menuItemMuted: {
    opacity: 0.75,
  },
  menuItemPressed: {
    transform: [{ scale: 0.99 }],
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  menuLabelActive: {
    color: '#fff',
  },
  menuHint: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    marginTop: 3,
  },
  menuHintActive: {
    color: 'rgba(255,255,255,0.86)',
  },
  sidebarNote: {
    marginTop: 'auto',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  sidebarNoteTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  sidebarNoteBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },
});
