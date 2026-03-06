'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Globe() {
  const wireRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (wireRef.current) {
      wireRef.current.rotation.y = clock.elapsedTime * 0.08;
      wireRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.05) * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -clock.elapsedTime * 0.05;
      innerRef.current.rotation.z = clock.elapsedTime * 0.03;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer wireframe sphere */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.5, 24, 24]} />
        <meshBasicMaterial
          color="#a78bfa"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Inner wireframe icosahedron */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.8, 1]} />
        <meshBasicMaterial
          color="#7c3aed"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>

      {/* Center glow */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  );
}

function OrbitDots() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.12;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.15;
  });

  const dots = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const r = 3;
    return [Math.cos(angle) * r, Math.sin(angle) * r * 0.4, Math.sin(angle) * r] as [number, number, number];
  });

  return (
    <group ref={groupRef}>
      {dots.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function WireframeGlobe() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Globe />
        <OrbitDots />
      </Canvas>
    </div>
  );
}
