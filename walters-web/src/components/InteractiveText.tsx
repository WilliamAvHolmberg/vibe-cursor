import { useRef, useState, useEffect } from 'react';
import { Text3D, Center } from '@react-three/drei';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { TextData } from '../types';

interface InteractiveTextProps {
  textData: TextData;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (position: [number, number, number], scale: number) => void;
  orbitControlsRef: React.RefObject<any>;
}

export const InteractiveText = ({ 
  textData, 
  isSelected, 
  onSelect,
  onTransform,
  orbitControlsRef
}: InteractiveTextProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const [mode, setMode] = useState<'translate' | 'scale'>('translate');

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

  return (
    <group
      ref={groupRef}
      position={textData.position}
      scale={textData.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Center>
        <Text3D
          font="/fonts/helvetiker_bold.typeface.json"
          size={0.8}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.02}
          bevelSegments={5}
        >
          {textData.text}
          <meshStandardMaterial 
            color={textData.color}
            metalness={0.3} 
            roughness={0.4}
            emissive={textData.color}
            emissiveIntensity={isSelected ? 0.4 : 0.2}
          />
        </Text3D>
      </Center>
      
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
