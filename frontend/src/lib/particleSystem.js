/**
 * Particle System Logic
 * =====================
 * Pure JS — no React, no Three.js imports.
 * Handles all simulation: position, velocity, attraction, repulsion.
 * The Three.js scene reads from this state each frame.
 */

export const CONFIG = {
  COUNT:             150,       // total particles
  BOUNDS:            18,        // half-size of the simulation cube
  BASE_SPEED:        0.008,     // base drift speed
  NOISE_STRENGTH:    0.0012,    // per-frame random nudge
  ATTRACT_RADIUS:    4.5,       // cursor attraction radius (world units)
  ATTRACT_STRENGTH:  0.018,     // how strongly particles pull toward cursor
  REPEL_RADIUS:      1.2,       // cursor repulsion radius
  REPEL_STRENGTH:    0.055,     // how strongly particles push away
  DAMPING:           0.92,      // velocity damping (0–1, lower = more drag)
  CONNECT_DIST:      3.2,       // max distance to draw a connection line
  CONNECT_CURSOR:    5.0,       // boosted connection distance near cursor
  MAX_CONNECTIONS:   280,       // hard cap on line segments per frame
}

/** Seeded simple random — gives deterministic initial positions */
function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Create the initial particle array */
export function createParticles() {
  const rand = seededRand(42)
  const B = CONFIG.BOUNDS
  return Array.from({ length: CONFIG.COUNT }, (_, i) => ({
    id: i,
    x:  (rand() * 2 - 1) * B,
    y:  (rand() * 2 - 1) * B,
    z:  (rand() * 2 - 1) * (B * 0.5),   // flatter z range
    vx: (rand() * 2 - 1) * CONFIG.BASE_SPEED,
    vy: (rand() * 2 - 1) * CONFIG.BASE_SPEED,
    vz: (rand() * 2 - 1) * CONFIG.BASE_SPEED * 0.3,
    // phase offset for organic sine-wave drift
    phase: rand() * Math.PI * 2,
    freq:  0.3 + rand() * 0.4,
  }))
}

/**
 * Advance simulation by one frame.
 * Mutates the particles array in-place for performance.
 *
 * @param {object[]} particles
 * @param {{ x: number, y: number, z: number } | null} cursor  world-space cursor
 * @param {number} t  elapsed time in seconds
 */
export function stepParticles(particles, cursor, t) {
  const B  = CONFIG.BOUNDS
  const NS = CONFIG.NOISE_STRENGTH
  const D  = CONFIG.DAMPING

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    // ── Organic drift: sine-wave nudge ──────────────────────────────────
    p.vx += Math.sin(t * p.freq + p.phase)          * NS
    p.vy += Math.cos(t * p.freq + p.phase + 1.3)    * NS
    p.vz += Math.sin(t * p.freq * 0.7 + p.phase)    * NS * 0.4

    // ── Cursor interaction ───────────────────────────────────────────────
    if (cursor) {
      const dx = cursor.x - p.x
      const dy = cursor.y - p.y
      const dz = cursor.z - p.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001

      if (dist < CONFIG.ATTRACT_RADIUS) {
        const factor = (1 - dist / CONFIG.ATTRACT_RADIUS)

        if (dist < CONFIG.REPEL_RADIUS) {
          // Repel when very close
          const rf = CONFIG.REPEL_STRENGTH * (1 - dist / CONFIG.REPEL_RADIUS)
          p.vx -= (dx / dist) * rf
          p.vy -= (dy / dist) * rf
          p.vz -= (dz / dist) * rf
        } else {
          // Attract
          const af = CONFIG.ATTRACT_STRENGTH * factor
          p.vx += (dx / dist) * af
          p.vy += (dy / dist) * af
          p.vz += (dz / dist) * af
        }
      }
    }

    // ── Damping ──────────────────────────────────────────────────────────
    p.vx *= D
    p.vy *= D
    p.vz *= D

    // ── Integrate ────────────────────────────────────────────────────────
    p.x += p.vx
    p.y += p.vy
    p.z += p.vz

    // ── Soft boundary: wrap with fade-back ───────────────────────────────
    if (p.x >  B) { p.x =  B; p.vx *= -0.5 }
    if (p.x < -B) { p.x = -B; p.vx *= -0.5 }
    if (p.y >  B) { p.y =  B; p.vy *= -0.5 }
    if (p.y < -B) { p.y = -B; p.vy *= -0.5 }
    if (p.z >  B * 0.5) { p.z =  B * 0.5; p.vz *= -0.5 }
    if (p.z < -B * 0.5) { p.z = -B * 0.5; p.vz *= -0.5 }
  }
}

/**
 * Build connection list for this frame.
 * Returns array of { ax, ay, az, bx, by, bz, alpha } objects.
 *
 * @param {object[]} particles
 * @param {{ x, y, z } | null} cursor
 */
export function buildConnections(particles, cursor) {
  const connections = []
  const BASE  = CONFIG.CONNECT_DIST
  const BOOST = CONFIG.CONNECT_CURSOR
  const MAX   = CONFIG.MAX_CONNECTIONS

  for (let i = 0; i < particles.length && connections.length < MAX; i++) {
    const a = particles[i]
    for (let j = i + 1; j < particles.length && connections.length < MAX; j++) {
      const b = particles[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      // Determine effective connection distance (boosted near cursor)
      let threshold = BASE
      if (cursor) {
        const cda = Math.sqrt((cursor.x-a.x)**2 + (cursor.y-a.y)**2)
        const cdb = Math.sqrt((cursor.x-b.x)**2 + (cursor.y-b.y)**2)
        const nearCursor = Math.min(cda, cdb)
        if (nearCursor < CONFIG.ATTRACT_RADIUS) {
          threshold = BASE + (BOOST - BASE) * (1 - nearCursor / CONFIG.ATTRACT_RADIUS)
        }
      }

      if (dist < threshold) {
        // Alpha: stronger when closer and near cursor
        let alpha = (1 - dist / threshold) * 0.6
        if (cursor) {
          const cda = Math.sqrt((cursor.x-a.x)**2 + (cursor.y-a.y)**2)
          if (cda < CONFIG.ATTRACT_RADIUS) {
            alpha = Math.min(1, alpha * (1 + (1 - cda / CONFIG.ATTRACT_RADIUS) * 1.5))
          }
        }
        connections.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, alpha })
      }
    }
  }
  return connections
}
