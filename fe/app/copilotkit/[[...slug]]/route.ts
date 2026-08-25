import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, InMemoryAgentRunner, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";

// KHÔNG đặt route này dưới /api/* — nginx production đẩy toàn bộ /api/* sang NestJS:8080,
// route handler Next sẽ không bao giờ chạy (xem deploy/nginx.conf).

const runtime = new CopilotRuntime({
  agents: {
    vhd_chat: new HttpAgent({
      url: process.env.AGENT_AGUI_URL ?? "http://localhost:8001/agui/chat",
    }),
  },
  runner: new InMemoryAgentRunner(),
});

const handler = createCopilotRuntimeHandler({ runtime, basePath: "/copilotkit" });

export const GET = handler;
export const POST = handler;

// Runtime giữ thread trong bộ nhớ tiến trình → không cho Next prerender/cache
export const dynamic = "force-dynamic";
