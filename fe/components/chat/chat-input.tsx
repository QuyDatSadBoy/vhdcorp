"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, ImagePlus, Mic, SendHorizontal, Square, X, Pencil, FileText } from "lucide-react";
import { useVoiceChatStore } from "@/store/voice-chat.store";
import { uploadDocument } from "@/services/chat-agent.service";
import ImageEditor from "./image-editor";
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
  /** Trình duyệt đã chốt đoạn này, không sửa nữa */
  isFinal?: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
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
  /** Hẹn giờ chốt lời sớm khi người dùng ngừng nói (xem onresult) */
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Nội dung ô nhập tại thời điểm bắt đầu nói — transcript ghép sau phần này */
  const baseValueRef = useRef("");

  /* ── Voice mode (voice-to-voice): nói tự gửi, trả lời tự đọc, đọc xong tự nghe tiếp ── */
  const voiceMode = useVoiceChatStore((s) => s.enabled);
  const setVoiceMode = useVoiceChatStore((s) => s.setEnabled);
  const listenSignal = useVoiceChatStore((s) => s.listenSignal);
  /** value mới nhất cho các callback của SpeechRecognition (closure sẽ stale) */
  const valueRef = useRef("");
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const voiceModeRef = useRef(false);
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  // Feature-detect mic — không hỗ trợ thì ẩn nút
  useEffect(() => {
    setMicSupported(getSpeechRecognition() !== null);
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  // AI trả lời xong → tự focus lại ô nhập để khách chat tiếp luôn (không phải bấm lại)
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !streaming) textareaRef.current?.focus();
    prevStreamingRef.current = streaming;
  }, [streaming]);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if ((!text && !image && !doc) || streaming) return;
    // Nội dung tệp đi kèm câu hỏi, đánh dấu rõ là trích từ tệp để trợ lý không nhầm
    // đó là lời khách nói.
    const withDoc = doc
      ? `${text || `Xem giúp mình tệp ${doc.name}`}\n\n[Nội dung tệp "${doc.name}" khách gửi]\n${doc.text}`
      : text;
    onSend(withDoc || "Tìm sản phẩm giống ảnh này", image ?? undefined);
    setValue("");
    setImage(null);
    setDoc(null);
    setImageError(null);
    recognitionRef.current?.stop();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
      el?.focus();
    });
  };

  /* ── Voice-to-text ─────────────────────────────────────────── */
  /**
   * Bắt đầu nghe. `autoSend=true` (voice mode): dùng phiên nghe ngắn
   * (continuous=false — tự kết thúc khi ngừng nói) rồi TỰ GỬI transcript.
   */
  const startListening = (autoSend: boolean) => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || recognitionRef.current) return;
    const rec = new Ctor();
    rec.lang = "vi-VN";
    rec.continuous = !autoSend;
    rec.interimResults = true;
    rec.maxAlternatives = 1; // chỉ cần bản đọc tốt nhất — xin nhiều phương án làm chậm thêm
    baseValueRef.current = autoSend ? "" : valueRef.current ? `${valueRef.current.trim()} ` : "";
    if (autoSend) setValue("");
    rec.onresult = (e) => {
      let transcript = "";
      let hasFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
        if (e.results[i].isFinal) hasFinal = true;
      }
      const next = baseValueRef.current + transcript;
      setValue(next);
      valueRef.current = next;
      resize();

      // Chốt sớm: trình duyệt tự kết thúc sau khoảng lặng khá dài (đo trên Chrome
      // thường hơn một giây), trong khi lời đã chốt rồi. Khi đã có đoạn final, hẹn
      // một khoảng ngắn — nói tiếp thì huỷ hẹn, im luôn thì dừng ngay để gửi.
      if (autoSend && hasFinal) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          recognitionRef.current?.stop();
        }, 600);
      }
    };
    rec.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    rec.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current = null;
      setListening(false);
      // Voice mode: ngừng nói là gửi luôn — không cần bấm Enter
      if (autoSend && voiceModeRef.current) {
        const text = valueRef.current.trim();
        if (text) {
          onSend(text);
          setValue("");
          valueRef.current = "";
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) el.style.height = "auto";
          });
        }
      }
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    startListening(voiceModeRef.current);
  };

  /** Bật/tắt voice mode: bật là nghe ngay; tắt thì dừng mic */
  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    voiceModeRef.current = next;
    if (next) {
      if (!listening && !streaming) startListening(true);
    } else {
      recognitionRef.current?.stop();
    }
  };

  // TTS đọc xong câu trả lời → tự bật mic nghe câu tiếp theo (vòng voice-to-voice)
  useEffect(() => {
    if (listenSignal === 0) return;
    if (!voiceModeRef.current || streaming || recognitionRef.current) return;
    startListening(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy theo tín hiệu
  }, [listenSignal]);

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

  /** Nhận một tệp bất kỳ: ảnh xử lý tại chỗ, tài liệu gửi lên máy chủ bóc chữ. */
  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type.startsWith("image/")) return onPickImage(file);
    setImageError(null);
    setDocLoading(true);
    try {
      const res = await uploadDocument(file);
      if (!res.ok || !res.text) {
        setImageError(res.error || "Không đọc được tệp này.");
        return;
      }
      setDoc({ name: res.filename || file.name, text: res.text, chars: res.chars || res.text.length });
    } finally {
      setDocLoading(false);
    }
  };

  /** Dán ảnh (Ctrl+V) — cách nhanh nhất để gửi ảnh chụp màn hình, trước đây không nhận. */
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file");
    if (!item) return; // dán chữ thì để nguyên hành vi mặc định
    const file = item.getAsFile();
    if (!file) return;
    e.preventDefault();
    void onPickFile(file);
  };

  /** Kéo ảnh từ máy thả vào khung chat. */
  const [dragging, setDragging] = useState(false);
  /** Mở khung xem to + vẽ lên ảnh */
  const [editing, setEditing] = useState(false);
  /** Tệp tài liệu đã bóc chữ (PDF/Excel/Word/CSV) — đính kèm câu hỏi */
  const [doc, setDoc] = useState<{ name: string; text: string; chars: number } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = Array.from(e.dataTransfer?.files ?? [])[0];
    if (file) void onPickFile(file);
  };

  return (
    <div className="border-t border-border/60 bg-background/95 px-3 pb-2.5 pt-2.5">
      {editing && image && (
        <ImageEditor
          src={image}
          onCancel={() => setEditing(false)}
          onSave={(edited) => {
            setImage(edited);
            setEditing(false);
          }}
        />
      )}
      {/* Preview ảnh đính kèm */}
      {image && (
        <div className="mb-2 flex items-center gap-2">
          <div className="group relative">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Xem to và vẽ lên ảnh"
              title="Bấm để xem to và khoanh vùng"
              className="block cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview tạm */}
              <img
                src={image}
                alt="Ảnh sẽ gửi"
                className="h-16 w-16 rounded-lg border border-border object-cover transition-opacity group-hover:opacity-80"
              />
              <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-4 w-4 text-white drop-shadow" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              onClick={clearImage}
              aria-label="Xóa ảnh"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">Bấm vào ảnh để xem to và khoanh vùng cần hỏi</span>
        </div>
      )}
      {/* Tệp tài liệu đã đọc được — cho khách thấy đã lấy đúng tệp và bao nhiêu chữ */}
      {(doc || docLoading) && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-2.5 py-2">
          <FileText className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
          {docLoading ? (
            <span className="text-[11px] text-muted-foreground">Đang đọc tệp…</span>
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{doc!.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                {doc!.chars.toLocaleString("vi-VN")} chữ
              </span>
              <button
                type="button"
                onClick={() => setDoc(null)}
                aria-label="Bỏ tệp đính kèm"
                className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
      {imageError && <p className="mb-1.5 text-[11px] font-medium text-brand-danger">{imageError}</p>}

      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex items-end gap-1.5 rounded-2xl border bg-muted/40 px-2 py-1.5 transition-colors",
          dragging
            ? "border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent/30"
            : "border-border focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/25"
        )}
      >
        {dragging && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl text-xs font-semibold text-brand-accent">
            Thả ảnh hoặc tệp vào đây
          </span>
        )}
        {/* Nút đính ảnh */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.xlsx,.xls,.docx,.csv,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // reset để chọn lại CÙNG một file vẫn kích hoạt onChange
            e.target.value = "";
            void onPickFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={streaming}
          aria-label="Đính kèm ảnh hoặc tệp (PDF, Excel, Word)"
          title="Đính kèm ảnh để tìm sản phẩm"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-brand-primary disabled:opacity-40 dark:hover:text-brand-accent"
        >
          <ImagePlus className="h-4.5 w-4.5" aria-hidden />
        </button>

        {/* KHÔNG disable khi streaming: khách gõ tiếp được ngay (submit đã tự chặn);
            disable làm mất focus → phải bấm lại ô nhập mới chat tiếp được. */}
        <textarea
          ref={textareaRef}
          onPaste={onPaste}
          rows={1}
          value={value}
          placeholder={
            listening
              ? voiceMode
                ? "Đang nghe… ngừng nói là gửi luôn"
                : "Đang nghe…"
              : voiceMode
                ? "Chế độ đàm thoại đang bật — bấm mic hoặc nói"
                : "Hỏi về sản phẩm, giá, đặt hàng…"
          }
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

        {/* Voice mode (voice-to-voice): nói tự gửi + trả lời tự đọc to */}
        {micSupported && (
          <button
            type="button"
            onClick={toggleVoiceMode}
            aria-label={voiceMode ? "Tắt chế độ đàm thoại" : "Bật chế độ đàm thoại (nói ↔ nghe)"}
            title={voiceMode ? "Tắt chế độ đàm thoại" : "Chế độ đàm thoại: nói tự gửi, trả lời tự đọc to"}
            aria-pressed={voiceMode}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all",
              voiceMode
                ? "bg-linear-to-br from-brand-primary to-brand-accent text-white shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-brand-primary dark:hover:text-brand-accent"
            )}
          >
            <AudioLines className="h-4.5 w-4.5" aria-hidden />
          </button>
        )}

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
            disabled={!value.trim() && !image && !doc}
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
