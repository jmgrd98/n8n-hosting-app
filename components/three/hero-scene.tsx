

'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

function MorphBlob() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.2;
    meshRef.current.rotation.y = clock.elapsedTime * 0.15;
    meshRef.current.rotation.z = Math.cos(clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={meshRef} scale={1.8} position={[3.5, -1.5, -2]}>
        <icosahedronGeometry args={[1, 64]} />
        <MeshDistortMaterial
          color="#7c3aed"
          roughness={0.15}
          metalness={0.9}
          distort={0.4}
          speed={2}
          transparent
          opacity={0.75}
        />
      </mesh>
    </Float>
  );
}

function OrbitRing({ radius, speed, color, thickness }: { radius: number; speed: number; color: string; thickness: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.x = Math.PI / 2.5 + Math.sin(clock.elapsedTime * speed * 0.5) * 0.15;
    ringRef.current.rotation.z = clock.elapsedTime * speed;
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, thickness, 16, 100]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.25}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}

function FloatingParticles({ count = 100 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (!geometryRef.current) return;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.03;
    pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.05) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        color="#a78bfa"
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function GlowSphere() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const scale = 2.5 + Math.sin(clock.elapsedTime * 0.8) * 0.15;
    ref.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#7c3aed"
        transparent
        opacity={0.04}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#e9d5ff" />
      <directionalLight position={[-5, -3, -5]} intensity={0.6} color="#818cf8" />
      <pointLight position={[0, 0, 3]} intensity={1} color="#c084fc" />

      <MorphBlob />
      <group position={[3.5, -1, -2]}>
        <GlowSphere />
        <OrbitRing radius={2.5} speed={0.2} color="#a78bfa" thickness={0.012} />
        <OrbitRing radius={3.0} speed={-0.15} color="#818cf8" thickness={0.008} />
      </group>
      <FloatingParticles count={100} />
    </>
  );
}

export default function HeroScene() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%',
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
