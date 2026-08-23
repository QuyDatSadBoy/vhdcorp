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
// Đoạn ĐẦU phải đủ dài để PHÁT lâu hơn thời gian tổng hợp đoạn thứ hai, nếu không sẽ
// nghe thấy khoảng lặng giữa hai đoạn. Đo thật trên server TTS: mỗi lượt tổng hợp tốn
// ~1.6–2.4s gần như cố định (không phụ thuộc độ dài), tiếng Việt đọc ~15 ký tự/giây
// → đoạn đầu cần khoảng 60 ký tự trở lên mới che được.
const FIRST_MIN = 60;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_MAX) return [clean];
  const sentences = clean.split(/(?<=[.!?…])\s+/);
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const limit = chunks.length === 0 ? CHUNK_MAX : CHUNK_MAX;
    if (buf && (buf + " " + s).length > limit) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
    // Đoạn đầu: chốt lại ngay khi đã đủ dài để phát che được đoạn kế tiếp
    if (chunks.length === 0 && buf.length >= FIRST_MIN) {
      chunks.push(buf);
      buf = "";
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

  // Tổng hợp + decode SONG SONG NHƯNG CÓ TIẾT CHẾ.
  // Đo thật trên server TTS: bắn cả 4 đoạn cùng lúc thì MỖI đoạn tụt xuống ~4.5s
  // (server nghẽn), trong khi chạy 2 luồng chỉ ~2.4s và chạy một mình ~1.6s.
  // Vì vậy: đoạn ĐẦU đi riêng để có tiếng sớm nhất, phần còn lại chạy pool 2 luồng —
  // vừa đủ nhanh để nối đuôi liền mạch, vừa không tự làm nghẽn chính mình.
  const bufs: Promise<AudioBuffer | null>[] = [];
  const firstBuf = getBuffer(chunks[0]).catch(() => null);
  bufs.push(firstBuf);
  if (chunks.length > 1) {
    const rest = chunks.slice(1);
    const results: (AudioBuffer | null)[] = new Array(rest.length).fill(null);
    const resolvers: ((v: AudioBuffer | null) => void)[] = [];
    for (let i = 0; i < rest.length; i++) {
      bufs.push(new Promise<AudioBuffer | null>((r) => resolvers.push(r)));
    }
    let next = 0;
    const worker = async () => {
      while (true) {
        const i = next++;
        if (i >= rest.length) return;
        if (my !== playToken) {
          // Khách bấm dừng: vẫn phải resolve để vòng phát không treo ở `await bufs[i]`
          resolvers[i](null);
          continue;
        }
        results[i] = await getBuffer(rest[i]).catch(() => null);
        resolvers[i](results[i]);
      }
    };
    // CHỜ đoạn đầu xong rồi mới chạy pool: đoạn đầu quyết định "bấm loa bao lâu thì
    // có tiếng", để nó chạy một mình là nhanh nhất. Đo thật: 4.86s → 1.63s.
    // Đoạn đầu dài ≥60 ký tự (≈4s đọc) nên pool vẫn kịp trả đoạn 2 trước khi hết tiếng.
    void firstBuf.then(() => Promise.all([worker(), worker()]));
  }
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
 * Cắt phần text ĐÃ ỔN ĐỊNH ra khỏi đoạn đang stream.
 *
 * Trong lúc câu trả lời còn chảy, câu cuối cùng chưa chắc đã hết (model có thể còn
 * viết tiếp), nên chỉ lấy tới ranh giới câu CUỐI CÙNG tìm được. Nhờ vậy đọc dở không
 * bị cụt câu, mà vẫn bắt đầu đọc được ngay khi có câu đầu tiên.
 * Trả về [phần đọc được, phần còn treo].
 */
export function splitStable(text: string): [string, string] {
  const m = /[.!?…\n](?=[^.!?…\n]*$)/.exec(text);
  if (!m) return ["", text];
  const cut = m.index + 1;
  return [text.slice(0, cut), text.slice(cut)];
}

/**
 * Bộ phát NỐI TIẾP theo dòng chảy: nhận text lớn dần, cứ đủ một đoạn là tổng hợp và
 * xếp lịch phát ngay sau đoạn trước — không chờ câu trả lời viết xong.
 *
 * Đây là thứ làm chế độ đàm thoại nghe gần như tức thời: trước đây phải đợi stream
 * kết thúc mới bắt đầu tổng hợp (chờ vài giây im lặng), giờ tiếng ra ngay sau câu đầu.
 */
class StreamSpeaker {
  private token: number;
  private ctx: AudioContext;
  private queue: Promise<void> = Promise.resolve();
  private startAt = 0;
  private fedChars = 0;
  private started = false;
  private onStart: () => void;

  constructor(ctx: AudioContext, token: number, onStart: () => void) {
    this.ctx = ctx;
    this.token = token;
    this.onStart = onStart;
  }

  /** Gọi mỗi khi text dài thêm. `done=true` khi stream đã kết thúc (đọc nốt phần dư). */
  feed(fullText: string, done = false): void {
    const fresh = fullText.slice(this.fedChars);
    if (!fresh) return;
    const [ready, pendingTail] = done ? [fresh, ""] : splitStable(fresh);
    if (!ready.trim()) return;
    this.fedChars = fullText.length - pendingTail.length;
    for (const chunk of chunkText(ready)) this.enqueue(chunk);
  }

  /** Tổng hợp + xếp lịch TUẦN TỰ: giữ đúng thứ tự câu và chỉ 1 request mỗi lúc
   *  (bắn song song sẽ làm server TTS nghẽn — đo thật: 1.6s → 4.5s mỗi đoạn). */
  private enqueue(chunk: string): void {
    this.queue = this.queue.then(async () => {
      if (this.token !== playToken) return;
      const buf = await getBuffer(chunk).catch(() => null);
      if (!buf || this.token !== playToken) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      const now = this.ctx.currentTime;
      const when = this.started ? Math.max(this.startAt, now) : now + 0.02;
      src.start(when);
      this.startAt = when + buf.duration;
      liveSources.push(src);
      if (!this.started) {
        this.started = true;
        this.onStart();
      }
    });
  }

  /** Còn là lượt đọc hiện hành không (chưa bị lượt khác giành mất). */
  alive(): boolean {
    return this.token === playToken;
  }

  /** Chờ đọc hết những gì đã nạp (dùng để biết khi nào trả UI về trạng thái nghỉ). */
  async drain(): Promise<void> {
    await this.queue;
  }
}

/* Bộ phát theo dòng chảy sống ở MODULE, không gắn vòng đời component.
 *
 * Trong lúc câu trả lời còn chảy, cây React quanh nút loa dựng lại nhiều lần (log
 * công cụ xuất hiện, khối giao diện được chèn thêm). Nếu speaker nằm trong ref của
 * component thì mỗi lần dựng lại nó bị huỷ rồi tạo mới, và lần huỷ đó đẩy token lên
 * khiến chính speaker vừa tạo trở thành "hết hạn" — kết quả: không câu nào được đọc.
 * Khoá theo nội dung đã đọc để nhận ra "vẫn là lượt đọc cũ" sau khi dựng lại. */
let liveSpeaker: { speaker: StreamSpeaker; key: string } | null = null;

/** Lấy (hoặc tạo) bộ phát cho lượt trả lời này. `key` phân biệt các lượt khác nhau. */
function getStreamSpeaker(key: string, setStatus: (s: Status) => void): StreamSpeaker | null {
  if (liveSpeaker?.key === key && liveSpeaker.speaker.alive()) return liveSpeaker.speaker;
  const ctx = getCtx();
  if (!ctx) return null;
  cancelPlayback();
  const my = playToken;
  activeReset = () => setStatus("idle");
  setStatus("loading");
  void ctx.resume().catch(() => undefined);
  const speaker = new StreamSpeaker(ctx, my, () => {
    if (my === playToken) setStatus("playing");
  });
  liveSpeaker = { speaker, key };
  return speaker;
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
  streaming = false,
}: {
  text: string;
  eager?: boolean;
  /** Voice mode: tự đọc to (bắt đầu NGAY trong lúc câu trả lời còn đang chảy) */
  autoPlay?: boolean;
  /** Câu trả lời còn đang stream → nạp/đọc dần thay vì chờ viết xong */
  streaming?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const myTokenRef = useRef(0);
  const statusRef = useRef<Status>("idle");
  const autoPlayedRef = useRef(false);
  const prefetchedRef = useRef(false);
  const speakerRef = useRef<StreamSpeaker | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Rời màn hình thì dừng đọc — TRỪ lượt đọc theo dòng chảy đang chạy: cây React
  // quanh nút dựng lại nhiều lần trong lúc câu trả lời còn chảy, huỷ ở đây sẽ cắt
  // ngang chính lượt vừa bắt đầu.
  useEffect(() => {
    return () => {
      if (playToken !== myTokenRef.current) return;
      if (liveSpeaker?.speaker === speakerRef.current && liveSpeaker.speaker.alive()) return;
      cancelPlayback();
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

  // Nạp trước ĐOẠN ĐẦU ngay khi câu đầu tiên đã ổn định — làm TRONG LÚC câu trả lời
  // còn đang chảy, nên tới lúc khách bấm loa thì tiếng đã sẵn (đo thật: 0.06s).
  // Trước đây chỉ nạp sau khi stream xong nên vẫn phải chờ ~1.6s.
  useEffect(() => {
    if (!eager || prefetchedRef.current) return;
    const [stable] = streaming ? splitStable(text) : [text];
    if (stable.trim().length >= 40) {
      prefetchedRef.current = true;
      prefetchChunks(stable, 1);
    }
  }, [eager, text, streaming]);

  // Chế độ đàm thoại: ĐỌC NGAY khi có câu đầu, rồi nối tiếp theo dòng chảy —
  // không chờ viết xong (đó là nguyên nhân trước đây im lặng vài giây).
  useEffect(() => {
    if (!autoPlay || !text) return;
    // Khoá theo 40 ký tự đầu: đủ để phân biệt hai lượt trả lời khác nhau, và không
    // đổi khi câu trả lời dài thêm — nhờ vậy dựng lại cây React vẫn là cùng một lượt.
    const key = text.slice(0, 40);
    const sp = getStreamSpeaker(key, setStatus);
    if (!sp) {
      if (!autoPlayedRef.current) {
        autoPlayedRef.current = true;
        void play(); // không có Web Audio → quay về cách phát cả bài
      }
      return;
    }
    speakerRef.current = sp;
    myTokenRef.current = playToken;
    sp.feed(text, !streaming);
    if (!streaming) void sp.drain().then(() => setStatus((s) => (s === "playing" ? "idle" : s)));
  }, [autoPlay, text, streaming, play]);

  return (
    <button
      type="button"
      onClick={play}
      // Rê chuột chỉ nạp trước ĐOẠN ĐẦU (tin nhắn cũ chưa được eager nạp sẵn).
      // Trước đây nạp HẾT mọi đoạn cùng lúc → server TTS nghẽn → chính đoạn đầu, thứ
      // quyết định "bấm loa bao lâu thì có tiếng", tụt từ ~1.6s xuống ~4.3s.
      onMouseEnter={() => prefetchChunks(text, 1)}
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
