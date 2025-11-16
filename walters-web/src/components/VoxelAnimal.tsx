import { useRef, useState, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimalData } from '../types';
import { animalDefinitions } from '../lib/animalDefinitions';

interface VoxelAnimalProps {
  animalData: AnimalData;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (position: [number, number, number], scale: number) => void;
  orbitControlsRef: React.RefObject<any>;
}

export const VoxelAnimal = ({ 
  animalData, 
  isSelected, 
  onSelect,
  onTransform,
  orbitControlsRef
}: VoxelAnimalProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const [mode, setMode] = useState<'translate' | 'scale'>('translate');

  const definition = animalDefinitions[animalData.type];
  const voxelSize = 0.2;

  useEffect(() => {
    if (transformRef.current && orbitControlsRef.current) {
      const controls = transformRef.current;
      const orbit = orbitControlsRef.current;

      controls.addEventListener('dragging-changed', (event: any) => {
        orbit.enabled = !event.value && !isSelected;
      });
    }
  }, [orbitControlsRef, isSelected]);

  const handleTransform = () => {
    if (groupRef.current) {
      const position = groupRef.current.position;
      const scale = groupRef.current.scale.x;
      onTransform([position.x, position.y, position.z], scale);
    }
  };

  const getColor = (colorType: 'primary' | 'secondary' | 'accent') => {
    return animalData.colorPalette[colorType];
  };

  return (
    <group
      ref={groupRef}
      position={animalData.position}
      scale={animalData.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {definition.blocks.map((block, index) => {
        const [x, y, z] = block.position;
        const adjustedPosition: [number, number, number] = [
          (x - 0.5) * voxelSize,
          (y - 1) * voxelSize,
          (z - 1) * voxelSize
        ];

        return (
          <mesh key={index} position={adjustedPosition}>
            <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
            <meshStandardMaterial 
              color={getColor(block.colorType)}
              emissive={isSelected ? getColor(block.colorType) : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
        );
      })}
      
      {isSelected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
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
