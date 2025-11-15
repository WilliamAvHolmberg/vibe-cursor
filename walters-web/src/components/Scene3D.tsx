import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Character3D } from './Character3D';
import { InteractiveImage } from './InteractiveImage';
import { InteractiveText } from './InteractiveText';
import { BackgroundScene } from './BackgroundScene';
import { TypingDisplay } from './TypingDisplay';
import { Suspense, useRef } from 'react';
import type { EnvironmentPreset, ImageData, TextData, Mode } from '../types';

interface Scene3DProps {
  mode: Mode;
  character: string;
  color: string;
  images: ImageData[];
  texts: TextData[];
  background: EnvironmentPreset;
  selectedImageId: string | null;
  selectedTextId: string | null;
  onSelectImage: (id: string | null) => void;
  onSelectText: (id: string | null) => void;
  onUpdateImage: (imageId: string, position: [number, number, number], scale: number) => void;
  onUpdateText: (textId: string, position: [number, number, number], scale: number) => void;
  typedText?: string;
  typedColors?: string[];
}

export const Scene3D = ({ 
  mode,
  character, 
  color, 
  images,
  texts,
  background,
  selectedImageId,
  selectedTextId,
  onSelectImage,
  onSelectText,
  onUpdateImage,
  onUpdateText,
  typedText = '',
  typedColors = []
}: Scene3DProps) => {
  const orbitRef = useRef<any>(null);
  const hasSelection = selectedImageId !== null || selectedTextId !== null;

  return (
    <Canvas 
      camera={{ position: [0, 0, 8], fov: 50 }}
      onClick={() => {
        onSelectImage(null);
        onSelectText(null);
      }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} />
      
      <Suspense fallback={null}>
        <BackgroundScene type={background} />
        
        {mode === 'typing' ? (
          <TypingDisplay text={typedText} colors={typedColors} />
        ) : (
          <>
            <Character3D character={character} color={color} />
            
            {images.map((imageData) => (
              <InteractiveImage
                key={imageData.id}
                imageData={imageData}
                isSelected={selectedImageId === imageData.id}
                onSelect={() => {
                  onSelectImage(imageData.id);
                  onSelectText(null);
                }}
                onTransform={(position, scale) => onUpdateImage(imageData.id, position, scale)}
                orbitControlsRef={orbitRef}
              />
            ))}

            {texts.map((textData) => (
              <InteractiveText
                key={textData.id}
                textData={textData}
                isSelected={selectedTextId === textData.id}
                onSelect={() => {
                  onSelectText(textData.id);
                  onSelectImage(null);
                }}
                onTransform={(position, scale) => onUpdateText(textData.id, position, scale)}
                orbitControlsRef={orbitRef}
              />
            ))}
          </>
        )}
      </Suspense>
      
      <OrbitControls 
        ref={orbitRef}
        enabled={!hasSelection}
        enableZoom={true}
        enablePan={true}
        minDistance={3}
        maxDistance={20}
      />
    </Canvas>
  );
};
