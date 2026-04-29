/**
 * NeuronScene
 * ===========
 * The R3F scene graph. Composes ParticleField + ConnectionLines + CursorTracker.
 * Shared refs are created here and passed down — no prop drilling through Canvas.
 */
import { useRef } from 'react'
import { createParticles } from '../../lib/particleSystem'
import ParticleField   from './ParticleField'
import ConnectionLines from './ConnectionLines'
import CursorTracker   from './CursorTracker'

export default function NeuronScene({ mouseRef }) {
  // Shared mutable state — refs avoid React re-renders on every frame
  const particlesRef = useRef(createParticles())
  const cursorRef    = useRef(null)

  return (
    <>
      {/* Ambient fill — very dim so particles pop */}
      <ambientLight intensity={0.05} />

      {/* Cursor world-space tracker */}
      <CursorTracker cursorRef={cursorRef} mouseRef={mouseRef} />

      {/* Connection lines drawn first (behind particles) */}
      <ConnectionLines particlesRef={particlesRef} cursorRef={cursorRef} />

      {/* Instanced particle spheres */}
      <ParticleField particlesRef={particlesRef} cursorRef={cursorRef} />
    </>
  )
}
