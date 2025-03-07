import React from 'react';
import { View, StyleSheet } from 'react-native';

import { DrawingCanvas } from '@/components/DrawingCanvas';

export default function HomeScreen() {
  const handleStrokeComplete = (stroke: any) => {
    console.log('Stroke completed:', stroke);
  };

  return (
    <View style={styles.container}>
      <DrawingCanvas imageSource={require('@/assets/images/demo.png')} onStrokeComplete={handleStrokeComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
