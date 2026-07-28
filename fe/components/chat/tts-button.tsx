"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { speakText } from "@/services/chat-agent.service";
import { useVoiceChatStore } from "@/store/voice-chat.store";
import { cn } from "@/lib/utils";

/* ── Cache + dedupe BLOB audio theo TỪNG ĐOẠN text ─────────────── */
const blobCache = new Map<string, Blob>();
const BLOB_CACHE_MAX = 80;
/** Request TTS đang bay — prefetch & bấm loa DÙNG CHUNG 1 promise (không gọi trùng). */
const inflight = new Map<string, Promise<Blob>>();

function cacheBlob(text: string, blob: Blob) {
  blobCache.delete(text);
  blobCache.set(text, blob);
  if (blobCache.size > BLOB_CACHE_MAX) {
    const oldest = blobCache.keys().next().value;
    if (oldest !== undefined) blobCache.delete(oldest);
  }
}

/** Lấy blob 1 đoạn: cache → promise đang bay → gọi mới (dedupe prefetch + click). */
function getAudio(text: string): Promise<Blob> {
  const cached = blobCache.get(text);
  if (cached) return Promise.resolve(cached);
  const existing = inflight.get(text);
  if (existing) return existing;
  const p = speakText(text)
    .then((blob) => {
      cacheBlob(text, blob);
      inflight.delete(text);
      return blob;
    })
    .catch((err) => {
      inflight.delete(text);
      throw err;
    });
  inflight.set(text, p);
  return p;
}

/* ── Web Audio: AudioContext dùng chung + cache AudioBuffer đã decode ──
 * Phát bằng Web Audio (không phải <audio>) để LẤP ĐẦY khoảng lặng giữa các
 * câu: các đoạn được xếp lịch nối đuôi nhau trên đồng hồ audio → GAPLESS. */
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

const bufferCache = new Map<string, AudioBuffer>();
async function getBuffer(chunk: string): Promise<AudioBuffer> {
  const hit = bufferCache.get(chunk);
  if (hit) return hit;
  const ctx = getCtx();
  if (!ctx) throw new Error("no-webaudio");
  const blob = await getAudio(chunk);
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  bufferCache.set(chunk, buf);
  if (bufferCache.size > BLOB_CACHE_MAX) {
    const oldest = bufferCache.keys().next().value;
    if (oldest !== undefined) bufferCache.delete(oldest);
  }
  return buf;
}

/**
 * Cắt câu trả lời thành các ĐOẠN ngắn theo ranh giới câu để tổng hợp SONG SONG.
 * Câu ĐẦU tách riêng (đoạn ngắn nhất) → ra tiếng sớm nhất; các câu sau gộp
 * tới ~140 ký tự để ít request hơn mà vẫn liền mạch.
 */
const CHUNK_MAX = 140;
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_MAX) return [clean];
  const sentences = clean.split(/(?<=[.!?…])\s+/);
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (chunks.length === 0 && !buf) {
      chunks.push(s); // câu đầu đứng riêng → tổng hợp nhanh nhất
      continue;
    }
    if (buf && (buf + " " + s).length > CHUNK_MAX) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

type Status = "idle" | "loading" | "playing";

/* ── Bộ điều khiển phát TOÀN CỤC (module-level: chỉ 1 luồng phát cùng lúc) ──
 * Mọi state biến đổi nằm ở module để không "reassign trong render". Component
 * chỉ GỌI các hàm này và truyền setStatus vào. */
let playToken = 0; // tăng để HỦY mọi vòng phát đang chạy
let liveSources: AudioBufferSourceNode[] = [];
let activeReset: (() => void) | null = null; // reset UI của player đang chạy
let cancelWait: (() => void) | null = null; // giải phóng vòng chờ "đọc xong"

function cancelPlayback() {
  playToken += 1;
  for (const s of liveSources) {
    try {
      s.onended = null;
      s.stop();
    } catch {
      /* đã dừng */
    }
  }
  liveSources = [];
  const reset = activeReset;
  activeReset = null;
  const wait = cancelWait;
  cancelWait = null;
  if (reset) reset();
  if (wait) wait();
}

/** Phát cả đoạn bằng <audio> — fallback trình duyệt không có Web Audio (hiếm). */
async function playFallback(full: string, my: number, setStatus: (s: Status) => void) {
  try {
    const blob = await getAudio(full);
    if (my !== playToken) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    cancelWait = () => {
      try {
        audio.pause();
      } catch {
        /* noop */
      }
    };
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (my !== playToken) return;
      cancelWait = null;
      activeReset = null;
      setStatus("idle");
      const voice = useVoiceChatStore.getState();
      if (voice.enabled) voice.requestListen();
    };
    await audio.play();
    if (my === playToken) setStatus("playing");
  } catch {
    if (my === playToken) cancelPlayback();
  }
}

