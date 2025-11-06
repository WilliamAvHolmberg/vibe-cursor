import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, Environment } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
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

function CruiseShip() {
  const shipRef = useRef<Group>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (shipRef.current) {
      shipRef.current.position.x = Math.sin(time * 0.15) * 20
      shipRef.current.position.z = Math.cos(time * 0.15) * 20
      shipRef.current.position.y = Math.sin(time * 1.2) * 0.3 + 3
      shipRef.current.rotation.y = time * 0.15 + Math.PI / 2
      shipRef.current.rotation.z = Math.sin(time * 1.2) * 0.03
    }
  })

  return (
    <group ref={shipRef} scale={10}>
      {/* Main Hull - Bottom */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[3, 1.2, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Hull - Upper Part */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2.8, 0.8, 7.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Hull Stripe - Red */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.85, 0.15, 7.6]} />
        <meshStandardMaterial color="#FF4444" />
      </mesh>
      
      {/* Deck 1 - Main Promenade */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2.6, 0.7, 6.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Deck 2 */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.5, 0.6, 6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Deck 3 */}
      <mesh position={[0, 2.1, -0.3]}>
        <boxGeometry args={[2.4, 0.5, 5.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Deck 4 */}
      <mesh position={[0, 2.6, -0.5]}>
        <boxGeometry args={[2.3, 0.5, 5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Deck 5 - Upper */}
      <mesh position={[0, 3.1, -0.8]}>
        <boxGeometry args={[2.2, 0.4, 4.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Deck 6 - Sky Deck */}
      <mesh position={[0, 3.5, -1]}>
        <boxGeometry args={[2.1, 0.4, 4]} />
        <meshStandardMaterial color="#F8F8F8" />
      </mesh>
      
      {/* Pool Deck */}
      <mesh position={[0, 3.75, 0.5]}>
        <boxGeometry args={[1.8, 0.1, 2]} />
        <meshStandardMaterial color="#E0E0E0" />
      </mesh>
      
      {/* Pool */}
      <mesh position={[0, 3.8, 0.5]}>
        <boxGeometry args={[1.2, 0.15, 1.2]} />
        <meshStandardMaterial color="#4ECDC4" transparent opacity={0.7} />
      </mesh>
      
      {/* Bridge */}
      <mesh position={[0, 4.2, -1.5]}>
        <boxGeometry args={[1.6, 0.6, 1.5]} />
        <meshStandardMaterial color="#2E4057" />
      </mesh>
      
      {/* Bridge Windows */}
      {[...Array(10)].map((_, i) => (
        <mesh key={`bridge-${i}`} position={[-0.75 + i * 0.17, 4.2, -0.7]}>
          <boxGeometry args={[0.12, 0.35, 0.02]} />
          <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Radar Mast */}
      <mesh position={[0, 5.2, -1.5]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5]} />
        <meshStandardMaterial color="#CCCCCC" metalness={0.8} />
      </mesh>
      
      {/* Radar Dome */}
      <mesh position={[0, 5.9, -1.5]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Antenna */}
      <mesh position={[0, 6.5, -1.5]}>
        <cylinderGeometry args={[0.03, 0.03, 1]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Smokestacks - Large */}
      <mesh position={[0.6, 4.5, -0.5]}>
        <cylinderGeometry args={[0.3, 0.35, 1.8]} />
        <meshStandardMaterial color="#FF6B6B" />
      </mesh>
      <mesh position={[-0.6, 4.5, -0.5]}>
        <cylinderGeometry args={[0.3, 0.35, 1.8]} />
        <meshStandardMaterial color="#FF6B6B" />
      </mesh>
      
      {/* Smokestack Tops */}
      <mesh position={[0.6, 5.4, -0.5]}>
        <cylinderGeometry args={[0.32, 0.3, 0.2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[-0.6, 5.4, -0.5]}>
        <cylinderGeometry args={[0.32, 0.3, 0.2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Windows - Deck 1 (Right Side) */}
      {[...Array(25)].map((_, i) => (
        <mesh key={`d1-r-${i}`} position={[1.35, 1, -3 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.35, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 1 (Left Side) */}
      {[...Array(25)].map((_, i) => (
        <mesh key={`d1-l-${i}`} position={[-1.35, 1, -3 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.35, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 2 (Right Side) */}
      {[...Array(24)].map((_, i) => (
        <mesh key={`d2-r-${i}`} position={[1.3, 1.6, -2.8 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.35, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 2 (Left Side) */}
      {[...Array(24)].map((_, i) => (
        <mesh key={`d2-l-${i}`} position={[-1.3, 1.6, -2.8 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.35, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 3 (Right Side) */}
      {[...Array(22)].map((_, i) => (
        <mesh key={`d3-r-${i}`} position={[1.25, 2.1, -2.5 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.3, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 3 (Left Side) */}
      {[...Array(22)].map((_, i) => (
        <mesh key={`d3-l-${i}`} position={[-1.25, 2.1, -2.5 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.3, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 4 (Right Side) */}
      {[...Array(20)].map((_, i) => (
        <mesh key={`d4-r-${i}`} position={[1.2, 2.6, -2.2 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.3, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Windows - Deck 4 (Left Side) */}
      {[...Array(20)].map((_, i) => (
        <mesh key={`d4-l-${i}`} position={[-1.2, 2.6, -2.2 + i * 0.25]}>
          <boxGeometry args={[0.05, 0.3, 0.18]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.6} />
        </mesh>
      ))}
      
      {/* Balconies - Deck 5 */}
      {[...Array(18)].map((_, i) => (
        <group key={`balcony-r-${i}`}>
          <mesh position={[1.35, 3.1, -2 + i * 0.25]}>
            <boxGeometry args={[0.2, 0.02, 0.2]} />
            <meshStandardMaterial color="#D3D3D3" />
          </mesh>
          <mesh position={[1.35, 3.2, -2 + i * 0.25]}>
            <boxGeometry args={[0.02, 0.25, 0.2]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.3} />
          </mesh>
        </group>
      ))}
      
      {/* Lifeboats - Right Side */}
      {[...Array(6)].map((_, i) => (
        <mesh key={`lifeboat-r-${i}`} position={[1.6, 2.3, -2.5 + i * 1]}>
          <boxGeometry args={[0.25, 0.2, 0.8]} />
          <meshStandardMaterial color="#FF8C00" />
        </mesh>
      ))}
      
      {/* Lifeboats - Left Side */}
      {[...Array(6)].map((_, i) => (
        <mesh key={`lifeboat-l-${i}`} position={[-1.6, 2.3, -2.5 + i * 1]}>
          <boxGeometry args={[0.25, 0.2, 0.8]} />
          <meshStandardMaterial color="#FF8C00" />
        </mesh>
      ))}
      
      {/* Bow (Front) - Pointed */}
      <mesh position={[0, 0.3, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1.4, 1.5, 4]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Bow Lower */}
      <mesh position={[0, -0.5, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1.5, 1.2, 4]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Stern (Back) */}
      <mesh position={[0, 0.5, -4.2]}>
        <boxGeometry args={[2.7, 1.8, 0.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Ship Name Plate */}
      <mesh position={[0, 0.8, 4.1]}>
        <boxGeometry args={[1, 0.2, 0.05]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Anchor - Right */}
      <mesh position={[1, -0.3, 3.2]}>
        <boxGeometry args={[0.15, 0.4, 0.1]} />
        <meshStandardMaterial color="#4A4A4A" metalness={0.9} />
      </mesh>
      
      {/* Anchor - Left */}
      <mesh position={[-1, -0.3, 3.2]}>
        <boxGeometry args={[0.15, 0.4, 0.1]} />
        <meshStandardMaterial color="#4A4A4A" metalness={0.9} />
      </mesh>
      
      {/* Deck Railings */}
      {[...Array(30)].map((_, i) => (
        <mesh key={`rail-r-${i}`} position={[1.45, 3.6, -3.5 + i * 0.25]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#CCCCCC" metalness={0.7} />
        </mesh>
      ))}
      
      {/* Helipad */}
      <mesh position={[0, 3.95, -3]}>
        <cylinderGeometry args={[0.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
      
      {/* Helipad H marking */}
      <mesh position={[0, 3.98, -3]}>
        <boxGeometry args={[0.15, 0.01, 0.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 3.98, -3]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.15, 0.01, 0.3]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  )
}

function App() {
  const [tunnelUrl, setTunnelUrl] = useState<string>('')

  useEffect(() => {
    fetch('/api/tunnel-url')
      .then(res => res.json())
      .then(data => setTunnelUrl(data.url))
      .catch(() => setTunnelUrl('Starting tunnel...'))
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {tunnelUrl && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          zIndex: 1000,
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          🌊 Tunnel URL: <a href={tunnelUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4ECDC4' }}>{tunnelUrl}</a>
        </div>
      )}
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
        <CruiseShip />
        <OrbitControls />
        <Environment preset="sunset" />
      </Canvas>
    </div>
  )
}

export default App
