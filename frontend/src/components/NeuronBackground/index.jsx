/**
 * NeuronBackground
 * ================
 * Drop-in full-screen animated background.
 * Renders a React Three Fiber Canvas absolutely positioned behind all content.
 *
 * Usage:
 *   <NeuronBackground />   ← place once, anywhere in the tree
 *
 * The canvas is pointer-events:none so it never blocks UI clicks.
 * Mouse position is tracked on the window and passed into the scene via a ref.
 */
import { useRef, useEffect, Suspense } from 'react'
import { Canvas }     from '@react-three/fiber'
import NeuronScene    from './NeuronScene'

export default function NeuronBackground() {
  // Raw pixel mouse position — updated on window mousemove
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         0,
        pointerEvents:  'none',
        background:     'transparent',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 22], fov: 60, near: 0.1, far: 100 }}
        gl={{
          antialias:          true,
          alpha:              true,          // transparent canvas bg
          powerPreference:    'high-performance',
          stencil:            false,
          depth:              false,         // no depth needed for 2D-ish scene
        }}
        dpr={[1, 1.5]}                       // cap pixel ratio for perf
        frameloop="always"
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <NeuronScene mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  )
}
