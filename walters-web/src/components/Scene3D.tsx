import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Character3D } from './Character3D';
import { ImagePlane } from './ImagePlane';
import { BackgroundScene } from './BackgroundScene';
import { Suspense } from 'react';
import type { EnvironmentPreset } from '../types';

interface Scene3DProps {
  character: string;
  color: string;
  imageUrl: string | null;
  background: EnvironmentPreset;
}

export const Scene3D = ({ character, color, imageUrl, background }: Scene3DProps) => {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} />
      
      <Suspense fallback={null}>
        <BackgroundScene type={background} />
        <Character3D character={character} color={color} />
        {imageUrl && <ImagePlane imageUrl={imageUrl} />}
      </Suspense>
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
};
