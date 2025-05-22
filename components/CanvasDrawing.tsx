"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { debounce } from "lodash";

interface CanvasDrawingProps {
  setCanvasImage: (image: string | null) => void;
  setCanvasSize?: (size: number) => void;
}

interface TextObject {
  id: number;
  text: string;
  x: number;
  y: number;
  fontType: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  color: string;
}

export const CanvasDrawing = ({ setCanvasImage, setCanvasSize }: CanvasDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [penColor, setPenColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#000000");
  const [penSize, setPenSize] = useState(5);
  const [fontType, setFontType] = useState("Arial");
  const [fontSize, setFontSize] = useState(20);
  const [textInput, setTextInput] = useState("");
  const [textObjects, setTextObjects] = useState<TextObject[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setLocalCanvasSize] = useState(300);
  const textIdCounter = useRef(0);

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

  const debouncedSetTextColor = useCallback(
    debounce((color: string) => {
      console.log("Setting text color:", color);
      setTextColor(color);
      if (selectedTextId !== null) {
        setTextObjects((prev) =>
          prev.map((obj) =>
            obj.id === selectedTextId ? { ...obj, color } : obj
          )
        );
      }
    }, 50),
    [selectedTextId]
  );

  const debouncedSetPenSize = useCallback(
    debounce((size: number) => {
      console.log("Setting pen size:", size);
      setPenSize(size);
    }, 50),
    []
  );

  const debouncedSetFontSize = useCallback(
    debounce((size: number) => {
      console.log("Setting font size:", size);
      setFontSize(size);
      if (selectedTextId !== null) {
        setTextObjects((prev) =>
          prev.map((obj) =>
            obj.id === selectedTextId ? { ...obj, fontSize: size } : obj
          )
        );
      }
    }, 50),
    [selectedTextId]
  );

  // Redraw the main canvas (background + drawings + text)
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

    // Draw existing drawings and text from drawing canvas
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
    }

    debouncedSetCanvasImage(canvas.toDataURL("image/png", 0.7));
  }, [bgColor, bgImage, debouncedSetCanvasImage]);

  // Redraw drawings and text on the drawing canvas
  const redrawDrawingCanvas = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    // Preserve existing drawings by copying to a temporary canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(drawingCanvas, 0, 0);
    }

    // Clear drawing canvas
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Restore drawings
    if (tempCtx) {
      ctx.drawImage(tempCanvas, 0, 0);
    }

    // Redraw text
    textObjects.forEach((textObj) => {
      ctx.font = `${textObj.isBold ? "bold " : ""}${textObj.isItalic ? "italic " : ""}${textObj.fontSize}px ${textObj.fontType}`;
      ctx.fillStyle = textObj.color;
      ctx.textBaseline = "top";
      ctx.fillText(textObj.text, textObj.x, textObj.y);

      if (textObj.isUnderline) {
        const metrics = ctx.measureText(textObj.text);
        const lineY = textObj.y + textObj.fontSize + 2;
        ctx.beginPath();
        ctx.strokeStyle = textObj.color;
        ctx.lineWidth = textObj.fontSize / 10;
        ctx.moveTo(textObj.x, lineY);
        ctx.lineTo(textObj.x + metrics.width, lineY);
        ctx.stroke();
      }

      // Draw bounding box for selected text
      if (textObj.id === selectedTextId) {
        const metrics = ctx.measureText(textObj.text);
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          textObj.x - 2,
          textObj.y - 2,
          metrics.width + 4,
          textObj.fontSize + 4
        );
      }
    });

    redrawMainCanvas();
  }, [textObjects, selectedTextId, redrawMainCanvas]);

  // Update canvas size based on container width
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxWidth = Math.min(window.innerWidth * 0.8, 500);
    const minWidth = 200;
    const containerWidth = container.getBoundingClientRect().width;
    const newSize = Math.max(minWidth, Math.min(maxWidth, containerWidth));

    setLocalCanvasSize(newSize);
    if (setCanvasSize) setCanvasSize(newSize);

    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !drawingCanvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(drawingCanvas, 0, 0);
    }

    canvas.width = newSize;
    canvas.height = newSize;
    drawingCanvas.width = newSize;
    drawingCanvas.height = newSize;

    const drawingCtx = drawingCanvas.getContext("2d");
    if (drawingCtx && tempCtx) {
      drawingCtx.drawImage(tempCanvas, 0, 0, newSize, newSize);
    }

    if (drawingCtx) {
      drawingCtx.strokeStyle = penColor;
      drawingCtx.lineWidth = penSize;
      drawingCtx.lineCap = "round";
      drawingCtx.lineJoin = "round";
      drawingCtx.font = `${isBold ? "bold " : ""}${isItalic ? "italic " : ""}${fontSize}px ${fontType}`;
      drawingCtx.fillStyle = textColor;
      drawingCtx.textBaseline = "top";
    }

    redrawDrawingCanvas();
  }, [penColor, penSize, fontType, fontSize, isBold, isItalic, textColor, redrawDrawingCanvas, setCanvasSize]);

  // Initialize canvases and handle resize
  useEffect(() => {
    updateCanvasSize();
    const debouncedResize = debounce(updateCanvasSize, 100);
    window.addEventListener("resize", debouncedResize);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      debouncedSetCanvasImage.cancel();
      debouncedSetPenColor.cancel();
      debouncedSetTextColor.cancel();
      debouncedSetPenSize.cancel();
      debouncedSetFontSize.cancel();
    };
  }, [updateCanvasSize, debouncedSetCanvasImage, debouncedSetPenColor, debouncedSetTextColor, debouncedSetPenSize, debouncedSetFontSize]);

  // Update pen and text properties
  useEffect(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.font = `${isBold ? "bold " : ""}${isItalic ? "italic " : ""}${fontSize}px ${fontType}`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";

    redrawDrawingCanvas();
  }, [penColor, penSize, fontType, fontSize, isBold, isItalic, textColor, redrawDrawingCanvas]);

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

      const pos = getEventPosition(e, drawingCanvas);

      if (isTextMode && textInput) {
        const newText: TextObject = {
          id: textIdCounter.current++,
          text: textInput,
          x: pos.x,
          y: pos.y,
          fontType,
          fontSize,
          isBold,
          isItalic,
          isUnderline,
          color: textColor,
        };
        setTextObjects((prev) => [...prev, newText]);
        setTextInput("");
        setIsTextMode(false);
        redrawDrawingCanvas();
      } else {
        let selected = false;
        for (const textObj of textObjects) {
          ctx.font = `${textObj.isBold ? "bold " : ""}${textObj.isItalic ? "italic " : ""}${textObj.fontSize}px ${textObj.fontType}`;
          const metrics = ctx.measureText(textObj.text);
          if (
            pos.x >= textObj.x &&
            pos.x <= textObj.x + metrics.width &&
            pos.y >= textObj.y &&
            pos.y <= textObj.y + textObj.fontSize
          ) {
            setSelectedTextId(textObj.id);
            setFontType(textObj.fontType);
            setFontSize(textObj.fontSize);
            setIsBold(textObj.isBold);
            setIsItalic(textObj.isItalic);
            setIsUnderline(textObj.isUnderline);
            setTextColor(textObj.color);
            selected = true;
            redrawDrawingCanvas();
            break;
          }
        }
        if (!selected) {
          setSelectedTextId(null);
          setIsDrawing(true);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
        }
      }
    },
    [isTextMode, textInput, fontType, fontSize, isBold, isItalic, isUnderline, textColor, textObjects, redrawDrawingCanvas]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || isTextMode) return;
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

      redrawMainCanvas();
    },
    [isDrawing, isTextMode, redrawMainCanvas]
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
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    return { x: x * scaleX, y: y * scaleY };
  };

  // Clear drawings and text
  const handleClearCanvas = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const drawingCtx = drawingCanvas.getContext("2d");
    if (!drawingCtx) return;

    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    setTextObjects([]);
    setTextInput("");
    setSelectedTextId(null);
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

  // Toggle text mode
  const toggleTextMode = () => {
    setIsTextMode((prev) => !prev);
    setTextInput("");
    setSelectedTextId(null);
  };

  // Toggle text styles
  const toggleBold = () => {
    const newBold = !isBold;
    setIsBold(newBold);
    if (selectedTextId !== null) {
      setTextObjects((prev) =>
        prev.map((obj) =>
          obj.id === selectedTextId ? { ...obj, isBold: newBold } : obj
        )
      );
    }
  };

  const toggleItalic = () => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    if (selectedTextId !== null) {
      setTextObjects((prev) =>
        prev.map((obj) =>
          obj.id === selectedTextId ? { ...obj, isItalic: newItalic } : obj
        )
      );
    }
  };

  const toggleUnderline = () => {
    const newUnderline = !isUnderline;
    setIsUnderline(newUnderline);
    if (selectedTextId !== null) {
      setTextObjects((prev) =>
        prev.map((obj) =>
          obj.id === selectedTextId ? { ...obj, isUnderline: newUnderline } : obj
        )
      );
    }
  };

  // Prevent text selection in input
  const preventTextSelection = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
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
            <div>
              <span className="text-sm font-semibold text-gray-800">Text</span>
              <div
                className="relative w-10 h-10 rounded-full border-2 border-gray-300 shadow cursor-pointer"
                style={{ backgroundColor: textColor }}
              >
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => debouncedSetTextColor(e.target.value)}
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
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Font Type</label>
          <select
            value={fontType}
            onChange={(e) => {
              setFontType(e.target.value);
              if (selectedTextId !== null) {
                setTextObjects((prev) =>
                  prev.map((obj) =>
                    obj.id === selectedTextId ? { ...obj, fontType: e.target.value } : obj
                  )
                );
              }
            }}
            className="p-2 border rounded text-sm"
          >
            {["Arial", "Times New Roman", "Comic Sans MS", "Courier New", "Verdana"].map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Font Size</label>
          <input
            type="range"
            min="10"
            max="50"
            value={fontSize}
            onChange={(e) => debouncedSetFontSize(Number(e.target.value))}
            className="w-full h-1.5 bg-gradient-to-r from-[#6e8efb] to-[#a777e3] rounded cursor-pointer"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Text Styles</label>
          <div className="flex gap-2">
            <button
              onClick={toggleBold}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl shadow ${
                isBold ? "bg-[#6e8efb] text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              B
            </button>
            <button
              onClick={toggleItalic}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl shadow ${
                isItalic ? "bg-[#6e8efb] text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              I
            </button>
            <button
              onClick={toggleUnderline}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl shadow ${
                isUnderline ? "bg-[#6e8efb] text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              U
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">Text Input</label>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text "
            className="p-2 border rounded text-sm select-none"
            disabled={!isTextMode}
            style={{ userSelect: "none" }}
          />
          <button
            onClick={toggleTextMode}
            className={`py-3 bg-gradient-to-r ${
              isTextMode
                ? "from-[#ff6b6b] to-[#ff8e53]"
                : "from-[#6e8efb] to-[#a777e3]"
            } text-white font-semibold rounded-xl shadow`}
          >
            {isTextMode ? "Cancel Text Mode" : "Add Text"}
          </button>
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
        {isTextMode && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-600 bg-white bg-opacity-80 p-2 rounded">
              Click on canvas to place text
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
