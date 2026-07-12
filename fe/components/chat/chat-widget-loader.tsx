"use client";

import dynamic from "next/dynamic";

// Lazy-load widget chat (client-only, ssr:false) để không tăng bundle trang.
// Layout (client) là server component nên cần wrapper client nhỏ này.
const ChatWidget = dynamic(() => import("./chat-widget"), { ssr: false });

export default function ChatWidgetLoader() {
  return <ChatWidget />;
}
