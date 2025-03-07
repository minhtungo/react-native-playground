import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface DrawingEvent {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

interface StrokeUpdate {
  points: DrawingEvent[];
  color: string;
  width: number;
  type: string;
}

export function useSocketDrawing() {
  const socketRef = useRef<Socket | null>(null);
  const strokesRef = useRef<DrawingEvent[]>([]);
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
      width: 2,
      type: 'pen',
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

  const onDraw = (x: number, y: number) => {
    const event: DrawingEvent = {
      x,
      y,
      pressure: 1,
      timestamp: Date.now(),
    };

    strokesRef.current.push(event);

    if (strokesRef.current.length >= batchSize) {
      sendStrokeUpdate(strokesRef.current);
      strokesRef.current = [];
    }
  };

  return { onDraw };
}
