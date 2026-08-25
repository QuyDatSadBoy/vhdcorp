"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Eye,
  Loader2,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
  X,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  useAgentMode,
  useSaveAgentMode,
  useDeepSkills,
  useSaveDeepSkill,
  useDeleteDeepSkill,
  useMcpServers,
  useSaveMcpServer,
  useDeleteMcpServer,
  type DeepSkill,
  type McpServer,
  type McpTransport,
} from "@/services/agent-deep.service";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_CONTENT = 20_000;

const TRANSPORTS: { value: McpTransport; label: string }[] = [
  { value: "streamable_http", label: "streamable_http (khuyên dùng)" },
  { value: "sse", label: "sse (server-sent events)" },
];

/** Đầu mỗi thẻ: chip icon + tên mục + một câu giải thích cho người không kỹ thuật. */
function SectionHeader({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-primary/10">
          <Icon className="h-5 w-5 text-brand-primary" />
        </span>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="max-w-2xl text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof BookOpen; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-foreground/15 bg-muted/20 px-4 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-(--vhd-color-danger)/30 bg-(--vhd-color-danger)/5 p-3 text-sm text-(--vhd-color-danger)">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ────────────────────────────── KỸ NĂNG (SKILL) ────────────────────────────── */

interface SkillForm {
  /** null = đang thêm mới; có slug = đang sửa skill cũ */
  slug: string | null;
  name: string;
  description: string;
  content: string;
  enabled: boolean;
}

const EMPTY_SKILL: SkillForm = { slug: null, name: "", description: "", content: "", enabled: true };

const SKILL_TEMPLATE = `## Khi nào dùng
Khách hỏi giá số lượng lớn (từ 10 cái trở lên).

## Các bước
1. Hỏi khách cần mã hàng nào, số lượng bao nhiêu.
2. Áp bảng chiết khấu: 10-49 cái giảm 5%, 50-99 cái giảm 8%, từ 100 cái giảm 12%.
3. Báo giá đã gồm VAT và nhắc khách phí vận chuyển tính riêng.

## Lưu ý
Không tự ý giảm quá 12% — trường hợp đó hẹn khách để nhân viên gọi lại.`;

function SkillsCard() {
  const { data, isLoading, isError, error } = useDeepSkills();
  const save = useSaveDeepSkill();
  const del = useDeleteDeepSkill();
  const confirm = useConfirm();
  const [form, setForm] = useState<SkillForm | null>(null);
  // Kỹ năng viết sẵn chỉ để xem — giữ riêng khỏi `form` để không lẫn với luồng sửa
  const [viewing, setViewing] = useState<DeepSkill | null>(null);

  const skills = data?.skills ?? [];

  const submit = async () => {
    if (!form) return;
    const name = form.name.trim();
    if (!name) return toast.error("Nhập tên kỹ năng trước đã (ví dụ: Báo giá sỉ).");
    if (!form.content.trim()) return toast.error("Nội dung đang trống — viết các bước bạn muốn trợ lý làm theo.");
    try {
      await save.mutateAsync({
        name,
        description: form.description.trim(),
        content: form.content,
        enabled: form.enabled,
      });
      toast.success(`Đã lưu kỹ năng "${name}" — trợ lý dùng ngay từ câu hỏi tiếp theo.`);
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggle = async (s: DeepSkill, enabled: boolean) => {
    try {
      await save.mutateAsync({ name: s.name, description: s.description, content: s.content, enabled });
      toast.success(enabled ? `Đã bật "${s.name}".` : `Đã tắt "${s.name}".`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (s: DeepSkill) => {
    const ok = await confirm({
      title: `Xoá kỹ năng "${s.name}"?`,
      description: "Trợ lý sẽ không còn làm theo quy trình này nữa. Không thể hoàn tác.",
      confirmText: "Xoá kỹ năng",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(s.slug);
      if (form?.slug === s.slug) setForm(null);
      toast.success(`Đã xoá "${s.name}".`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <SectionHeader
          icon={BookOpen}
          title="Kỹ năng của trợ lý"
          desc="Kỹ năng là quy trình bạn dạy cho trợ lý AI — ví dụ cách báo giá sỉ theo số lượng. Trợ lý chỉ đọc chi tiết khi cần nên thêm nhiều cũng không làm chậm."
          action={
            !form && (
              <Button type="button" onClick={() => setForm({ ...EMPTY_SKILL })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Thêm kỹ năng
              </Button>
            )
          }
        />

        {isLoading ? (
          <LoadingRow label="Đang tải danh sách kỹ năng…" />
        ) : isError ? (
          <ErrorRow message={(error as Error).message} />
        ) : skills.length === 0 ? (
          !form && (
            <EmptyState
              icon={BookOpen}
              title="Chưa có kỹ năng nào"
              hint="Thêm kỹ năng đầu tiên để dạy trợ lý quy trình của bạn — ví dụ cách báo giá sỉ, cách xử lý khách đòi đổi hàng."
            />
          )
        ) : (
          <ul className="space-y-2">
            {skills.map((s) => (
              <li
                key={s.slug}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-foreground/8 bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{s.name}</span>
                    {s.builtin && (
                      <span className="shrink-0 rounded-full bg-brand-accent/15 px-2 py-0.5 text-[10px] font-semibold text-brand-accent">
                        Có sẵn
                      </span>
                    )}
                    {!s.enabled && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Đang tắt
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.description || "Chưa có mô tả ngắn — trợ lý dựa vào mô tả này để biết khi nào cần dùng."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.builtin ? (
                    // Kỹ năng viết sẵn: cho XEM nội dung để biết trợ lý đang dựa vào đâu,
                    // nhưng không sửa/xoá qua web — nguồn của nó là file trong mã nguồn.
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setViewing(s)}>
                      <Eye className="h-3.5 w-3.5" /> Xem
                    </Button>
                  ) : (
                    <>
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={(v) => void toggle(s, v)}
                        aria-label={`Bật/tắt kỹ năng ${s.name}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() =>
                          setForm({
                            slug: s.slug,
                            name: s.name,
                            description: s.description,
                            content: s.content,
                            enabled: s.enabled,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" /> Sửa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-(--vhd-color-danger) hover:bg-(--vhd-color-danger)/10 hover:text-(--vhd-color-danger)"
                        aria-label={`Xoá kỹ năng ${s.name}`}
                        onClick={() => void remove(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {viewing && (
          <div className="space-y-3 rounded-2xl border border-brand-accent/25 bg-brand-accent/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{viewing.name}</p>
                <p className="text-xs text-muted-foreground">
                  Kỹ năng có sẵn trong mã nguồn — muốn đổi thì sửa file rồi phát hành lại
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setViewing(null)} className="gap-1">
                <X className="h-4 w-4" /> Đóng
              </Button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl border border-foreground/8 bg-card p-3 font-mono text-xs whitespace-pre-wrap text-foreground/80">
              {viewing.content}
            </pre>
          </div>
        )}

        {form && (
          <div className="space-y-4 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{form.slug ? `Sửa kỹ năng: ${form.slug}` : "Kỹ năng mới"}</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm(null)} className="gap-1">
                <X className="h-4 w-4" /> Đóng
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tên kỹ năng</Label>
                <Input
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Vd: Báo giá sỉ theo số lượng"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mô tả ngắn</Label>
                <Input
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Vd: Dùng khi khách hỏi giá từ 10 cái trở lên"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mô tả ngắn là thứ trợ lý đọc trước để biết <b>khi nào</b> cần mở kỹ năng này — viết rõ tình huống áp dụng.
            </p>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Nội dung chi tiết (Markdown)</Label>
                <div className="flex items-center gap-3">
                  {!form.content && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, content: SKILL_TEMPLATE })}
                      className="text-[11px] font-semibold text-brand-primary hover:underline"
                    >
                      Chèn mẫu ví dụ
                    </button>
                  )}
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {form.content.length.toLocaleString("vi-VN")} / {MAX_CONTENT.toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>
              <Textarea
                rows={14}
                maxLength={MAX_CONTENT}
                className="font-mono text-xs"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="## Khi nào dùng&#10;…&#10;&#10;## Các bước&#10;1. …"
              />
              <p className="text-[11px] text-muted-foreground">
                Viết như hướng dẫn cho nhân viên mới: khi nào áp dụng, làm theo mấy bước, điều gì tuyệt đối không được
                làm. Dùng <code>##</code> để tách từng mục.
              </p>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <span className="font-medium">Bật kỹ năng này</span>
              <span className="text-xs text-muted-foreground">Tắt = lưu lại nhưng trợ lý chưa dùng.</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void submit()} disabled={save.isPending} className="gap-1.5">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu kỹ năng
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(null)}>
                Huỷ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────── CÔNG CỤ MCP ─────────────────────────────── */

interface McpForm {
  name: string;
  url: string;
  transport: McpTransport;
}

const EMPTY_MCP: McpForm = { name: "", url: "", transport: "streamable_http" };

function McpCard() {
  const { data, isLoading, isError, error } = useMcpServers();
  const save = useSaveMcpServer();
  const del = useDeleteMcpServer();
  const confirm = useConfirm();
  const [form, setForm] = useState<McpForm | null>(null);
  const [restartNeeded, setRestartNeeded] = useState(false);

  const servers = data?.servers ?? [];

  const submit = async () => {
    if (!form) return;
    const name = form.name.trim();
    const url = form.url.trim();
    if (!name) return toast.error("Nhập tên gợi nhớ cho công cụ (vd: Tra vận đơn).");
    if (!/^https?:\/\//i.test(url)) return toast.error("URL phải bắt đầu bằng http:// hoặc https://");
    try {
      const res = await save.mutateAsync({ name, url, transport: form.transport, enabled: true });
      setRestartNeeded(res.restart_required);
      toast.success(`Đã lưu công cụ "${name}".`);
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggle = async (s: McpServer, enabled: boolean) => {
    try {
      const res = await save.mutateAsync({ name: s.name, url: s.url, transport: s.transport, enabled });
      setRestartNeeded(res.restart_required);
      toast.success(enabled ? `Đã bật "${s.name}".` : `Đã tắt "${s.name}".`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (s: McpServer) => {
    const ok = await confirm({
      title: `Xoá công cụ "${s.name}"?`,
      description: "Trợ lý sẽ mất các tool của server này sau khi khởi động lại. Không thể hoàn tác.",
      confirmText: "Xoá công cụ",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      const res = await del.mutateAsync(s.name);
      setRestartNeeded(res.restart_required);
      toast.success(`Đã xoá "${s.name}".`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <SectionHeader
          icon={Plug}
          title="Công cụ MCP"
          desc="MCP server là dịch vụ bên ngoài cho trợ lý thêm khả năng mới — ví dụ tra vận đơn, tra tồn kho ở hệ thống khác. Chỉ thêm server bạn tin cậy."
          action={
            !form && (
              <Button type="button" onClick={() => setForm({ ...EMPTY_MCP })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Thêm công cụ
              </Button>
            )
          }
        />

        {restartNeeded && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Đã lưu, nhưng <b>cần khởi động lại trợ lý AI</b> thay đổi mới có hiệu lực (tool MCP chỉ nạp lúc agent khởi
              động). Vào <b>Hệ thống → Server</b> rồi restart <code>vhd-agent</code> — không thấy mục đó thì nhờ bên kỹ
              thuật restart giúp.
            </span>
          </div>
        )}

        {isLoading ? (
          <LoadingRow label="Đang tải danh sách công cụ…" />
        ) : isError ? (
          <ErrorRow message={(error as Error).message} />
        ) : servers.length === 0 ? (
          !form && (
            <EmptyState
              icon={Plug}
              title="Chưa có công cụ MCP nào"
              hint="Bình thường không cần thêm gì ở đây — trợ lý đã có sẵn công cụ tra sản phẩm và kiến thức công ty. Chỉ thêm khi bên kỹ thuật đưa bạn một địa chỉ MCP cụ thể."
            />
          )
        ) : (
          <ul className="space-y-2">
            {servers.map((s) => (
              <li
                key={s.name}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-foreground/8 bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                      {s.transport}
                    </span>
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{s.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => void toggle(s, v)}
                    aria-label={`Bật/tắt công cụ ${s.name}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-(--vhd-color-danger) hover:bg-(--vhd-color-danger)/10 hover:text-(--vhd-color-danger)"
                    aria-label={`Xoá công cụ ${s.name}`}
                    onClick={() => void remove(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {form && (
          <div className="space-y-4 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">Công cụ MCP mới</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm(null)} className="gap-1">
                <X className="h-4 w-4" /> Đóng
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tên gợi nhớ</Label>
                <Input
                  maxLength={60}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Vd: Tra vận đơn"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Địa chỉ (URL)</Label>
                <Input
                  maxLength={500}
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://vi-du.com/mcp"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kiểu kết nối</Label>
                <Select
                  value={form.transport}
                  onValueChange={(v) => setForm({ ...form, transport: v as McpTransport })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORTS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Chỉ nhận địa chỉ <b>http://</b> hoặc <b>https://</b> (không hỗ trợ chạy lệnh trên máy chủ vì lý do bảo
                mật). Sau khi lưu <b>phải khởi động lại trợ lý AI</b> mới dùng được công cụ mới.
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void submit()} disabled={save.isPending} className="gap-1.5">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu công cụ
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(null)}>
                Huỷ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Phạm vi hoạt động của trợ lý — thứ admin đổi thường xuyên nhất nên đặt trên cùng.
 *
 * Nói rõ đây là phạm vi CHỦ ĐỀ, không phải mức bảo mật: các chặn về an toàn giữ nguyên
 * ở mọi mức. Không nói thì dễ hiểu nhầm rằng "mở rộng" là tắt bảo vệ.
 */
function ModeCard() {
  const { data, isLoading } = useAgentMode();
  const save = useSaveAgentMode();
  const [newRule, setNewRule] = useState("");

  const setMode = async (mode: string) => {
    try {
      await save.mutateAsync({ mode });
      toast.success("Đã đổi phạm vi trợ lý — áp dụng ngay ở câu hỏi kế tiếp.");
    } catch {
      toast.error("Không lưu được, thử lại.");
    }
  };

  const addRule = async () => {
    const rule = newRule.trim();
    if (!rule || !data) return;
    try {
      await save.mutateAsync({ rules: [...data.rules, rule] });
      setNewRule("");
      toast.success("Đã thêm luật riêng.");
    } catch {
      toast.error("Không lưu được, thử lại.");
    }
  };

  const removeRule = async (idx: number) => {
    if (!data) return;
    try {
      await save.mutateAsync({ rules: data.rules.filter((_, i) => i !== idx) });
    } catch {
      toast.error("Không xoá được, thử lại.");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-brand-primary" /> Phạm vi trợ lý được phép giúp
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Đây là phạm vi CHỦ ĐỀ. Các chặn về an toàn (chống chiếm quyền câu lệnh, chống lộ chỉ dẫn nội bộ) giữ nguyên
            ở mọi mức. Khách nhìn thấy mức đang chọn ngay trên khung chat.
          </p>
        </div>

        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {data.modes.map((m) => {
                const active = m.id === data.mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void setMode(m.id)}
                    disabled={save.isPending}
                    className={
                      "cursor-pointer rounded-xl border p-3 text-left transition-colors " +
                      (active
                        ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/30"
                        : "border-foreground/10 hover:border-foreground/25")
                    }
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {m.label}
                      {active && <Check className="h-3.5 w-3.5 text-brand-primary" />}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Luật riêng của cửa hàng (trợ lý luôn tuân thủ)</Label>
              {data.rules.length > 0 && (
                <ul className="space-y-1.5">
                  {data.rules.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-foreground/8 bg-card px-2.5 py-1.5 text-xs"
                    >
                      <span className="min-w-0 flex-1">{r}</span>
                      <button
                        type="button"
                        onClick={() => void removeRule(i)}
                        aria-label={`Xoá luật: ${r}`}
                        className="shrink-0 cursor-pointer text-muted-foreground hover:text-(--vhd-color-danger)"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  value={newRule}
                  maxLength={300}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addRule()}
                  placeholder="Vd: Không hứa giao trong ngày cho đơn ngoại tỉnh"
                />
                <Button type="button" onClick={() => void addRule()} disabled={!newRule.trim() || save.isPending}>
                  <Plus className="h-4 w-4" /> Thêm
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Trang cấu hình lõi trợ lý AI: phạm vi + kỹ năng (quy trình) + công cụ MCP. */
export function AgentConfig() {
  return (
    <div className="space-y-6">
      <ModeCard />
      <SkillsCard />
      <McpCard />
    </div>
  );
}
