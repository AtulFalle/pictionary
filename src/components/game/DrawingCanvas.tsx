'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { socketService } from '@/lib/socket-client';
import { DrawingStroke, DrawingUpdate, RoundInfo } from '@/types/game';
import { 
  Palette, 
  Eraser, 
  Undo, 
  Trash2, 
  Circle
} from 'lucide-react';

interface DrawingCanvasProps {
  roomCode: string;
  isDrawer: boolean;
  roundInfo?: RoundInfo;
  onDrawingUpdate?: (stroke: DrawingStroke) => void;
}

interface Point {
  x: number;
  y: number;
}

export function DrawingCanvas({ roomCode, isDrawer, roundInfo, onDrawingUpdate }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedWidth, setSelectedWidth] = useState(3);
  const [selectedTool, setSelectedTool] = useState<'brush' | 'eraser'>('brush');
  const [, setUndoStack] = useState<DrawingStroke[]>([]);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  const brushSizes = [1, 3, 5, 8, 12];

  const addStrokeToCanvas = useCallback((stroke: DrawingStroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Socket event handlers
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleDrawBroadcast = (data: DrawingUpdate) => {
      if (data.roomCode === roomCode) {
        addStrokeToCanvas(data.stroke);
        setStrokes(prev => [...prev, data.stroke]);
      }
    };

    socket.on('draw_broadcast', handleDrawBroadcast);

    return () => {
      socket.off('draw_broadcast', handleDrawBroadcast);
    };
  }, [roomCode, addStrokeToCanvas]);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
  }, [isDrawer]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke(prev => [...prev, { x, y }]);

    // Draw on canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = selectedWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    const points = currentStroke;
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [isDrawing, isDrawer, currentStroke, selectedColor, selectedWidth, selectedTool]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !isDrawer || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    const stroke: DrawingStroke = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      points: currentStroke,
      color: selectedColor,
      width: selectedWidth,
      tool: selectedTool,
      timestamp: Date.now()
    };

    setStrokes(prev => [...prev, stroke]);
    setUndoStack(prev => [...prev, stroke]);

    // Send to server
    const socket = socketService.getSocket();
    if (socket) {
      const update: DrawingUpdate = {
        stroke,
        roomCode
      };
      socket.emit('draw_update', update);
    }

    // Notify parent component
    if (onDrawingUpdate) {
      onDrawingUpdate(stroke);
    }

    setIsDrawing(false);
    setCurrentStroke([]);
  }, [isDrawing, isDrawer, currentStroke, selectedColor, selectedWidth, selectedTool, roomCode, onDrawingUpdate]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    setUndoStack([]);
  }, []);

  const undoLastStroke = useCallback(() => {
    if (strokes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and redraw all strokes except the last one
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const strokesToKeep = strokes.slice(0, -1);
    setStrokes(strokesToKeep);
    setUndoStack(prev => [...prev, strokes[strokes.length - 1]]);

    // Redraw all remaining strokes
    strokesToKeep.forEach(stroke => {
      addStrokeToCanvas(stroke);
    });
  }, [strokes, addStrokeToCanvas]);

  // Clear canvas when round changes
  useEffect(() => {
    if (roundInfo) {
      clearCanvas();
    }
  }, [roundInfo, clearCanvas]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Drawing Canvas
          {!isDrawer && (
            <span className="text-sm text-gray-500">(Viewing only)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Drawing Tools */}
        {isDrawer && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            {/* Tool Selection */}
            <div className="flex gap-1">
              <Button
                variant={selectedTool === 'brush' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTool('brush')}
                className="flex items-center gap-1"
              >
                <Circle className="h-4 w-4" />
                Brush
              </Button>
              <Button
                variant={selectedTool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTool('eraser')}
                className="flex items-center gap-1"
              >
                <Eraser className="h-4 w-4" />
                Eraser
              </Button>
            </div>

            {/* Color Selection */}
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex gap-1">
              {brushSizes.map((size) => (
                <Button
                  key={size}
                  variant={selectedWidth === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWidth(size)}
                  className="min-w-8 h-8"
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: Math.max(2, size - 2), height: Math.max(2, size - 2) }}
                  />
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-1 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastStroke}
                disabled={strokes.length === 0}
                className="flex items-center gap-1"
              >
                <Undo className="h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-96 cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ cursor: isDrawer ? 'crosshair' : 'default' }}
          />
        </div>

        {/* Drawing Status */}
        {isDrawer && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Tool:</span> {selectedTool} | 
            <span className="font-medium ml-2">Color:</span> {selectedColor} | 
            <span className="font-medium ml-2">Size:</span> {selectedWidth}px
          </div>
        )}
      </CardContent>
    </Card>
  );
}
