"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * Premium custom cursor — double-border technique:
 *   white border + dark box-shadow outline = visible trên mọi nền màu
 *   mà KHÔNG cần mix-blend-difference (tránh invert text).
 *
 * Design:
 *   - Dot: 5px, tốc độ theo cực nhanh (stiffness 2000)
 *   - Ring: 36px, spring laggy (stiffness 90, damping 20) — feel premium
 *   - Hover link/button: ring scale → 1.55x + subtle fill, dot scale → 0
 */
export function CustomCursor() {
  const reduce = useReducedMotion();

  // Dot: follows cursor instantly
  const dotX = useMotionValue(-200);
  const dotY = useMotionValue(-200);
  const dotSpringX = useSpring(dotX, { stiffness: 2000, damping: 80 });
  const dotSpringY = useSpring(dotY, { stiffness: 2000, damping: 80 });

  // Ring: follows with intentional lag
  const ringX = useSpring(dotX, { stiffness: 90, damping: 20, mass: 0.4 });
  const ringY = useSpring(dotY, { stiffness: 90, damping: 20, mass: 0.4 });

  const ringScale = useMotionValue(1);
  const springRingScale = useSpring(ringScale, { stiffness: 300, damping: 26 });
  const dotScale = useMotionValue(1);
  const springDotScale = useSpring(dotScale, { stiffness: 300, damping: 26 });

  const [isPointer, setIsPointer] = useState(false);
  const isHovering = useRef(false);

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
      if (isHovering.current) return;
      isHovering.current = true;
      ringScale.set(1.55);
      dotScale.set(0);
    };
    const onLeave = () => {
      if (!isHovering.current) return;
      isHovering.current = false;
      ringScale.set(1);
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
        .querySelectorAll("a, button, [role='button'], label, select, input, textarea, [data-cursor-expand]")
        .forEach(bind);

    bindAll();
    const observer = new MutationObserver(bindAll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, [reduce, isPointer, dotX, dotY, ringScale, dotScale]);

  if (reduce || !isPointer) return null;

  return (
    <>
      {/* Outer ring — laggy spring follow */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-9998 rounded-full will-change-transform"
        style={{
          width: 36,
          height: 36,
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          scale: springRingScale,
          border: "1px solid rgba(255,255,255,0.88)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.12)",
        }}
      />
      {/* Inner dot — near-instant follow */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-9999 rounded-full will-change-transform"
        style={{
          width: 5,
          height: 5,
          x: dotSpringX,
          y: dotSpringY,
          translateX: "-50%",
          translateY: "-50%",
          scale: springDotScale,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.28)",
        }}
      />
    </>
  );
}
