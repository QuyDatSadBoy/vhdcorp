"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** "destructive" hiển thị nút xác nhận màu đỏ. Mặc định "default". */
  variant?: "default" | "destructive";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Provider cung cấp hook `useConfirm()` cho admin pages.
 * Thay thế `window.confirm()` bằng AlertDialog có thương hiệu, hỗ trợ
 * Promise-based API và destructive variant.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingState | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const value = React.useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  const handleOpenChange = (open: boolean) => {
    if (!open && pending) {
      pending.resolve(false);
      setPending(null);
    }
  };

  const handleConfirm = () => {
    if (!pending) return;
    pending.resolve(true);
    setPending(null);
  };

  const handleCancel = () => {
    if (!pending) return;
    pending.resolve(false);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title ?? ""}</AlertDialogTitle>
            {pending?.description && <AlertDialogDescription>{pending.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>{pending?.cancelText ?? "Hủy"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(pending?.variant === "destructive" && buttonVariants({ variant: "destructive" }))}
            >
              {pending?.confirmText ?? "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm phải dùng trong <ConfirmDialogProvider>");
  }
  return ctx.confirm;
}
