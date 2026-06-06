import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const BAR_COUNT = 5;
const MIN_HEIGHT = 6;
const MAX_HEIGHT = 28;

type AudioWaveProps = {
  active: boolean;
};

export function AudioWave({ active }: AudioWaveProps) {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(MIN_HEIGHT)),
  ).current;

  useEffect(() => {
    if (!active) {
      animations.forEach((anim) => {
        anim.stopAnimation();
        anim.setValue(MIN_HEIGHT);
      });
      return;
    }

    const loops = animations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: MAX_HEIGHT - index * 2,
            duration: 280 + index * 40,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: MIN_HEIGHT + index,
            duration: 280 + index * 40,
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [active, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[styles.bar, { height: anim, backgroundColor: '#dc2626' }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 32,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
