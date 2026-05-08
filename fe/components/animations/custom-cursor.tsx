"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * Premium custom cursor — double-border trick (white ring + dark shadow outline)
 * nên luôn visible trên MỌI nền màu mà KHÔNG cần mix-blend-difference
 * (mix-blend-difference gây hiện tượng invert text → chữ biến mất khi cursor đi qua).
 *
 * - Dot: 5px white + dark shadow-outline
 * - Ring: 24px white 1px + dark shadow-outline
 * - Hover: ring scale 1.4x, dot scale 0 (disappear vào ring)
 * - Ẩn trên mobile/touch
 */
export function CustomCursor() {
  const reduce = useReducedMotion();

  const dotX = useMotionValue(-200);
  const dotY = useMotionValue(-200);
  const ringX = useSpring(dotX, { stiffness: 140, damping: 18, mass: 0.6 });
  const ringY = useSpring(dotY, { stiffness: 140, damping: 18, mass: 0.6 });

  const scale = useMotionValue(1);
  const springScale = useSpring(scale, { stiffness: 320, damping: 28 });
  const dotScale = useMotionValue(1);
  const springDotScale = useSpring(dotScale, { stiffness: 320, damping: 28 });

  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setIsPointer(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reduce || !isPointer) return;

    const onMove = (e: MouseEvent) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
    };

    const onEnter = () => {
      scale.set(1.5);
      dotScale.set(0);
    };
    const onLeave = () => {
      scale.set(1);
      dotScale.set(1);
    };

    document.addEventListener("mousemove", onMove, { passive: true });

    const bind = (el: Element) => {
      if (!(el as HTMLElement).dataset.cursorBound) {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        (el as HTMLElement).dataset.cursorBound = "1";
      }
    };

    const bindAll = () =>
      document
        .querySelectorAll(
          "a, button, [role='button'], label, select, input[type='checkbox'], input[type='radio'], [data-cursor-expand]"
        )
        .forEach(bind);

    bindAll();
    const observer = new MutationObserver(bindAll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, [reduce, isPointer, dotX, dotY, scale, dotScale]);

  if (reduce || !isPointer) return null;

  return (
    <>
      {/* Outer ring — spring follow, double-border: white + dark shadow */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-9998 rounded-full will-change-transform"
        style={{
          width: 24,
          height: 24,
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          scale: springScale,
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
        }}
      />
      {/* Inner dot — exact follow, double-border */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-9999 rounded-full will-change-transform"
        style={{
          width: 5,
          height: 5,
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          scale: springDotScale,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
        }}
      />
    </>
  );
}
