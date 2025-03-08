import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface DrawingEvent {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  normalized?: boolean;
}

interface StrokeUpdate {
  points: DrawingEvent[];
  color: string;
  width: number;
  type: string;
  canvasInfo?: {
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  };
}

export function useSocketDrawing() {
  const socketRef = useRef<Socket | null>(null);
  const strokesRef = useRef<DrawingEvent[]>([]);
  const canvasInfoRef = useRef<any>(null);
  const batchSize = 10;

  useEffect(() => {
    const socket = io('http://10.0.2.2:3001', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    console.log('joining note');

    socket.emit('join-note', '1234');

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendStrokeUpdate = (points: DrawingEvent[]) => {
    if (!socketRef.current?.connected) {
      console.warn('Socket not connected, cannot send stroke update');
      return;
    }

    const strokeUpdate: StrokeUpdate = {
      points,
      color: '#FF0000',
      width: 5,
      type: 'pen',
      canvasInfo: canvasInfoRef.current,
    };

    console.log('Sending stroke update:', { noteId: '1234', stroke: strokeUpdate });

    socketRef.current.emit(
      'stroke-update',
      {
        noteId: '1234',
        stroke: strokeUpdate,
      },
      (response: any) => {
        console.log('Stroke update acknowledged:', response);
      }
    );
  };

  const setCanvasInfo = (canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number) => {
    canvasInfoRef.current = {
      width: canvasWidth,
      height: canvasHeight,
      imageWidth,
      imageHeight,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('canvas-info', {
        noteId: '1234',
        canvasInfo: canvasInfoRef.current,
      });
    }
  };

  const onDraw = (x: number, y: number) => {
    const event: DrawingEvent = {
      x,
      y,
      pressure: 1,
      timestamp: Date.now(),
      normalized: true,
    };

    strokesRef.current.push(event);

    if (strokesRef.current.length >= batchSize) {
      sendStrokeUpdate(strokesRef.current);
      strokesRef.current = [];
    }
  };

  return { onDraw, setCanvasInfo };
}
