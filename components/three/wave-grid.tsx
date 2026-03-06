'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function WavePlane() {
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  const segments = 60;

  const originalPositions = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 20, segments, segments);
    return new Float32Array(geo.attributes.position.array);
  }, []);

  useFrame(({ clock }) => {
    if (!geometryRef.current) return;
    const positions = geometryRef.current.attributes.position;
    const time = clock.elapsedTime;

    for (let i = 0; i < positions.count; i++) {
      const x = originalPositions[i * 3];
      const y = originalPositions[i * 3 + 1];
      const wave1 = Math.sin(x * 0.5 + time * 0.6) * 0.3;
      const wave2 = Math.cos(y * 0.4 + time * 0.4) * 0.2;
      const wave3 = Math.sin((x + y) * 0.3 + time * 0.5) * 0.15;
      positions.setZ(i, wave1 + wave2 + wave3);
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh rotation={[-Math.PI / 3, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry ref={geometryRef} args={[20, 20, segments, segments]} />
      <meshBasicMaterial
        color="#7c3aed"
        wireframe
        transparent
        opacity={0.08}
      />
    </mesh>
  );
}

export default function WaveGrid() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 5, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <WavePlane />
      </Canvas>
    </div>
  );
}
