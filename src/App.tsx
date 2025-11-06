import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, Environment } from '@react-three/drei'
import { useRef } from 'react'
import { Mesh } from 'three'
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

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Sky sunPosition={[100, 20, 100]} />
        <Ocean />
        <OrbitControls />
        <Environment preset="sunset" />
      </Canvas>
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '20px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }}>
        🌊 Ocean Scene via Cloudflare Tunnel 🌊
      </div>
    </div>
  )
}

export default App
