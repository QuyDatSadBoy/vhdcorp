"use client";

/**
 * CSS-only floating particles — nhẹ hơn Three.js, render trên cả mobile.
 * Tạo 20 chấm tròn nhỏ float random, tạo cảm giác depth.
 */
export function ParticlesCSS({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full opacity-0 animate-[particle-float_var(--dur)_var(--delay)_infinite_ease-in-out]"
          style={
            {
              "--dur": `${8 + (i % 7) * 2.5}s`,
              "--delay": `${(i * 0.7) % 5}s`,
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 10) % 100}%`,
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              background:
                i % 3 === 0
                  ? "var(--vhd-color-highlight)"
                  : i % 3 === 1
                    ? "var(--vhd-color-accent)"
                    : "var(--vhd-color-primary)",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
