"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { speakText } from "@/services/chat-agent.service";
import { useVoiceChatStore } from "@/store/voice-chat.store";
import { cn } from "@/lib/utils";

/* ── Cache + dedupe audio theo TỪNG ĐOẠN text ──────────────────── */
const blobCache = new Map<string, Blob>();
const BLOB_CACHE_MAX = 64;
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

/** Lấy audio 1 đoạn: cache → promise đang bay → gọi mới. */
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

/**
 * Cắt câu trả lời thành các ĐOẠN ngắn theo ranh giới câu (~140 ký tự) để tổng
 * hợp SONG SONG: đoạn đầu ngắn → ra tiếng gần như tức thì, các đoạn sau tổng
 * hợp nền trong lúc đoạn đầu đang đọc (không phải chờ cả đoạn dài).
 */
const CHUNK_MAX = 140;
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHUNK_MAX) return clean ? [clean] : [];
  const sentences = clean.split(/(?<=[.!?…])\s+/);
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
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

/* ── Điều khiển phát TOÀN CỤC: chỉ 1 luồng phát cùng lúc ────────── */
let playToken = 0; // tăng để HỦY mọi vòng phát đang chạy
let currentAudioEl: HTMLAudioElement | null = null;
let activeReset: (() => void) | null = null; // reset UI của player đang chạy

function preempt() {
  playToken += 1;
  if (currentAudioEl) {
    currentAudioEl.pause();
    currentAudioEl = null;
  }
  if (activeReset) {
    activeReset();
    activeReset = null;
  }
}

type Status = "idle" | "loading" | "playing";

/**
 * Nút loa "đọc to" câu trả lời (§9.3 voice reply): cắt câu → tổng hợp SONG SONG →
 * phát tuần tự. Prefetch sẵn ở tin mới nhất/hover nên bấm là có tiếng ngay.
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
  const autoPlayedRef = useRef(false);

  // Unmount: nếu mình đang phát thì dừng hẳn
  useEffect(() => {
    return () => {
      if (playToken === myTokenRef.current) preempt();
    };
  }, []);

  /** Prefetch song song mọi đoạn — bấm loa là phát ngay */
  const prefetch = () => {
    for (const c of chunkText(text)) void getAudio(c).catch(() => undefined);
  };

  const play = async () => {
    // Đang phát/đang tải mà bấm lại → dừng
    if (status === "playing" || status === "loading") {
      if (playToken === myTokenRef.current) preempt();
      else setStatus("idle");
      return;
    }
    preempt(); // dừng player khác đang chạy
    const my = playToken; // preempt vừa tăng token → đây là phiên mới nhất
    myTokenRef.current = my;
    activeReset = () => setStatus("idle");

    const chunks = chunkText(text);
    if (chunks.length === 0) return;
    chunks.forEach((c) => void getAudio(c).catch(() => undefined)); // tổng hợp SONG SONG

    setStatus("loading");
    try {
      for (let i = 0; i < chunks.length; i++) {
        const blob = await getAudio(chunks[i]);
        if (my !== playToken) return; // đã bị dừng/thay
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioEl = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.onpause = () => resolve(); // bị preempt → thoát chờ
          audio
            .play()
            .then(() => {
              if (my === playToken) setStatus("playing");
            })
            .catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        if (my !== playToken) return; // dừng giữa chừng
      }
      // Đọc xong toàn bộ
      if (my === playToken) {
        currentAudioEl = null;
        activeReset = null;
        setStatus("idle");
        // Voice mode: đọc xong → báo ChatInput tự bật mic nghe câu tiếp theo
        const voice = useVoiceChatStore.getState();
        if (voice.enabled) voice.requestListen();
      }
    } catch {
      if (my === playToken) {
        currentAudioEl = null;
        activeReset = null;
        setStatus("idle");
      }
    }
  };

  const label = status === "playing" ? "Dừng đọc" : "Đọc to câu trả lời";

  // Tin nhắn MỚI NHẤT vừa trả lời xong → prefetch luôn (mobile không có hover)
  useEffect(() => {
    if (eager) prefetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mount/đổi text
  }, [eager, text]);

  // Voice mode: câu trả lời mới nhất vừa xong → tự đọc to (1 lần duy nhất)
  useEffect(() => {
    if (autoPlay && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      void play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ theo autoPlay lúc mount
  }, [autoPlay]);

  return (
    <button
      type="button"
      onClick={play}
      onMouseEnter={prefetch}
      onFocus={prefetch}
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
