/**
 * CursorTracker
 * =============
 * Invisible component that lives inside the R3F Canvas.
 * Converts mouse NDC → world-space coordinates each frame
 * and writes them into cursorRef (shared with particle system).
 *
 * Uses a raycaster against a large invisible plane at z=0
 * so the cursor position is always in the same z-plane as particles.
 */
import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const _raycaster = new THREE.Raycaster()
const _plane     = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const _target    = new THREE.Vector3()
const _ndc       = new THREE.Vector2()

// Smoothing: lerp cursor world pos toward raw hit each frame
const SMOOTH = 0.12

export default function CursorTracker({ cursorRef, mouseRef }) {
  const { camera, size } = useThree()

  useFrame(() => {
    const mouse = mouseRef.current
    if (!mouse) return

    // Convert pixel coords → NDC [-1, 1]
    _ndc.set(
      (mouse.x / size.width)  *  2 - 1,
      (mouse.y / size.height) * -2 + 1,
    )

    _raycaster.setFromCamera(_ndc, camera)
    const hit = _raycaster.ray.intersectPlane(_plane, _target)
    if (!hit) return

    // Smooth lerp
    if (!cursorRef.current) {
      cursorRef.current = { x: _target.x, y: _target.y, z: 0 }
    } else {
      cursorRef.current.x += (_target.x - cursorRef.current.x) * SMOOTH
      cursorRef.current.y += (_target.y - cursorRef.current.y) * SMOOTH
      cursorRef.current.z  = 0
    }
  })

  return null
}
