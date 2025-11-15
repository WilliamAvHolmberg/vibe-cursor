import { useRef } from 'react';
import { Text3D, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Character3DProps {
  character: string;
  color: string;
}

export const Character3D = ({ character, color }: Character3DProps) => {
  const textRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (textRef.current) {
      textRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      textRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.3;
    }
  });

  return (
    <Center>
      <Text3D
        ref={textRef}
        font="/fonts/helvetiker_bold.typeface.json"
        size={3}
        height={0.5}
        curveSegments={12}
        bevelEnabled
        bevelThickness={0.1}
        bevelSize={0.05}
        bevelOffset={0}
        bevelSegments={5}
      >
        {character}
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Text3D>
    </Center>
  );
};