/**
 * Cắt câu → tổng hợp SONG SONG → phát GAPLESS bằng Web Audio (xếp lịch nối đuôi).
 * `onToken` báo token phiên về component để nó biết mình có còn là player hiện tại.
 */
async function playTts(text: string, setStatus: (s: Status) => void, onToken: (t: number) => void) {
  cancelPlayback(); // dừng player khác đang chạy (bump token)
  const my = playToken;
  onToken(my);
  activeReset = () => setStatus("idle");

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    activeReset = null;
    return;
  }
  setStatus("loading");

  const ctx = getCtx();
  if (!ctx) {
    await playFallback(chunks.join(" "), my, setStatus);
    return;
  }
  try {
    await ctx.resume();
  } catch {
    /* autoplay policy — vẫn thử phát */
  }
  if (my !== playToken) return;

  // Tổng hợp + decode SONG SONG (call song song)
  const bufs = chunks.map((c) => getBuffer(c).catch(() => null));
  let started = false;
  let startAt = 0;
  const mySources: AudioBufferSourceNode[] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      const buf = await bufs[i];
      if (my !== playToken) return; // đã bị dừng/thay
      if (!buf) continue; // đoạn lỗi → bỏ qua, đọc tiếp đoạn sau
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const now = ctx.currentTime;
      // Xếp lịch nối đuôi (gapless); nếu tổng hợp trễ thì phát ngay, không chồng
      const when = started ? Math.max(startAt, now) : now + 0.02;
      src.start(when);
      startAt = when + buf.duration;
      mySources.push(src);
      liveSources.push(src);
      if (!started) {
        started = true;
        setStatus("playing");
      }
    }
  } catch {
    if (my === playToken) cancelPlayback();
    return;
  }
  if (my !== playToken) return;
  if (!started) {
    activeReset = null;
    setStatus("idle");
    return;
  }

  // Chờ đoạn cuối phát xong HOẶC bị hủy
  await new Promise<void>((resolve) => {
    cancelWait = resolve;
    mySources[mySources.length - 1].onended = () => resolve();
  });
  if (my !== playToken) return; // bị hủy — UI đã reset trong cancelPlayback

  cancelWait = null;
  activeReset = null;
  liveSources = liveSources.filter((s) => !mySources.includes(s));
  setStatus("idle");
  // Voice mode: đọc xong → báo ChatInput tự bật mic nghe câu tiếp theo
  const voice = useVoiceChatStore.getState();
  if (voice.enabled) voice.requestListen();
}

/** Prefetch blob (network) — bấm loa là phát ngay. limit = chỉ vài đoạn đầu. */
function prefetchChunks(text: string, limit?: number) {
  const chunks = chunkText(text);
  (typeof limit === "number" ? chunks.slice(0, limit) : chunks).forEach((c) => void getAudio(c).catch(() => undefined));
}

/**
 * Nút loa "đọc to" câu trả lời (§9.3 voice reply): cắt câu → tổng hợp SONG SONG →
 * phát GAPLESS bằng Web Audio. Prefetch sẵn ở tin mới nhất/hover nên bấm là có
 * tiếng gần như tức thì.
 */
export default function TtsButton({
  text,
  eager = false,
  autoPlay = false,
}: {
  text: string;
  eager?: boolean;
  /** Voice mode: tự đọc to ngay khi mount (câu trả lời mới nhất vừa stream xong) */
  autoPlay?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const myTokenRef = useRef(0);
  const statusRef = useRef<Status>("idle");
  const autoPlayedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Unmount: nếu mình đang phát thì dừng hẳn
  useEffect(() => {
    return () => {
      if (playToken === myTokenRef.current) cancelPlayback();
    };
  }, []);

  const play = useCallback(async () => {
    // Đang phát/đang tải mà bấm lại → dừng (đọc trạng thái qua ref → play ổn định)
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      if (playToken === myTokenRef.current) cancelPlayback();
      else setStatus("idle");
      return;
    }
    await playTts(text, setStatus, (t) => {
      myTokenRef.current = t;
    });
  }, [text]);

  const label = status === "playing" ? "Dừng đọc" : "Đọc to câu trả lời";

  // Tin nhắn MỚI NHẤT vừa trả lời xong → prefetch vài đoạn đầu (mobile không có hover)
  useEffect(() => {
    if (eager) prefetchChunks(text, 2);
  }, [eager, text]);

  // Voice mode: câu trả lời mới nhất vừa xong → tự đọc to (1 lần duy nhất)
  useEffect(() => {
    if (autoPlay && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      void play();
    }
  }, [autoPlay, play]);

  return (
    <button
      type="button"
      onClick={play}
      onMouseEnter={() => prefetchChunks(text)}
      onFocus={() => prefetchChunks(text)}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        status === "playing"
          ? "text-brand-accent"
          : "text-muted-foreground/60 hover:text-brand-primary dark:hover:text-brand-accent"
      )}
    >
      {status === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : status === "playing" ? (
        <VolumeX className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Volume2 className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
