"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * Premium custom cursor — dùng mix-blend-difference nên luôn visible
 * trên MỌI nền màu (đen trên nền trắng, trắng trên nền tối, inverted trên màu).
 * - Inner dot: 10px, fill trắng, exact follow
 * - Outer ring: 48px, border trắng 1.5px, spring follow
 * - Hover: ring scale 2.5x + fill nhẹ
 * - Ẩn trên mobile/touch
 */
export function CustomCursor() {
  const reduce = useReducedMotion();

  const dotX = useMotionValue(-200);
  const dotY = useMotionValue(-200);
  const ringX = useSpring(dotX, { stiffness: 120, damping: 14, mass: 0.8 });
  const ringY = useSpring(dotY, { stiffness: 120, damping: 14, mass: 0.8 });
  const scale = useMotionValue(1);
  const springScale = useSpring(scale, { stiffness: 300, damping: 24 });
  const ringOpacity = useMotionValue(0.7);
  const springRingOpacity = useSpring(ringOpacity, { stiffness: 300, damping: 24 });

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
      scale.set(2.5);
      ringOpacity.set(0.5);
    };
    const onLeave = () => {
      scale.set(1);
      ringOpacity.set(0.7);
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
  }, [reduce, isPointer, dotX, dotY, scale, ringOpacity]);

  if (reduce || !isPointer) return null;

  return (
    <>
      {/* Outer ring — spring follow, mix-blend-difference = selalu visible */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-9998 rounded-full border-[1.5px] border-white will-change-transform"
        style={{
          width: 48,
          height: 48,
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          scale: springScale,
          opacity: springRingOpacity,
          mixBlendMode: "difference",
        }}
      />
      {/* Inner dot — exact follow */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-9999 rounded-full bg-white will-change-transform"
        style={{
          width: 10,
          height: 10,
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: "difference",
        }}
      />
    </>
  );
}
