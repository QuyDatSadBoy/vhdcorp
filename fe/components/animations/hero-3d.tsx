"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Stars } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import type { Mesh, Points } from "three";
import * as THREE from "three";

/** Warehouse crate / box */
function Crate({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  scale = 1,
  color = "#1B3A8C",
  speed = 0.2,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = rotation[0] + t * speed * 0.6;
    ref.current.rotation.y = rotation[1] + t * speed;
    ref.current.rotation.z = rotation[2] + t * speed * 0.3;
  });
  return (
    <Float speed={1.2} floatIntensity={0.8} rotationIntensity={0.3}>
      <mesh ref={ref} position={position} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} transparent opacity={0.88} />
      </mesh>
    </Float>
  );
}

/** Plastic pipe / cylinder */
function Pipe({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
  color = "#4FB8E7",
  speed = 0.15,
}: {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = t * speed;
    ref.current.rotation.z = t * speed * 0.5;
  });
  return (
    <Float speed={0.8} floatIntensity={1.0} rotationIntensity={0.4}>
      <mesh ref={ref} position={position} scale={scale}>
        <cylinderGeometry args={[0.25, 0.25, 2.2, 20, 1, true]} />
        <meshStandardMaterial
          color={color}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Float>
  );
}

/** Rubber ring / gasket */
function RubberRing({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  scale = 1,
  color = "#F5A623",
  speed = 0.3,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = rotation[0] + t * speed * 0.7;
    ref.current.rotation.y = rotation[1] + t * speed;
  });
  return (
    <Float speed={1.5} floatIntensity={0.9} rotationIntensity={0.5}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[0.8, 0.22, 16, 60]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.5} transparent opacity={0.9} />
      </mesh>
    </Float>
  );
}

/** Crystal / molecular structure — polymer chain node */
function Crystal({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
  color = "#4FB8E7",
  speed = 0.4,
}: {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = t * speed;
    ref.current.rotation.y = t * speed * 0.8;
    ref.current.rotation.z = t * speed * 0.5;
  });
  return (
    <Float speed={2.0} floatIntensity={1.2} rotationIntensity={0.6}>
      <mesh ref={ref} position={position} scale={scale}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={color} roughness={0.05} metalness={0.9} transparent opacity={0.78} />
      </mesh>
    </Float>
  );
}

/** Tạo mảng vị trí ngẫu nhiên — nằm ngoài component để tránh vi phạm purity rule */
function buildParticlePositions(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  return pos;
}

/** Particle field — floating dust in warehouse */
function ParticleField({ count = 500 }: { count?: number }) {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => buildParticlePositions(count), [count]);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.03;
    ref.current.rotation.x = state.clock.getElapsedTime() * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#4FB8E7" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/** Camera slow pan */
function CameraRig() {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    state.camera.position.x = Math.sin(t * 0.07) * 0.7;
    state.camera.position.y = Math.cos(t * 0.05) * 0.25;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * 3D hero scene — warehouse theme: crates, plastic pipes, rubber rings, crystals.
 * Phù hợp với kho tổng vật tư điện lạnh, cơ điện và sản xuất khuôn mẫu, đúc nhựa VHD Corp.
 */
export function Hero3DScene({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[8, 8, 6]} intensity={2.5} color="#1B3A8C" />
        <pointLight position={[-8, -4, 4]} intensity={2.0} color="#4FB8E7" />
        <pointLight position={[4, -6, -2]} intensity={1.2} color="#F5A623" />
        <directionalLight position={[0, 10, 5]} intensity={0.8} color="#ffffff" />

        <Suspense fallback={null}>
          {/* Warehouse crates — hộp kho hàng */}
          <Crate position={[-2.5, 1.2, 0]} rotation={[0.3, 0.5, 0]} scale={0.9} color="#1B3A8C" speed={0.18} />
          <Crate position={[2.8, -0.8, -1]} rotation={[0.6, 0.2, 0.3]} scale={0.7} color="#2C5FA0" speed={0.22} />
          <Crate position={[-1.0, -1.8, -1.5]} rotation={[0.1, 0.8, 0.2]} scale={0.5} color="#1B3A8C" speed={0.28} />

          {/* Pipes — ống đồng điện lạnh */}
          <Pipe position={[1.5, 1.5, -0.5]} scale={0.85} color="#4FB8E7" speed={0.12} />
          <Pipe position={[-3.2, -0.5, -1]} scale={0.6} color="#7AD0F0" speed={0.16} />

          {/* Rubber rings / gaskets — gioăng cao su */}
          <RubberRing position={[0.5, 0.8, 0.5]} rotation={[0.8, 0, 0.3]} scale={0.9} color="#F5A623" speed={0.22} />
          <RubberRing
            position={[-1.8, -1.2, -0.5]}
            rotation={[0.3, 1.2, 0]}
            scale={0.6}
            color="#E8920F"
            speed={-0.18}
          />
          <RubberRing position={[2.2, 1.8, -1.2]} rotation={[1.0, 0.4, 0.5]} scale={0.5} color="#F5A623" speed={0.3} />

          {/* Crystal / molecular structures — cấu trúc phân tử polymer */}
          <Crystal position={[3.2, 0.5, -0.5]} scale={0.7} color="#4FB8E7" speed={0.35} />
          <Crystal position={[-0.8, 2.0, -1.0]} scale={0.45} color="#86E8FF" speed={0.45} />
          <Crystal position={[0.2, -2.2, -0.8]} scale={0.55} color="#1B3A8C" speed={0.28} />

          {/* Particle field — bụi kho hàng */}
          <ParticleField count={450} />

          {/* Stars in deep background */}
          <Stars radius={70} depth={35} count={700} factor={3} fade speed={0.25} />

          <Environment preset="warehouse" />
          <CameraRig />
        </Suspense>
      </Canvas>
    </div>
  );
}
