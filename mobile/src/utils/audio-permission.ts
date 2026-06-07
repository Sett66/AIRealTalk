import { PermissionsAndroid, Platform } from 'react-native';

export type MicPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export async function requestMicPermission(): Promise<MicPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (granted) {
    return 'granted';
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: '麦克风权限',
      message: 'AIRealTalk 需要麦克风权限以录制你的英语练习语音。',
      buttonPositive: '允许',
      buttonNegative: '拒绝',
    },
  );

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }

  return 'denied';
}
