'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function FloatingTorus({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * speed * 0.3;
    ref.current.rotation.y = clock.elapsedTime * speed * 0.5;
  });

  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref} position={position}>
        <torusKnotGeometry args={[0.6, 0.2, 64, 16, 2, 3]} />
        <meshStandardMaterial
          color={color}
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>
    </Float>
  );
}

function FloatingOcta({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * speed * 0.2;
    ref.current.rotation.z = clock.elapsedTime * speed * 0.3;
  });

  return (
    <Float speed={speed * 0.8} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={ref} position={position}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={color}
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 3, 5]} intensity={0.8} color="#e9d5ff" />

      <FloatingTorus position={[-5, 1, -3]} color="#7c3aed" speed={1.2} />
      <FloatingTorus position={[5, -1, -4]} color="#818cf8" speed={0.8} />
      <FloatingOcta position={[-3, -2, -2]} color="#a78bfa" speed={1.0} />
      <FloatingOcta position={[4, 2, -3]} color="#c084fc" speed={1.4} />
      <FloatingOcta position={[0, 3, -5]} color="#7c3aed" speed={0.6} />
    </>
  );
}

export default function FloatingShapes() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
