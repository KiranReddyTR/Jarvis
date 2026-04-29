/**
 * ParticleField
 * =============
 * Renders ~150 instanced glowing spheres using THREE.InstancedMesh.
 * One draw call for all particles.
 */
import { useRef, useMemo } from 'react'
import { useFrame }        from '@react-three/fiber'
import * as THREE          from 'three'
import { stepParticles }   from '../../lib/particleSystem'

// Reusable matrix / color objects (avoid GC pressure)
const _matrix = new THREE.Matrix4()
const _pos    = new THREE.Vector3()
const _quat   = new THREE.Quaternion()
const _scale  = new THREE.Vector3()

export default function ParticleField({ particlesRef, cursorRef }) {
  const meshRef = useRef()

  // Geometry: small icosahedron looks better than sphere at low poly
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.07, 1), [])

  // Material: additive blending gives the glow effect for free
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color:       0x8b5cf6,   // violet base
    transparent: true,
    opacity:     0.85,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  useFrame(({ clock }) => {
    const mesh      = meshRef.current
    const particles = particlesRef.current
    const cursor    = cursorRef.current
    if (!mesh || !particles) return

    const t = clock.getElapsedTime()

    // Advance simulation
    stepParticles(particles, cursor, t)

    // Update instance matrices
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Pulse size slightly over time for organic feel
      const pulse = 1 + 0.25 * Math.sin(t * p.freq * 2 + p.phase)

      // Boost size when near cursor
      let boost = 1
      if (cursor) {
        const dx   = cursor.x - p.x
        const dy   = cursor.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 4.5) boost = 1 + (1 - dist / 4.5) * 1.2
      }

      _pos.set(p.x, p.y, p.z)
      _scale.setScalar(pulse * boost)
      _matrix.compose(_pos, _quat, _scale)
      mesh.setMatrixAt(i, _matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, 150]}
      frustumCulled={false}
    />
  )
}
