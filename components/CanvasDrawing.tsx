"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { debounce } from "lodash";

interface CanvasDrawingProps {
  setCanvasImage: (image: string | null) => void;
  setCanvasSize?: (size: number) => void;
}

export const CanvasDrawing = ({ setCanvasImage, setCanvasSize }: CanvasDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(5);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setLocalCanvasSize] = useState(300);

  const debouncedSetCanvasImage = useCallback(
    debounce((image: string | null) => setCanvasImage(image), 100),
    [setCanvasImage]
  );

  const debouncedSetPenColor = useCallback(
    debounce((color: string) => {
      console.log("Setting pen color:", color);
      setPenColor(color);
    }, 50),
    []
  );

  const debouncedSetPenSize = useCallback(
    debounce((size: number) => {
      console.log("Setting pen size:", size);
      setPenSize(size);
    }, 50),
    []
  );

  // Function to redraw the main canvas (background + drawings)
  const redrawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }

    // Draw existing drawings from drawing canvas
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
    }

    debouncedSetCanvasImage(canvas.toDataURL("image/png", 0.7));
  }, [bgColor, bgImage, debouncedSetCanvasImage]);

  // Update canvas size based on container width
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Calculate canvas size: 80% of viewport width
    const maxWidth = Math.min(window.innerWidth * 0.8, 500);
    const minWidth = 200;
    const containerWidth = container.getBoundingClientRect().width;
    const newSize = Math.max(minWidth, Math.min(maxWidth, containerWidth));

    setLocalCanvasSize(newSize);
    if (setCanvasSize) setCanvasSize(newSize);

    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !drawingCanvas) return;

    // Create a temporary canvas to preserve drawings
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(drawingCanvas, 0, 0);
    }

    // Update canvas dimensions
    canvas.width = newSize;
    canvas.height = newSize;
    drawingCanvas.width = newSize;
    drawingCanvas.height = newSize;

    // Restore drawings to resized drawing canvas
    const drawingCtx = drawingCanvas.getContext("2d");
    if (drawingCtx && tempCtx) {
      drawingCtx.drawImage(tempCanvas, 0, 0, newSize, newSize);
    }

    // Update drawing context properties
    if (drawingCtx) {
      drawingCtx.strokeStyle = penColor;
      drawingCtx.lineWidth = penSize;
      drawingCtx.lineCap = "round";
      drawingCtx.lineJoin = "round";
    }

    // Redraw main canvas
    redrawMainCanvas();
  }, [penColor, penSize, redrawMainCanvas, setCanvasSize]);

  // Initialize canvases and handle resize
  useEffect(() => {
    updateCanvasSize();

    const debouncedResize = debounce(updateCanvasSize, 100);
    window.addEventListener("resize", debouncedResize);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      debouncedSetCanvasImage.cancel();
      debouncedResize.cancel();
    };
  }, [updateCanvasSize, debouncedSetCanvasImage]);

  // Update pen properties for future strokes
  useEffect(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [penColor, penSize]);

  // Update main canvas when background changes
  useEffect(() => {
    redrawMainCanvas();
  }, [bgColor, bgImage, redrawMainCanvas]);

  // Drawing handlers
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const drawingCanvas = drawingCanvasRef.current;
      if (!drawingCanvas) return;
      const ctx = drawingCanvas.getContext("2d");
      if (!ctx) return;

      if ("touches" in e) {
        e.preventDefault();
      }

      setIsDrawing(true);
      const pos = getEventPosition(e, drawingCanvas);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const drawingCanvas = drawingCanvasRef.current;
      if (!drawingCanvas) return;
      const ctx = drawingCanvas.getContext("2d");
      if (!ctx) return;

      if ("touches" in e) {
        e.preventDefault();
      }

      const pos = getEventPosition(e, drawingCanvas);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Update main canvas
      redrawMainCanvas();
    },
    [isDrawing, redrawMainCanvas]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    redrawMainCanvas();
  }, [redrawMainCanvas]);

  const getEventPosition = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x, y;
    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    return { x: x * scaleX, y: y * scaleY };
  };

  // Clear drawings only
  const handleClearCanvas = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const drawingCtx = drawingCanvas.getContext("2d");
    if (!drawingCtx) return;

    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    redrawMainCanvas();
    setError(null);
  };

  // Handle background image upload
  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setBgImage(null);
      setError("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        setError("Failed to read file.");
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Canvas context not supported.");
          return;
        }

        try {
          ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
          const resizedDataUrl = canvas.toDataURL("image/png", 0.7);
          const resizedImg = new Image();
          resizedImg.onload = () => {
            console.log("Setting background image");
            setBgImage(resizedImg);
            setError(null);
          };
          resizedImg.onerror = () => {
            setError("Failed to load resized image.");
          };
          resizedImg.src = resizedDataUrl;
        } catch (err) {
          console.error("Error resizing image:", err);
          setError("Failed to resize image.");
        }
      };
      img.onerror = () => {
        setError("Failed to load image.");
      };
      img.src = event.target.result as string;
    };
    reader.onerror = () => {
      setError("Failed to read file with FileReader.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col md:flex-row justify-center items-center gap-4 p-4 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow-lg w-full max-w-[90vw] min-w-[200px] md:max-w-[20rem]">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Colors</label>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold text-gray-800">Background</span>
              <div
                className="relative w-10 h-10 rounded-full border-2 border-gray-300 shadow cursor-pointer"
                style={{ backgroundColor: bgColor }}
              >
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-800">Pen</span>
              <div
                className="relative w-10 h-10 rounded-full border-2 border-gray-300 shadow cursor-pointer"
                style={{ backgroundColor: penColor }}
              >
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => debouncedSetPenColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Background Image</label>
          <input type="file" accept="image/*" onChange={handleBgImageChange} className="text-sm text-gray-600" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Pen Size</label>
          <input
            type="range"
            min="1"
            max="50"
            value={penSize}
            onChange={(e) => debouncedSetPenSize(Number(e.target.value))}
            className="w-full h-1.5 bg-gradient-to-r from-[#6e8efb] to-[#a777e3] rounded cursor-pointer"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearCanvas}
            className="flex-1 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white font-semibold rounded-xl shadow"
          >
            Clear
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative w-full max-w-[80vw] md:max-w-[500px] aspect-square bg-white border-2 border-gray-300 rounded-2xl shadow-lg"
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full rounded-2xl"
          style={{ width: "100%", height: "100%", touchAction: "none" }}
        />
        <canvas
          ref={drawingCanvasRef}
          className="absolute top-0 left-0 w-full h-full rounded-2xl"
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
};
