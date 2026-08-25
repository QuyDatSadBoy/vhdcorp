import { Blocks } from "lucide-react";
import { AgentConfig } from "@/components/admin/agent-config";

/**
 * Trang "Kỹ năng & công cụ AI" — dạy trợ lý quy trình nghiệp vụ (SKILL) và
 * cắm thêm công cụ ngoài (MCP server). Xem chi tiết ở components/admin/agent-config.tsx.
 */
export default function AdminAgentConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Blocks className="h-6 w-6 text-brand-primary" />
          Kỹ năng &amp; công cụ AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Dạy trợ lý AI các quy trình riêng của công ty và cắm thêm công cụ bên ngoài. Kỹ năng có hiệu lực{" "}
          <b>ngay lập tức</b>; công cụ MCP cần khởi động lại trợ lý.
        </p>
      </div>
      <AgentConfig />
    </div>
  );
}
