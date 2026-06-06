import { Platform } from 'react-native';

/**
 * Android emulator maps host localhost to 10.0.2.2.
 * Physical device: replace with your PC's LAN IP (e.g. 192.168.1.x).
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${DEV_HOST}:3000`;
