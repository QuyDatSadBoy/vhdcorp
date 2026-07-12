"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { speakText } from "@/services/chat-agent.service";
import { cn } from "@/lib/utils";

/** Audio đang phát toàn cục — phát cái mới thì dừng cái cũ */
let currentAudio: HTMLAudioElement | null = null;

/** Cache blob MP3 theo text (module-level, sống suốt session) — bấm lại phát NGAY không chờ mạng */
const blobCache = new Map<string, Blob>();
const BLOB_CACHE_MAX = 24;

function cacheBlob(text: string, blob: Blob) {
  blobCache.delete(text);
  blobCache.set(text, blob);
  if (blobCache.size > BLOB_CACHE_MAX) {
    const oldest = blobCache.keys().next().value;
    if (oldest !== undefined) blobCache.delete(oldest);
  }
}

type Status = "idle" | "loading" | "playing";

/**
 * Nút loa "đọc to" câu trả lời (§9.3 voice reply): gọi BE proxy TTS →
 * phát audio. Đang phát → bấm để dừng. Cả widget chỉ 1 audio phát cùng lúc.
 */
export default function TtsButton({ text }: { text: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Dọn audio + object URL khi unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (currentAudio === audioRef.current) currentAudio = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setStatus("idle");
  };

  const play = async () => {
    if (status === "playing") {
      stop();
      return;
    }
    // Dừng audio khác đang phát trong widget
    if (currentAudio) currentAudio.pause();

    setStatus("loading");
    try {
      let blob = blobCache.get(text);
      if (!blob) {
        blob = await speakText(text);
        cacheBlob(text, blob);
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        setStatus("idle");
      };
      await audio.play();
      setStatus("playing");
    } catch {
      // Lỗi TTS / autoplay bị chặn → về idle im lặng
      stop();
    }
  };

  const label = status === "playing" ? "Dừng đọc" : "Đọc to câu trả lời";

  return (
    <button
      type="button"
      onClick={play}
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
