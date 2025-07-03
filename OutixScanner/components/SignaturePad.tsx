import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

interface SignaturePadProps {
  onSignature: (signature: string) => void;
  containerStyle?: ViewStyle;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignature, containerStyle }) => {
  const pathRef = useRef<string>('');
  const currentPointRef = useRef<string | null>(null);

  const pan = Gesture.Pan()
    .onStart((event) => {
      const { x, y } = event;
      currentPointRef.current = `M ${x} ${y}`;
      pathRef.current = currentPointRef.current;
    })
    .onUpdate((event) => {
      const { x, y } = event;
      currentPointRef.current = `${currentPointRef.current} L ${x} ${y}`;
      pathRef.current = currentPointRef.current;
      // Force re-render
      onSignature(pathRef.current);
    })
    .onFinalize(() => {
      if (currentPointRef.current) {
        pathRef.current = currentPointRef.current;
        onSignature(pathRef.current);
      }
    });

  return (
    <View style={[styles.container, containerStyle]}>
      <GestureDetector gesture={pan}>
        <Svg style={StyleSheet.absoluteFill}>
          {pathRef.current ? <Path d={pathRef.current} stroke="black" strokeWidth={2} fill="none" /> : null}
        </Svg>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});

export default SignaturePad; 