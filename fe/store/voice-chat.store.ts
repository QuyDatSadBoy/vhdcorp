import { create } from "zustand";

/**
 * Voice mode cho trợ lý AI (voice-to-voice):
 * bật → nói là tự gửi (STT), trả lời xong tự đọc to (TTS), đọc xong tự nghe tiếp.
 * Không persist — mỗi phiên user chủ động bật (tránh site tự phát âm thanh).
 */
interface VoiceChatState {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  /** Tăng mỗi khi TTS đọc xong câu trả lời — ChatInput nghe tín hiệu này để tự bật mic vòng tiếp theo */
  listenSignal: number;
  requestListen: () => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set) => ({
  enabled: false,
  setEnabled: (on) => set({ enabled: on }),
  listenSignal: 0,
  requestListen: () => set((s) => ({ listenSignal: s.listenSignal + 1 })),
}));
