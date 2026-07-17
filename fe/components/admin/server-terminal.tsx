"use client";

import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";
import { Terminal as TerminalIcon, Power, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = "idle" | "connecting" | "open" | "closed";

/**
 * Terminal SSH trên web (chỉ ADMIN). Kết nối WebSocket cùng origin tới
 * /api/server/terminal — cookie admin gửi kèm tự động. BE mở `ssh root@127.0.0.1`
 * nên chính sshd của VPS bắt NHẬP MẬT KHẨU root (không tự vào được).
 */
export function ServerTerminal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    let disposed = false;
    let ws: WebSocket | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let term: any = null;
    let onWinResize: (() => void) | null = null;

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      if (disposed || !containerRef.current) return;

      term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        theme: { background: "#0b1020", foreground: "#dbe4ff", cursor: "#4c7fff" },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      const sendResize = () => {
        try {
          fit.fit();
        } catch {
          /* container chưa sẵn sàng */
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ t: "r", c: term.cols, r: term.rows }));
        }
      };

      setStatus("connecting");
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/api/server/terminal`);

      ws.onopen = () => {
        setStatus("open");
        term.focus();
        sendResize();
      };
      ws.onmessage = (e) => {
        if (typeof e.data === "string") term.write(e.data);
      };
      ws.onclose = () => {
        setStatus("closed");
        term.write("\r\n\x1b[33m[Đã đóng kết nối]\x1b[0m\r\n");
      };
      ws.onerror = () => setStatus("closed");

      term.onData((d: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ t: "i", d }));
        }
      });

      onWinResize = () => sendResize();
      window.addEventListener("resize", onWinResize);
    })();

    return () => {
      disposed = true;
      if (onWinResize) window.removeEventListener("resize", onWinResize);
      ws?.close();
      term?.dispose();
    };
  }, [open]);

  const badge = {
    idle: { text: "Chưa kết nối", cls: "text-muted-foreground" },
    connecting: { text: "Đang kết nối…", cls: "text-amber-500" },
    open: { text: "● Đang kết nối", cls: "text-emerald-500" },
    closed: { text: "Đã ngắt", cls: "text-red-500" },
  }[status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <TerminalIcon className="h-4 w-4 text-brand-primary" /> Terminal SSH (VPS)
          <span className={cn("ml-auto text-[11px] font-normal", badge.cls)}>{badge.text}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!open ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-1.5" onClick={() => setOpen(true)}>
              <PlugZap className="h-4 w-4" /> Mở terminal
            </Button>
            <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
              Kết nối SSH thẳng vào VPS. Sau khi mở, gõ <b>mật khẩu root của máy chủ</b> tại dấu nhắc{" "}
              <code className="rounded bg-muted px-1">password:</code> mới vào được (chính hệ điều hành xác thực).
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  setOpen(false);
                  setStatus("idle");
                }}
              >
                <Power className="h-3.5 w-3.5" /> Đóng terminal
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Phiên tự đóng sau 15 phút không thao tác. Mọi phiên đều ghi audit log.
              </span>
            </div>
            <div ref={containerRef} className="h-[28rem] w-full overflow-hidden rounded-xl border bg-[#0b1020] p-2" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
