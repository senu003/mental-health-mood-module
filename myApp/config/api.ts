import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHostUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const host = String(hostUri).split(':')[0];
  if (!host) {
    return null;
  }

  return `http://${host}:5000`;
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  getDevHostUrl() ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

export const CURRENT_USER_ID = process.env.EXPO_PUBLIC_USER_ID || (__DEV__ ? 'testuser001' : '');
