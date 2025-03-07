import React, { useRef } from 'react';
import { View, PanResponder, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface DrawingCanvasProps {
  imageSource: ImageSourcePropType;
  onStrokeComplete?: (stroke: Stroke) => void;
}

export function DrawingCanvas({ imageSource, onStrokeComplete }: DrawingCanvasProps) {
  const strokesRef = useRef<Stroke[]>([]);
  const currentPointsRef = useRef<Point[]>([]);
  const pathsRef = useRef<React.ReactNode[]>([]);

  const addNewPath = (points: Point[]) => {
    const newPath = (
      <Path
        key={`stroke_${strokesRef.current.length}`}
        d={createPathData(points)}
        stroke='#FF0000'
        strokeWidth={2}
        fill='none'
      />
    );
    pathsRef.current = [...pathsRef.current, newPath];
    forceUpdate();
  };

  const [, updateState] = React.useState<object>();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPointsRef.current = [{ x: locationX, y: locationY }];
        forceUpdate();
      },

      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPointsRef.current = [...currentPointsRef.current, { x: locationX, y: locationY }];
        forceUpdate();
      },

      onPanResponderRelease: () => {
        if (currentPointsRef.current.length > 0) {
          const newStroke: Stroke = {
            points: [...currentPointsRef.current],
            color: '#FF0000',
            width: 2,
          };

          strokesRef.current = [...strokesRef.current, newStroke];
          addNewPath(currentPointsRef.current);
          onStrokeComplete?.(newStroke);
          currentPointsRef.current = [];
        }
      },
    })
  ).current;

  const createPathData = (points: Point[]): string => {
    if (points.length === 0) return '';
    const start = points[0];
    let path = `M ${start.x} ${start.y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  return (
    <View style={styles.container}>
      <Image source={imageSource} style={styles.image} resizeMode='contain' />
      <Svg style={StyleSheet.absoluteFill}>
        {pathsRef.current}
        {currentPointsRef.current.length > 0 && (
          <Path d={createPathData(currentPointsRef.current)} stroke='#FF0000' strokeWidth={2} fill='none' />
        )}
      </Svg>
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
