import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, Box, Icosahedron, MeshDistortMaterial, Float } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Particles({ count = 800 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    // slow pulsate
    const t = clock.getElapsedTime() * 0.2;
    pointsRef.current.rotation.y = t * 0.12;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute attachObject={['attributes', 'position']} count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors={false}
        color={new THREE.Color('#9be7ff')}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function FloatingShapes() {
    const group = useRef<THREE.Group>(null!);
    const { mouse } = useThree();

    useFrame((state, delta) => {
      if (!group.current) return;
      // parallax from mouse (-1..1)
      const mx = state.mouse.x;
      const my = state.mouse.y;
      group.current.rotation.y += delta * 0.06;
      group.current.position.x += (mx * 2 - group.current.position.x) * delta * 2;
      group.current.position.y += (my * -2 - group.current.position.y) * delta * 2;
    });

    return (
        <group ref={group}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            <Float speed={2} rotationIntensity={1} floatIntensity={2}>
                <Sphere args={[1, 64, 64]} position={[-3, 1, -2]}>
                    <MeshDistortMaterial
                        color="#3b82f6"
                        attach="material"
                        distort={0.45}
                        speed={1.5}
                        roughness={0.2}
                        metalness={0.6}
                        envMapIntensity={1}
                        clearcoat={0.8}
                        clearcoatRoughness={0.1}
                    />
                </Sphere>
            </Float>

            <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.2}>
                <Box args={[1.6, 1.6, 1.6]} position={[4, -1, -3]}>
                    <meshStandardMaterial color="#8b5cf6" roughness={0.08} metalness={0.6} />
                </Box>
            </Float>

            <Float speed={2.5} rotationIntensity={2} floatIntensity={1}>
                <Icosahedron args={[1.2, 0]} position={[-1, -3, -5]}>
                    <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.2} />
                </Icosahedron>
            </Float>

            <Float speed={1.8} rotationIntensity={0.5} floatIntensity={2.5}>
                <Sphere args={[0.8, 32, 32]} position={[2, 3, -4]}>
                    <meshStandardMaterial color="#10b981" roughness={0.1} metalness={0.9} />
                </Sphere>
            </Float>

            <Particles count={900} />
        </group>
    );
}

export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 bg-background overflow-hidden pointer-events-none">
            {/* Soft animated gradient blobs behind the canvas */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" />
            <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-purple-500/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000" />
            <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000" />

            {/* 3D Canvas Context */}
            <div className="absolute inset-0 opacity-40">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <FloatingShapes />
                </Canvas>
            </div>
        </div>
    );
}
