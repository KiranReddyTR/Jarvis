/**
 * ConnectionLines
 * ===============
 * Draws dynamic connection lines between nearby particles.
 * Uses a single BufferGeometry updated each frame — one draw call.
 *
 * Strategy: pre-allocate a large Float32Array for MAX_CONNECTIONS * 2
 * vertices, then fill only what's needed each frame and set drawRange.
 */
import { useRef, useMemo }   from 'react'
import { useFrame }          from '@react-three/fiber'
import * as THREE            from 'three'
import { buildConnections, CONFIG } from '../../lib/particleSystem'

const MAX_SEGS   = CONFIG.MAX_CONNECTIONS
const MAX_VERTS  = MAX_SEGS * 2          // 2 endpoints per segment
const MAX_FLOATS = MAX_VERTS * 3         // xyz per vertex

export default function ConnectionLines({ particlesRef, cursorRef }) {
  const lineRef  = useRef()
  const geoRef   = useRef()

  // Pre-allocate buffers once
  const positions = useMemo(() => new Float32Array(MAX_FLOATS), [])
  const alphas    = useMemo(() => new Float32Array(MAX_VERTS),  [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('alpha',    new THREE.BufferAttribute(alphas,    1).setUsage(THREE.DynamicDrawUsage))
    geo.setDrawRange(0, 0)
    geoRef.current = geo
    return geo
  }, [positions, alphas])

  // Custom shader material — per-vertex alpha + additive glow
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x6366f1) },  // indigo
    },
    vertexShader: /* glsl */`
      attribute float alpha;
      varying   float vAlpha;
      void main() {
        vAlpha      = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3  uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha);
      }
    `,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  useFrame(() => {
    const particles = particlesRef.current
    const cursor    = cursorRef.current
    const geo       = geoRef.current
    if (!particles || !geo) return

    const conns = buildConnections(particles, cursor)
    const count = conns.length

    const posAttr   = geo.attributes.position
    const alphaAttr = geo.attributes.alpha

    for (let i = 0; i < count; i++) {
      const c  = conns[i]
      const vi = i * 6   // 2 verts × 3 floats
      const ai = i * 2   // 2 verts × 1 float

      positions[vi]     = c.ax; positions[vi + 1] = c.ay; positions[vi + 2] = c.az
      positions[vi + 3] = c.bx; positions[vi + 4] = c.by; positions[vi + 5] = c.bz

      alphas[ai]     = c.alpha
      alphas[ai + 1] = c.alpha
    }

    posAttr.needsUpdate   = true
    alphaAttr.needsUpdate = true
    geo.setDrawRange(0, count * 2)
  })

  return <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false} />
}
