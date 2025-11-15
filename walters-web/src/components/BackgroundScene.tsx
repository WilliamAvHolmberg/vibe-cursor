import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Cloud, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { EnvironmentPreset } from '../types';

interface BackgroundSceneProps {
  type: EnvironmentPreset;
}

export const BackgroundScene = ({ type }: BackgroundSceneProps) => {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (waterRef.current && type === 'ocean') {
      waterRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  switch (type) {
    case 'ocean':
      return (
        <>
          <Sky sunPosition={[100, 20, 100]} />
          <mesh
            ref={waterRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -3, 0]}
            receiveShadow
          >
            <planeGeometry args={[1000, 1000, 50, 50]} />
            <meshStandardMaterial
              color="#1e90ff"
              metalness={0.9}
              roughness={0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
        </>
      );

    case 'space':
      return (
        <>
          <color attach="background" args={['#000010']} />
          <Stars radius={100} depth={50} count={10000} factor={6} saturation={0} fade speed={2} />
          <mesh position={[8, 3, -10]}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshStandardMaterial color="#ff6b6b" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-8, -2, -15]}>
            <sphereGeometry args={[1.5, 32, 32]} />
            <meshStandardMaterial color="#4ecdc4" emissive="#00ffff" emissiveIntensity={0.3} />
          </mesh>
        </>
      );

    case 'sunset':
      return (
        <>
          <Sky
            distance={450000}
            sunPosition={[0, 1, 0]}
            inclination={0.6}
            azimuth={0.25}
          />
          <fog attach="fog" args={['#ff6b6b', 10, 50]} />
        </>
      );

    case 'forest':
      return (
        <>
          <Sky sunPosition={[100, 50, 100]} />
          <fog attach="fog" args={['#228B22', 15, 40]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
            <planeGeometry args={[1000, 1000]} />
            <meshStandardMaterial color="#2d5016" />
          </mesh>
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            return (
              <mesh key={i} position={[x, -1, z]}>
                <cylinderGeometry args={[0.5, 0.7, 4, 8]} />
                <meshStandardMaterial color="#4a3020" />
                <mesh position={[0, 3, 0]}>
                  <coneGeometry args={[2, 4, 8]} />
                  <meshStandardMaterial color="#228B22" />
                </mesh>
              </mesh>
            );
          })}
        </>
      );

    case 'night':
      return (
        <>
          <color attach="background" args={['#0a0a1a']} />
          <Stars radius={100} depth={50} count={7000} factor={5} saturation={0} fade speed={1} />
          <Sky
            distance={450000}
            sunPosition={[0, -1, 0]}
            inclination={0.6}
            azimuth={0.25}
          />
          <mesh position={[10, 10, -20]}>
            <sphereGeometry args={[3, 32, 32]} />
            <meshStandardMaterial color="#ffffcc" emissive="#ffff99" emissiveIntensity={1} />
          </mesh>
          <fog attach="fog" args={['#0a0a1a', 10, 40]} />
        </>
      );

    case 'clouds':
      return (
        <>
          <Sky sunPosition={[100, 100, 100]} />
          <Cloud position={[-10, 5, -10]} speed={0.2} opacity={0.8} />
          <Cloud position={[10, 6, -15]} speed={0.3} opacity={0.6} />
          <Cloud position={[0, 8, -20]} speed={0.25} opacity={0.7} />
          <Cloud position={[-8, 4, -8]} speed={0.15} opacity={0.9} />
        </>
      );

    case 'rainbow':
      return (
        <>
          <Sky sunPosition={[50, 20, 100]} turbidity={10} rayleigh={2} />
          <fog attach="fog" args={['#87CEEB', 20, 50]} />
          {['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'].map(
            (color, i) => (
              <mesh
                key={i}
                position={[0, -3, -30]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <torusGeometry args={[25 + i * 1.5, 0.5, 16, 100, Math.PI]} />
                <meshStandardMaterial
                  color={color}
                  transparent
                  opacity={0.6}
                  emissive={color}
                  emissiveIntensity={0.3}
                />
              </mesh>
            )
          )}
        </>
      );

    case 'stars':
      return (
        <>
          <color attach="background" args={['#000428']} />
          <Stars radius={100} depth={50} count={8000} factor={5} saturation={1} fade speed={1} />
          <Stars radius={50} depth={25} count={5000} factor={3} saturation={0.5} fade speed={2} />
        </>
      );

    default:
      return <Sky sunPosition={[100, 20, 100]} />;
  }
};
