import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, Environment } from '@react-three/drei'
import { useRef } from 'react'
import { Mesh, Group } from 'three'
import { useFrame } from '@react-three/fiber'
import './App.css'

function Ocean() {
  const meshRef = useRef<Mesh>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(time * 0.5) * 0.1
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[100, 100, 50, 50]} />
      <meshStandardMaterial 
        color="#006994"
        roughness={0.3}
        metalness={0.8}
        wireframe={false}
      />
    </mesh>
  )
}

function SailingBoat() {
  const boatRef = useRef<Group>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (boatRef.current) {
      boatRef.current.position.x = Math.sin(time * 0.3) * 8
      boatRef.current.position.z = Math.cos(time * 0.3) * 8
      boatRef.current.position.y = Math.sin(time * 2) * 0.2 + 0.5
      boatRef.current.rotation.y = time * 0.3 + Math.PI / 2
      boatRef.current.rotation.z = Math.sin(time * 2) * 0.1
    }
  })

  return (
    <group ref={boatRef}>
      {/* Hull */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.4, 2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Mast */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      
      {/* Main Sail */}
      <mesh position={[0.5, 1.5, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.02, 2, 1.5]} />
        <meshStandardMaterial color="#f0f0f0" side={2} />
      </mesh>
      
      {/* Front Sail */}
      <mesh position={[0.3, 1.2, 0.8]} rotation={[0, 0.3, -0.1]}>
        <boxGeometry args={[0.02, 1.5, 0.8]} />
        <meshStandardMaterial color="#e8e8e8" side={2} />
      </mesh>
    </group>
  )
}

function Dino() {
  const dinoRef = useRef<Group>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (dinoRef.current) {
      dinoRef.current.position.y = Math.sin(time * 3) * 0.15 + 1.5
      dinoRef.current.rotation.y = Math.sin(time * 0.5) * 0.3
    }
  })

  return (
    <group ref={dinoRef} position={[6, 0, 0]}>
      {/* Body */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2, 1.5, 3]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.5, 1.8]}>
        <boxGeometry args={[1, 1, 1.2]} />
        <meshStandardMaterial color="#98FB98" />
      </mesh>
      
      {/* Snout */}
      <mesh position={[0, 1.3, 2.7]}>
        <boxGeometry args={[0.7, 0.6, 0.8]} />
        <meshStandardMaterial color="#98FB98" />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[0.3, 1.7, 2.3]}>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[-0.3, 1.7, 2.3]}>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 2.5, 0.5]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 2]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      
      {/* Long Neck Extension */}
      <mesh position={[0, 3.8, 1.2]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 1.5]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      
      {/* Tail */}
      <mesh position={[0, 0.8, -1.8]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
      
      {/* Legs */}
      <mesh position={[0.5, 0.4, 0.8]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8]} />
        <meshStandardMaterial color="#7CCD7C" />
      </mesh>
      <mesh position={[-0.5, 0.4, 0.8]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8]} />
        <meshStandardMaterial color="#7CCD7C" />
      </mesh>
      <mesh position={[0.5, 0.4, -0.8]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8]} />
        <meshStandardMaterial color="#7CCD7C" />
      </mesh>
      <mesh position={[-0.5, 0.4, -0.8]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8]} />
        <meshStandardMaterial color="#7CCD7C" />
      </mesh>
      
      {/* Spikes on back */}
      <mesh position={[0, 1.8, 0.5]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 4]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[0, 1.8, -0.3]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 4]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[0, 1.8, -1.1]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 4]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  )
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 8, 15], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Sky sunPosition={[100, 20, 100]} />
        <Ocean />
        <SailingBoat />
        <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
          <SailingBoat />
        </group>
        <group position={[-8, 0, -8]} scale={2.5}>
          <SailingBoat />
        </group>
        <Dino />
        <OrbitControls />
        <Environment preset="sunset" />
      </Canvas>
    </div>
  )
}

export default App
