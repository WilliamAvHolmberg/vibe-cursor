import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

interface TypingDisplayProps {
  text: string;
  colors: string[];
}

export const TypingDisplay = ({ text, colors }: TypingDisplayProps) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  if (!text) {
    return (
      <Center>
        <Text3D
          font="/fonts/helvetiker_bold.typeface.json"
          size={1.5}
          height={0.3}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.02}
          bevelSegments={5}
        >
          START TYPING...
          <meshStandardMaterial color="#cccccc" metalness={0.3} roughness={0.4} opacity={0.5} transparent />
        </Text3D>
      </Center>
    );
  }

  const letters = text.split('');
  const spacing = 2;
  const startX = -(letters.length - 1) * spacing / 2;

  return (
    <group ref={groupRef}>
      {letters.map((letter, index) => {
        const color = colors[index % colors.length];
        const posX = startX + index * spacing;
        
        return (
          <group key={`${letter}-${index}`} position={[posX, 0, 0]}>
            <Center>
              <Text3D
                font="/fonts/helvetiker_bold.typeface.json"
                size={2}
                height={0.4}
                curveSegments={12}
                bevelEnabled
                bevelThickness={0.1}
                bevelSize={0.05}
                bevelSegments={5}
              >
                {letter}
                <meshStandardMaterial 
                  color={color} 
                  metalness={0.3} 
                  roughness={0.4}
                  emissive={color}
                  emissiveIntensity={0.2}
                />
              </Text3D>
            </Center>
          </group>
        );
      })}
    </group>
  );
};
