"use client";

/**
 * AuroraShaderCanvas — WebGL fullscreen fragment shader.
 *
 * Phiên bản v2 — mesh-gradient mượt, lấy cảm hứng từ Shopify Editions
 * Winter 2026: 4 "metaball" màu lớn trôi chậm, mix smoothmin, có bloom +
 * grain + vignette. Palette ràng buộc trong tone NAVY + CYAN của logo VHD,
 * accent ấm rất nhẹ ở peak để tạo chiều sâu — không loang lổ kiểu sơn dầu.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function readCssColor(varName: string, fallback: string): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  try {
    return new THREE.Color(raw || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Fragment shader:
 * - 4 metaball positions, slow Lissajous orbits
 * - Field = sum of soft Gaussian falloff for each ball
 * - Colour = palette mapped from field; apex gets warm halo bloom
 * - Subtle vignette + grain
 */
const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;       // 0..1
  uniform float uIntensity;
  uniform vec3  uBg;          // base navy
  uniform vec3  uMid;         // mid blue (primary)
  uniform vec3  uHi;           // bright cyan (accent)
  uniform vec3  uWarm;         // warm halo (highlight) — used very sparingly

  // Hash + grain
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Soft Gaussian "metaball" radial falloff.
  float ball(vec2 p, vec2 c, float r){
    float d = length(p - c) / r;
    return exp(-d * d * 1.6);
  }

  vec3 toneMap(vec3 x){
    // Filmic tone curve — keeps highlights gentle.
    return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  }

  void main(){
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

    float t = uTime * 0.05;

    // 4 metaballs orbiting slowly — Shopify-like "drifting blobs".
    vec2 c0 = vec2(cos(t * 0.8) * 0.55 - 0.10, sin(t * 0.6) * 0.30 + 0.05);
    vec2 c1 = vec2(cos(t * 0.5 + 1.7) * 0.65 + 0.15, sin(t * 0.9 + 0.4) * 0.28 - 0.08);
    vec2 c2 = vec2(cos(t * 0.7 + 3.1) * 0.45 - 0.05, sin(t * 0.4 + 2.2) * 0.35 + 0.10);
    vec2 c3 = vec2(cos(t * 0.6 + 4.6) * 0.50 + 0.05, sin(t * 0.7 + 5.0) * 0.32 - 0.05);

    // Mouse pulls a 5th, soft attractor.
    vec2 m  = (uMouse - 0.5) * vec2(aspect, 1.0);
    float fM  = ball(p, m,  0.55) * 0.55;

    float f0 = ball(p, c0, 0.85);
    float f1 = ball(p, c1, 0.95);
    float f2 = ball(p, c2, 0.75);
    float f3 = ball(p, c3, 0.80);

    // Total field — clamp to 0..1.
    float field = clamp(f0 + 0.85 * f1 + 0.65 * f2 + 0.7 * f3 + fM, 0.0, 2.4) * 0.55;

    // Two-tone primary palette: navy → mid-blue → cyan
    vec3 col = uBg;
    col = mix(col, uMid, smoothstep(0.10, 0.55, field));
    col = mix(col, uHi,  smoothstep(0.55, 0.95, field));

    // Tiny warm halo only at brightest crests — sense of "sunlight on water".
    float halo = smoothstep(0.78, 1.05, field);
    col = mix(col, mix(col, uWarm, 0.45), halo * 0.35);

    // Bloom-style additive glow at peaks.
    col += uHi * pow(halo, 2.0) * 0.18 * uIntensity;

    // Vignette — gentle darken at edges to focus eye on center.
    float vig = smoothstep(1.25, 0.30, length(p));
    col = mix(uBg, col, mix(0.65, 1.0, vig));

    // Grain — break colour banding.
    float g = hash(gl_FragCoord.xy + uTime * 60.0) - 0.5;
    col += g * 0.018;

    col = toneMap(col);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function AuroraQuad({ intensity }: { intensity: number }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const { size, gl } = useThree();
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const target = useRef(new THREE.Vector2(0.5, 0.5));

  // Brand colour pinning — đảm bảo tone xanh chủ đạo của VHD,
  // accent cam dùng RẤT ít chỉ ở apex.
  const colors = useMemo(() => {
    const primary = readCssColor("--vhd-color-primary", "#1B3A8C"); // navy
    const accent = readCssColor("--vhd-color-accent", "#4FB8E7"); // cyan
    const highlight = readCssColor("--vhd-color-highlight", "#F5A623"); // warm
    return {
      bg: new THREE.Color("#040A18"),
      mid: primary,
      hi: accent,
      warm: highlight,
    };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uIntensity: { value: intensity },
      uBg: { value: colors.bg },
      uMid: { value: colors.mid },
      uHi: { value: colors.hi },
      uWarm: { value: colors.warm },
    }),
    [colors, intensity, size.width, size.height]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uIntensity.value = intensity;
  }, [intensity]);

  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uResolution.value.set(size.width, size.height);
  }, [size.width, size.height]);

  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }, [gl]);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    mouse.current.lerp(target.current, 0.05);
    matRef.current.uniforms.uMouse.value.copy(mouse.current);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
}

export function AuroraShaderCanvas({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => setEnabled(!mq.matches);
    upd();
    mq.addEventListener?.("change", upd);
    return () => mq.removeEventListener?.("change", upd);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => setVisible(e.isIntersecting)), {
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className ?? ""}`}>
      {enabled && (
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
          frameloop={visible ? "always" : "never"}
          style={{ width: "100%", height: "100%" }}
        >
          <AuroraQuad intensity={intensity} />
        </Canvas>
      )}
    </div>
  );
}
