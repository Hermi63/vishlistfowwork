"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, MeshDistortMaterial, Environment } from "@react-three/drei";
import * as THREE from "three";

// 3D подарочная коробка
function GiftBox({ position, scale = 1, color = "#6366f1", speed = 1 }: {
  position: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2 * speed) * 0.1;
    }
  });

  return (
    <Float speed={1.5 * speed} rotationIntensity={0.4} floatIntensity={1.5}>
      <group ref={meshRef} position={position} scale={scale}>
        {/* Коробка */}
        <RoundedBox args={[1, 1, 1]} radius={0.08} smoothness={4} castShadow>
          <meshStandardMaterial
            color={color}
            metalness={0.3}
            roughness={0.2}
            envMapIntensity={1.5}
          />
        </RoundedBox>
        {/* Крышка */}
        <group position={[0, 0.55, 0]}>
          <RoundedBox args={[1.1, 0.15, 1.1]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial
              color={color}
              metalness={0.4}
              roughness={0.15}
              envMapIntensity={1.5}
            />
          </RoundedBox>
        </group>
        {/* Лента вертикальная */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.12, 1.2, 1.05]} />
          <meshStandardMaterial
            color="#f0abfc"
            metalness={0.6}
            roughness={0.1}
            emissive="#d946ef"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Лента горизонтальная */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.05, 1.2, 0.12]} />
          <meshStandardMaterial
            color="#f0abfc"
            metalness={0.6}
            roughness={0.1}
            emissive="#d946ef"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Бантик */}
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#f0abfc"
            metalness={0.5}
            roughness={0.1}
            emissive="#d946ef"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </Float>
  );
}

// Светящаяся сфера
function GlowSphere({ position, color = "#818cf8", size = 0.3 }: {
  position: [number, number, number];
  color?: string;
  size?: number;
}) {
  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={2}>
      <mesh position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
          distort={0.3}
          speed={2}
          roughness={0}
        />
      </mesh>
    </Float>
  );
}

// Плавающие частицы
function Particles({ count = 80 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#818cf8"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Основная 3D-сцена
export function HeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#e0e7ff" />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#c4b5fd" />
        <pointLight position={[0, 4, 0]} intensity={0.8} color="#818cf8" />

        {/* Главный подарок */}
        <GiftBox position={[0, 0, 0]} scale={1.2} color="#6366f1" speed={0.8} />

        {/* Малые подарки */}
        <GiftBox position={[-3.5, 1.5, -2]} scale={0.6} color="#8b5cf6" speed={1.2} />
        <GiftBox position={[3.5, -1, -3]} scale={0.5} color="#a855f7" speed={0.9} />
        <GiftBox position={[-2, -2, -1]} scale={0.45} color="#ec4899" speed={1.1} />
        <GiftBox position={[2.5, 2, -2]} scale={0.5} color="#6366f1" speed={1.3} />

        {/* Светящиеся сферы */}
        <GlowSphere position={[4, 2.5, -1]} color="#818cf8" size={0.25} />
        <GlowSphere position={[-4, -1, -2]} color="#c084fc" size={0.2} />
        <GlowSphere position={[1, 3, -3]} color="#f0abfc" size={0.15} />
        <GlowSphere position={[-1.5, -3, -1]} color="#818cf8" size={0.18} />

        {/* Частицы */}
        <Particles count={100} />

        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
