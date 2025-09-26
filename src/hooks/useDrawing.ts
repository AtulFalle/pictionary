import { useState, useCallback } from 'react';
import { DrawingStroke } from '@/types/game';

export function useDrawing() {
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const addStroke = useCallback((stroke: DrawingStroke) => {
    setStrokes(prev => [...prev, stroke]);
  }, []);

  const clearStrokes = useCallback(() => {
    setStrokes([]);
  }, []);

  const undoLastStroke = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const setDrawingState = useCallback((drawing: boolean) => {
    setIsDrawing(drawing);
  }, []);

  return {
    strokes,
    isDrawing,
    addStroke,
    clearStrokes,
    undoLastStroke,
    setDrawingState
  };
}
