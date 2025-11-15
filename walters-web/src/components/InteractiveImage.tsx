import { useRef, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ImageData } from '../types';

interface InteractiveImageProps {
  imageData: ImageData;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (position: [number, number, number], scale: number) => void;
}

export const InteractiveImage = ({ 
  imageData, 
  isSelected, 
  onSelect,
  onTransform 
}: InteractiveImageProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(TextureLoader, imageData.url);
  const [mode, setMode] = useState<'translate' | 'scale'>('translate');

  const handleTransform = () => {
    if (meshRef.current) {
      const position = meshRef.current.position;
      const scale = meshRef.current.scale.x;
      onTransform([position.x, position.y, position.z], scale);
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={imageData.position}
        scale={imageData.scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial 
          map={texture} 
          side={THREE.DoubleSide}
          transparent
          opacity={isSelected ? 1 : 0.9}
        />
      </mesh>
      
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={mode}
          onMouseDown={() => {
            const shift = (window.event as any)?.shiftKey;
            setMode(shift ? 'scale' : 'translate');
          }}
          onObjectChange={handleTransform}
        />
      )}
    </group>
  );
};
