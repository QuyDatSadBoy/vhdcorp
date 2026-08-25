"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import HeadlessChat from "./headless-chat";

/**
 * Demo CopilotKit self-host: provider trỏ vào route handler /copilotkit
 * (KHÔNG phải /api/* — nginx đẩy /api/* sang NestJS), agent AG-UI là `vhd_chat`.
 */
export default function CopilotDemoPage() {
  return (
    <CopilotKit runtimeUrl="/copilotkit" agent="vhd_chat">
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-foreground">Trợ lý VHD — CopilotKit headless</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            UI tự viết trên hook <code className="text-brand-accent">useAgent</code>, nối tới agent AG-UI qua
            CopilotRuntime tự host.
          </p>
        </header>
        <HeadlessChat />
      </main>
    </CopilotKit>
  );
}
