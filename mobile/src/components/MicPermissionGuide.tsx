import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type MicPermissionGuideProps = {
  blocked: boolean;
  onRetry: () => void;
};

export function MicPermissionGuide({ blocked, onRetry }: MicPermissionGuideProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>需要麦克风权限</Text>
      <Text style={styles.description}>
        AIRealTalk 需要录制你的英语练习语音。没有麦克风权限将无法进行对话练习。
      </Text>

      <View style={styles.steps}>
        <Text style={styles.step}>1. 打开系统「设置」→「应用」→ AIRealTalk</Text>
        <Text style={styles.step}>2. 进入「权限」，开启「麦克风」</Text>
        <Text style={styles.step}>3. 返回 App，点击下方「重新检测」</Text>
      </View>

      {blocked && (
        <Text style={styles.blockedHint}>
          你已选择「不再询问」，请直接在系统设置中手动开启麦克风权限。
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel="打开系统设置"
        >
          <Text style={styles.primaryButtonText}>打开系统设置</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="重新检测麦克风权限"
        >
          <Text style={styles.secondaryButtonText}>重新检测</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 24,
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400e',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#78350f',
    textAlign: 'center',
  },
  steps: {
    gap: 8,
    marginTop: 4,
  },
  step: {
    fontSize: 13,
    lineHeight: 20,
    color: '#92400e',
  },
  blockedHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#b45309',
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  secondaryButtonText: {
    color: '#b45309',
    fontSize: 16,
    fontWeight: '600',
  },
});
