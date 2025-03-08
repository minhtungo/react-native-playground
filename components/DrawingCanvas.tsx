import { useSocketDrawing } from '@/hooks/useSocketDrawing';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  onChangeImage?: () => void;
}

export function DrawingCanvas({ imageSource, onStrokeComplete, onChangeImage }: DrawingCanvasProps) {
  const strokesRef = useRef<Stroke[]>([]);
  const currentPointsRef = useRef<Point[]>([]);
  const pathsRef = useRef<React.ReactNode[]>([]);
  const imageRef = useRef<Image>(null);
  const containerRef = useRef<View>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [displayedImageInfo, setDisplayedImageInfo] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const { onDraw, setCanvasInfo } = useSocketDrawing();

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const [, forceUpdate] = React.useState<object>();

  // Calculate the actual displayed image dimensions
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0 && imageSize.width > 0 && imageSize.height > 0) {
      const containerRatio = canvasSize.width / canvasSize.height;
      const imageRatio = imageSize.width / imageSize.height;

      let displayWidth, displayHeight, x, y;

      if (containerRatio > imageRatio) {
        displayHeight = canvasSize.height;
        displayWidth = displayHeight * imageRatio;
        x = (canvasSize.width - displayWidth) / 2;
        y = 0;
      } else {
        displayWidth = canvasSize.width;
        displayHeight = displayWidth / imageRatio;
        x = 0;
        y = (canvasSize.height - displayHeight) / 2;
      }

      setDisplayedImageInfo({
        x,
        y,
        width: displayWidth,
        height: displayHeight,
      });

      console.log(`Image displayed at (${x},${y}) with size ${displayWidth}x${displayHeight}`);
    }
  }, [canvasSize, imageSize]);

  // Set initial canvas size to screen dimensions
  useEffect(() => {
    setCanvasSize({ width: screenWidth, height: screenHeight });
    console.log(`Setting initial canvas size to screen dimensions: ${screenWidth}x${screenHeight}`);
  }, []);

  useEffect(() => {
    if (typeof imageSource === 'object' && 'uri' in imageSource) {
      console.log('Loading image from URI:', imageSource.uri);
      Image.getSize(
        imageSource.uri,
        (width, height) => {
          console.log(`Image size loaded: ${width}x${height}`);
          setImageSize({ width, height });
        },
        (error) => console.error('Error getting image size:', error)
      );
    }
  }, [imageSource]);

  useEffect(() => {
    if (displayedImageInfo.width > 0 && displayedImageInfo.height > 0) {
      console.log('Setting canvas info with displayed image dimensions');
      setCanvasInfo(displayedImageInfo.width, displayedImageInfo.height, imageSize.width, imageSize.height);
    }
  }, [displayedImageInfo]);

  const containerToImageCoordinates = (x: number, y: number) => {
    const displayWidth = displayedImageInfo.width > 0 ? displayedImageInfo.width : screenWidth;
    const displayHeight = displayedImageInfo.height > 0 ? displayedImageInfo.height : screenHeight;
    const displayX = displayedImageInfo.x;
    const displayY = displayedImageInfo.y;

    if (x < displayX || y < displayY || x > displayX + displayWidth || y > displayY + displayHeight) {
      console.log(`Point (${x},${y}) is outside image boundaries`);
      x = Math.max(displayX, Math.min(displayX + displayWidth, x));
      y = Math.max(displayY, Math.min(displayY + displayHeight, y));
    }

    const imageX = x - displayX;
    const imageY = y - displayY;

    return { x: imageX, y: imageY };
  };

  const normalizeCoordinates = (x: number, y: number) => {
    const displayWidth = displayedImageInfo.width > 0 ? displayedImageInfo.width : screenWidth;
    const displayHeight = displayedImageInfo.height > 0 ? displayedImageInfo.height : screenHeight;

    const imageCoords = containerToImageCoordinates(x, y);

    const normalizedX = imageCoords.x / displayWidth;
    const normalizedY = imageCoords.y / displayHeight;

    return {
      x: normalizedX,
      y: normalizedY,
    };
  };

  const addNewPath = (points: Point[]) => {
    if (points.length === 0) return;

    const newPath = (
      <Path
        key={`stroke_${strokesRef.current.length}`}
        d={createPathData(points)}
        stroke='#FF0000'
        strokeWidth={5}
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    );

    pathsRef.current = [...pathsRef.current, newPath];
  };

  const clearDrawing = () => {
    strokesRef.current = [];
    pathsRef.current = [];
    forceUpdate({});
  };

  const createPathData = (points: Point[]): string => {
    if (points.length === 0) return '';
    const start = points[0];
    let path = `M ${start.x} ${start.y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPointsRef.current = [{ x: locationX, y: locationY }];

        const normalized = normalizeCoordinates(locationX, locationY);
        console.log(`START DRAWING at (${locationX}, ${locationY}) -> normalized: (${normalized.x}, ${normalized.y})`);

        onDraw(normalized.x, normalized.y);
        forceUpdate({});
      },

      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPointsRef.current = [...currentPointsRef.current, { x: locationX, y: locationY }];

        const normalized = normalizeCoordinates(locationX, locationY);
        console.log(`MOVE DRAWING to (${locationX}, ${locationY}) -> normalized: (${normalized.x}, ${normalized.y})`);

        // Send to the server
        onDraw(normalized.x, normalized.y);
        forceUpdate({});
      },

      onPanResponderRelease: () => {
        if (currentPointsRef.current.length > 0) {
          console.log(`Completed stroke with ${currentPointsRef.current.length} points`);

          const normalizedPoints = currentPointsRef.current.map((point) => normalizeCoordinates(point.x, point.y));

          if (normalizedPoints.length > 0) {
            console.log('Sample normalized point:', normalizedPoints[0]);
          }

          const newStroke: Stroke = {
            points: [...currentPointsRef.current],
            color: '#FF0000',
            width: 5,
          };

          const strokeCanvasWidth = displayedImageInfo.width > 0 ? displayedImageInfo.width : screenWidth;
          const strokeCanvasHeight = displayedImageInfo.height > 0 ? displayedImageInfo.height : screenHeight;
          const strokeImageWidth = imageSize.width > 0 ? imageSize.width : 1200; // Fallback image width
          const strokeImageHeight = imageSize.height > 0 ? imageSize.height : 800; // Fallback image height

          const normalizedStroke = {
            points: normalizedPoints,
            color: '#FF0000',
            width: 5,
            canvasSize: {
              width: strokeCanvasWidth,
              height: strokeCanvasHeight,
            },
            imageSize: {
              width: strokeImageWidth,
              height: strokeImageHeight,
            },
          };

          console.log('Sending stroke with dimensions:', {
            canvasWidth: strokeCanvasWidth,
            canvasHeight: strokeCanvasHeight,
            imageWidth: strokeImageWidth,
            imageHeight: strokeImageHeight,
          });

          strokesRef.current = [...strokesRef.current, newStroke];
          addNewPath(currentPointsRef.current);

          onStrokeComplete?.(normalizedStroke);
          currentPointsRef.current = [];
        }
      },
    })
  ).current;

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    console.log(`Canvas layout event received: ${width}x${height}`);

    if (width > 0 && height > 0) {
      setCanvasSize({ width, height });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && canvasSize.width === 0) {
        console.log('Forcing measurement of container');
        containerRef.current.measure((x, y, width, height) => {
          console.log(`Measured container: ${width}x${height}`);
          if (width > 0 && height > 0) {
            setCanvasSize({ width, height });
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View ref={containerRef} style={styles.container} onLayout={onCanvasLayout}>
      <Image ref={imageRef} source={imageSource} style={styles.image} resizeMode='contain' />
      <Svg style={[StyleSheet.absoluteFill, styles.svgContainer]}>
        {pathsRef.current}

        {currentPointsRef.current.length > 0 && (
          <Path
            d={createPathData(currentPointsRef.current)}
            stroke='#FF0000'
            strokeWidth={5}
            fill='none'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        )}
      </Svg>
      <View style={styles.drawingLayer} {...panResponder.panHandlers} />

      <View style={styles.toolbarContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={clearDrawing} activeOpacity={0.7}>
          <Text>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={onChangeImage} activeOpacity={0.7}>
          <Text>Image</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  svgContainer: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
  },
  drawingLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 20,
    elevation: 20,
  },
  toolbarContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 30,
    elevation: 30,
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 5,
    zIndex: 30,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
  },
});
