"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, SendHorizontal, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chiều cao tối đa ≈ 5 dòng (5 × 20px line-height + padding) */
const MAX_HEIGHT = 124;
/** Chặn file quá lớn trước khi decode (ảnh máy ảnh hiếm khi vượt) */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
/** Cạnh dài tối đa sau thu nhỏ — đủ cho Gemini vision, payload nhẹ */
const MAX_DIMENSION = 1280;

/** Thu nhỏ ảnh về ≤1280px + nén JPEG — ảnh chụp điện thoại 8MB vẫn gửi được ngay */
async function downscaleToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d không khả dụng");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

/* ── Web Speech API (không có type sẵn trong TS DOM lib) ────────── */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface ChatInputProps {
  streaming: boolean;
  onSend: (text: string, image?: string) => void;
  onStop: () => void;
}

/**
 * Ô nhập tin nhắn: textarea auto-grow, Enter gửi / Shift+Enter xuống dòng.
 * Kèm: nút mic (voice-to-text, Web Speech API), nút đính ảnh (image search).
 */
export default function ChatInput({ streaming, onSend, onStop }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Nội dung ô nhập tại thời điểm bắt đầu nói — transcript ghép sau phần này */
  const baseValueRef = useRef("");

  // Feature-detect mic — không hỗ trợ thì ẩn nút
  useEffect(() => {
    setMicSupported(getSpeechRecognition() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if ((!text && !image) || streaming) return;
    // Chỉ có ảnh, không có chữ → dùng câu mặc định để agent tìm theo ảnh
    onSend(text || "Tìm sản phẩm giống ảnh này", image ?? undefined);
    setValue("");
    setImage(null);
    setImageError(null);
    recognitionRef.current?.stop();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
      el?.focus();
    });
  };

  /* ── Voice-to-text ─────────────────────────────────────────── */
  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = true;
    baseValueRef.current = value ? `${value.trim()} ` : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      const next = baseValueRef.current + transcript;
      setValue(next);
      resize();
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  /* ── Đính ảnh ──────────────────────────────────────────────── */
  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Chỉ chấp nhận tệp ảnh");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Ảnh tối đa 15MB");
      return;
    }
    try {
      setImage(await downscaleToDataUrl(file));
    } catch {
      // HEIC/định dạng browser không decode được
      setImageError("Không đọc được ảnh này — hãy dùng JPG hoặc PNG");
    }
  };

  const clearImage = () => {
    setImage(null);
    setImageError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="border-t border-border/60 bg-background/95 px-3 pb-2.5 pt-2.5">
      {/* Preview ảnh đính kèm */}
      {image && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview tạm */}
            <img src={image} alt="Ảnh sẽ gửi" className="h-16 w-16 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={clearImage}
              aria-label="Xóa ảnh"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">Ảnh đính kèm · gửi để tìm sản phẩm</span>
        </div>
      )}
      {imageError && <p className="mb-1.5 text-[11px] font-medium text-brand-danger">{imageError}</p>}

      <div
        className={cn(
          "flex items-end gap-1.5 rounded-2xl border bg-muted/40 px-2 py-1.5 transition-colors",
          "border-border focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/25"
        )}
      >
        {/* Nút đính ảnh */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // reset để chọn lại CÙNG một file vẫn kích hoạt onChange
            e.target.value = "";
            void onPickImage(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={streaming}
          aria-label="Đính kèm ảnh"
          title="Đính kèm ảnh để tìm sản phẩm"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-brand-primary disabled:opacity-40 dark:hover:text-brand-accent"
        >
          <ImagePlus className="h-4.5 w-4.5" aria-hidden />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={streaming}
          placeholder={listening ? "Đang nghe…" : "Hỏi về sản phẩm, giá, đặt hàng…"}
          aria-label="Nhập tin nhắn"
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[124px] min-h-6 flex-1 resize-none self-center bg-transparent text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
        />

        {/* Nút mic — chỉ hiện khi trình duyệt hỗ trợ Web Speech */}
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={streaming}
            aria-label={listening ? "Dừng ghi âm" : "Nói để nhập"}
            title={listening ? "Dừng ghi âm" : "Nói để nhập"}
            className={cn(
              "relative grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
              listening
                ? "bg-brand-danger/15 text-brand-danger"
                : "text-muted-foreground hover:bg-muted hover:text-brand-primary dark:hover:text-brand-accent"
            )}
          >
            {listening && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-danger/30" aria-hidden />
            )}
            <Mic className="relative h-4.5 w-4.5" aria-hidden />
          </button>
        )}

        {/* Gửi / Dừng */}
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Dừng trả lời"
            title="Dừng trả lời"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/90 text-background transition-transform hover:scale-105"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() && !image}
            aria-label="Gửi tin nhắn"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-primary to-brand-accent text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">Enter để gửi · Shift+Enter xuống dòng</p>
    </div>
  );
}
