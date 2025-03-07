export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  type: 'pen' | 'highlighter' | 'eraser';
  tool?: {
    opacity?: number;
    blendMode?: string;
  };
}

export interface StrokeUpdate {
  noteId: string;
  stroke: Stroke;
}
