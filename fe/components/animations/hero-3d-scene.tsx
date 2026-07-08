"use client";

/**
 * Hero3DScene — R3F floating glass primitives, Shopify-Editions inspired.
 *
 * Lý do tồn tại: Hero của Shopify Editions Winter 2026 dùng các 3D model
 * (skateboard, túi mua sắm, sách...) layered trên Renaissance painting để tạo
 * cảm giác sang trọng, có chiều sâu thật. Vì không có asset GLB riêng, ta build
 * scene tương đương bằng các primitive thuỷ tinh (torus, capsule, dodecahedron)
 * mang tone NAVY + CYAN của VHD, với:
 * - Environment HDR preset → reflection chân thực
 * - <Float> → trôi nổi mượt mà
 * - Mouse parallax + auto rotate
 * - MeshTransmissionMaterial → hiệu ứng kính trong, khúc xạ
 *
 * Mounted lazy, ssr:false trong hero. Pause khi reduced-motion / out-of-view.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshTransmissionMaterial } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

function ParallaxRig({ strength = 0.4 }: { strength?: number }) {
  const rigRef = useRef<THREE.Group | null>(null);
  const target = useRef(new THREE.Vector2(0, 0));
  const current = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.set((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame(() => {
    current.current.lerp(target.current, 0.045);
    if (!rigRef.current) return;

    rigRef.current.position.x = current.current.x * strength;
    rigRef.current.position.y = -current.current.y * strength;
    rigRef.current.rotation.y = current.current.x * 0.12;
    rigRef.current.rotation.x = current.current.y * 0.08;
  });

  return <group ref={rigRef} />;
}

function GlassTorus({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: THREE.Color;
  scale?: number;
}) {
  return (
    <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.2} floatingRange={[-0.15, 0.15]}>
      <mesh position={position} scale={scale} castShadow receiveShadow>
        <torusGeometry args={[0.8, 0.28, 64, 128]} />
        <MeshTransmissionMaterial
          color={color}
          thickness={0.6}
          roughness={0.05}
          transmission={1}
          ior={1.45}
          chromaticAberration={0.06}
          backside
          backsideThickness={0.4}
          anisotropy={0.3}
          distortion={0.25}
          distortionScale={0.4}
          temporalDistortion={0.15}
        />
      </mesh>
    </Float>
  );
}

function GlassCapsule({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: THREE.Color;
  scale?: number;
}) {
  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={1.5} floatingRange={[-0.2, 0.2]}>
      <mesh position={position} scale={scale} rotation={[0.3, 0.4, 0.6]} castShadow>
        <capsuleGeometry args={[0.35, 1.4, 16, 32]} />
        <MeshTransmissionMaterial
          color={color}
          thickness={0.5}
          roughness={0.08}
          transmission={1}
          ior={1.4}
          chromaticAberration={0.05}
          backside
        />
      </mesh>
    </Float>
  );
}

function MetalDodec({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: THREE.Color;
  scale?: number;
}) {
  return (
    <Float speed={0.9} rotationIntensity={1.2} floatIntensity={0.9} floatingRange={[-0.1, 0.1]}>
      <mesh position={position} scale={scale} castShadow>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={color} metalness={0.95} roughness={0.18} envMapIntensity={1.4} />
      </mesh>
    </Float>
  );
}

function Scene() {
  const colors = useMemo(
    () => ({
      cyan: readCssColor("--vhd-color-accent", "#4FB8E7"),
      navy: readCssColor("--vhd-color-primary", "#1B3A8C"),
      warm: readCssColor("--vhd-color-highlight", "#F5A623"),
    }),
    []
  );

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-4, -2, 3]} intensity={0.5} color="#4FB8E7" />

      <Environment preset="city" environmentIntensity={0.8} />

      <ParallaxRig strength={0.5} />

      {/* Bố cục bên phải hero — text nằm bên trái, 3D nằm bên phải */}
      <group position={[1.4, 0.0, 0]}>
        <GlassTorus position={[0, 0.4, 0]} color={colors.cyan} scale={1.1} />
        <GlassCapsule position={[-0.6, -0.8, 0.3]} color={colors.navy} scale={1.0} />
        <MetalDodec position={[1.2, -0.3, -0.5]} color={colors.warm} scale={0.85} />
      </group>
    </>
  );
}

export function Hero3DScene({ className }: { className?: string }) {
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
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 5], fov: 38, near: 0.1, far: 50 }}
          frameloop={visible ? "always" : "never"}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
