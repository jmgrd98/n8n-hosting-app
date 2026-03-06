'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ConstellationPoints({ count = 50 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    return pos;
  }, [count]);

  // Build connections between nearby points
  const linePositions = useMemo(() => {
    const lines: number[] = [];
    const threshold = 3.5;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < threshold) {
          lines.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2],
          );
        }
      }
    }
    return new Float32Array(lines);
  }, [positions, count]);

  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }, [positions]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.03) * 0.05;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = clock.elapsedTime * 0.02;
      linesRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.03) * 0.05;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry ref={geoRef} />
        <pointsMaterial
          color="#a78bfa"
          size={0.06}
          transparent
          opacity={0.5}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

export default function ParticleConstellation() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <ConstellationPoints count={60} />
      </Canvas>
    </div>
  );
}
