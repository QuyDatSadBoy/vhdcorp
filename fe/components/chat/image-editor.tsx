"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Màu bút — đỏ trước vì khoanh vùng hỏng là việc hay làm nhất. */
const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#111827", "#ffffff"] as const;
const WIDTHS = [3, 6, 12] as const;

type Stroke = { color: string; width: number; points: { x: number; y: number }[] };

/**
 * Xem ảnh to và VẼ LÊN ẢNH trước khi gửi.
 *
 * Với hàng cơ điện, chỉ đường bằng lời rất khó ("cái gioăng ở góc dưới bên trái, chỗ
 * bị nứt"). Khoanh một vòng đỏ rồi gửi thì trợ lý và nhân viên đều hiểu ngay.
 *
 * Nét vẽ lưu theo TOẠ ĐỘ TƯƠNG ĐỐI (0–1) chứ không theo pixel màn hình: cửa sổ co
 * giãn hay màn hình khác độ phân giải thì nét vẫn nằm đúng chỗ trên ảnh.
 */
export default function ImageEditor({
  src,
  onCancel,
  onSave,
}: {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState<number>(WIDTHS[1]);
  const [ready, setReady] = useState(false);

  // Nạp ảnh gốc một lần, giữ lại để vẽ lại nền mỗi khi nét thay đổi
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.src = src;
  }, [src]);

  // Vẽ lại toàn bộ: nền ảnh + các nét (gọi mỗi khi nét đổi)
  useEffect(() => {
    const cv = canvasRef.current;
    const img = imgRef.current;
    if (!cv || !img) return;
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const g = cv.getContext("2d");
    if (!g) return;
    g.drawImage(img, 0, 0);
    g.lineCap = "round";
    g.lineJoin = "round";
    for (const s of [...strokes, ...(drawing.current ? [drawing.current] : [])]) {
      if (!s || s.points.length < 2) continue;
      g.strokeStyle = s.color;
      g.lineWidth = (s.width / 100) * Math.min(cv.width, cv.height);
      g.beginPath();
      g.moveTo(s.points[0].x * cv.width, s.points[0].y * cv.height);
      for (const p of s.points.slice(1)) g.lineTo(p.x * cv.width, p.y * cv.height);
      g.stroke();
    }
  }, [strokes, ready]);

  const posOf = (e: React.PointerEvent) => {
    const r = (e.target as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const start = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Con trỏ tổng hợp (kiểm thử tự động, vài thiết bị lạ) không bắt được — vẫn vẽ được
    }
    drawing.current = { color, width: width / 4, points: [posOf(e)] };
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current.points.push(posOf(e));
    setStrokes((s) => [...s]); // buộc vẽ lại; nét đang vẽ nằm ở ref
  };
  const end = () => {
    // CHỤP nét ra biến trước: React chạy hàm cập nhật trễ, lúc đó drawing.current đã
    // bị đặt null nên đọc trong hàm sẽ nhét null vào danh sách rồi làm sập lượt vẽ lại.
    const finished = drawing.current;
    drawing.current = null;
    if (finished && finished.points.length > 1) setStrokes((s) => [...s, finished]);
  };

  const save = () => {
    const cv = canvasRef.current;
    if (!cv) return onCancel();
    // Không có nét nào thì trả lại ảnh gốc, đỡ nén lại một lần vô ích
    onSave(strokes.length ? cv.toDataURL("image/jpeg", 0.9) : src);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Xem và vẽ lên ảnh"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      tabIndex={-1}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-white/80">Khoanh vùng cần hỏi rồi gửi — trợ lý sẽ nhìn theo</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-white/80 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className="max-h-full max-w-full cursor-crosshair touch-none rounded-lg bg-white shadow-2xl"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Màu ${c}`}
              className={cn(
                "h-6 w-6 cursor-pointer rounded-full border-2 transition-transform",
                color === c ? "scale-110 border-white" : "border-transparent"
              )}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              aria-label={`Nét ${w}`}
              className={cn(
                "grid h-6 w-6 cursor-pointer place-items-center rounded-full",
                width === w ? "bg-white/25" : "hover:bg-white/10"
              )}
            >
              <span className="rounded-full bg-white" style={{ width: w, height: w }} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStrokes((s) => s.slice(0, -1))}
          disabled={!strokes.length}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" /> Hoàn tác
        </button>
        <button
          type="button"
          onClick={() => setStrokes([])}
          disabled={!strokes.length}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5" /> Xoá hết
        </button>
        <button
          type="button"
          onClick={save}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          <Check className="h-3.5 w-3.5" /> Xong
        </button>
      </div>
    </div>
  );
}
