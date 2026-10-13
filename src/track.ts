import {
  BufferGeometry, CatmullRomCurve3, Float32BufferAttribute,
  Vector3,
} from 'three';

export const ROAD_HALF_WIDTH = 13;
export const SEGMENTS = 480;

/**
 * ION's first independently authored closed circuit.
 * Track geometry, collision and lap progress all refer to the same centerline.
 */
const points = [
  [0, 14, -146], [82, 16, -142], [162, 24, -98],
  [187, 20, -17], [148, 14, 84], [58, 12, 153],
  [-32, 15, 163], [-125, 27, 123], [-178, 21, 44],
  [-167, 12, -56], [-93, 13, -132],
].map(([x, y, z]) => new Vector3(x, y, z));

export const TRACK_CURVE = new CatmullRomCurve3(points, true, 'catmullrom', 0.38);
export const TRACK_SAMPLES = Array.from({ length: SEGMENTS + 1 }, (_, i) =>
  TRACK_CURVE.getPointAt(i / SEGMENTS)
);
export const TRACK_LENGTH = TRACK_CURVE.getLength();

export type TrackPoint = {
  position: Vector3;
  tangent: Vector3;
  right: Vector3;
};

export function trackAt(t: number): TrackPoint {
  const normalized = ((t % 1) + 1) % 1;
  const position = TRACK_CURVE.getPointAt(normalized);
  const tangent = TRACK_CURVE.getTangentAt(normalized).normalize();
  const right = new Vector3(tangent.z, 0, -tangent.x).normalize();
  return { position, tangent, right };
}

export function headingAt(t: number) {
  const { tangent } = trackAt(t);
  return Math.atan2(tangent.x, tangent.z);
}

export type NearestTrack = {
  t: number;
  distance: number;
  lateral: number;
  y: number;
  centerX: number;
  centerZ: number;
  heading: number;
  rightX: number;
  rightZ: number;
};

/** Closest piecewise-linear centerline projection, without graphics dependencies. */
export function nearestTrack(x: number, z: number): NearestTrack {
  let best = Number.POSITIVE_INFINITY;
  let segment = 0;
  let fraction = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < SEGMENTS; i++) {
    const a = TRACK_SAMPLES[i];
    const b = TRACK_SAMPLES[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2));
    const px = a.x + dx * u;
    const pz = a.z + dz * u;
    const dist2 = (x - px) ** 2 + (z - pz) ** 2;
    if (dist2 < best) {
      best = dist2;
      segment = i;
      fraction = u;
      cx = px;
      cz = pz;
    }
  }
  const a = TRACK_SAMPLES[segment];
  const b = TRACK_SAMPLES[segment + 1];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) || 1;
  const rightX = dz / length;
  const rightZ = -dx / length;
  const lateral = (x - cx) * rightX + (z - cz) * rightZ;
  return {
    t: (segment + fraction) / SEGMENTS,
    distance: Math.sqrt(best),
    lateral,
    y: a.y + (b.y - a.y) * fraction,
    centerX: cx, centerZ: cz,
    heading: Math.atan2(dx, dz),
    rightX, rightZ,
  };
}

/** One consistently wound, smoothly shaded ribbon; offset is relative to track center. */
export function ribbon(innerOffset: number, outerOffset: number, rise = 0): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const { position, right } = trackAt(i / SEGMENTS);
    for (const offset of [innerOffset, outerOffset]) {
      positions.push(
        position.x + right.x * offset,
        position.y + rise,
        position.z + right.z * offset
      );
      uvs.push((offset + ROAD_HALF_WIDTH) / (ROAD_HALF_WIDTH * 2), i / SEGMENTS * 60);
    }
    if (i < SEGMENTS) {
      const k = i * 2;
      indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
