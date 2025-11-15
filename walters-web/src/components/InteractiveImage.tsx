import { useRef, useState, useEffect } from 'react';
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
  orbitControlsRef: React.RefObject<any>;
}

export const InteractiveImage = ({ 
  imageData, 
  isSelected, 
  onSelect,
  onTransform,
  orbitControlsRef
}: InteractiveImageProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);
  const texture = useLoader(TextureLoader, imageData.url);
  const [mode, setMode] = useState<'translate' | 'scale'>('translate');

  useEffect(() => {
    if (transformRef.current && orbitControlsRef.current) {
      const controls = transformRef.current;
      const orbit = orbitControlsRef.current;

      const onDragStart = () => {
        orbit.enabled = false;
      };

      const onDragEnd = () => {
        orbit.enabled = false; // Keep disabled while selected
      };

      controls.addEventListener('dragging-changed', (event: any) => {
        if (!event.value) {
          onDragEnd();
        } else {
          onDragStart();
        }
      });
    }
  }, [orbitControlsRef]);

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
          ref={transformRef}
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
