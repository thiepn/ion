import {
  BufferGeometry, CatmullRomCurve3, Float32BufferAttribute,
  Vector3,
} from 'three';

export const ROAD_HALF_WIDTH = 13;
export const SEGMENTS = 480;

/**
 * V17 NIGHTSHIFT / renewed driving circuit. A sweeping opening sector, an
 * east-side chicane, elevated north crest and broad west-side switchbacks.
 * Source-controlled centerline remains the single owner for mesh, camera
 * lookahead, collisions, checkpoint authority, minimap and boost pads.
 *
 * Authored control vertices are intentionally separated: road branches do
 * not intersect, leaving collision projection and earned gates unambiguous.
 * Earlier circuit art and best-lap records remain available in Git history
 * and the untouched ion-v2-best-lap localStorage entry.
 */
const points = [
  [0, 19, -175], [55, 13, -205], [115, 12, -199],
  [152, 14, -152], [161, 16, -93], [164, 15, -44],
  [170, 12, 0], [168, 11, 45], [154, 16, 89],
  [137, 23, 137], [109, 28, 188], [59, 26, 219],
  [0, 19, 205], [-43, 13, 162], [-75, 12, 130],
  [-117, 14, 117], [-168, 16, 97], [-203, 15, 54],
  [-210, 12, 0], [-199, 11, -53], [-175, 16, -101],
  [-132, 23, -132], [-81, 28, -141], [-40, 26, -148],
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

/** Project onto the single authoritative track spline.
 * A hint searches 45 neighboring segments first; a far-off-course position
 * falls back to a global search instead of silently following the wrong lane.
 */
export function nearestTrack(x:number,z:number,hintT?:number): NearestTrack {
  let best=Number.POSITIVE_INFINITY, segment=0, fraction=0, cx=0, cz=0;
  const scan=(index:number)=>{
    const i=(index+SEGMENTS)%SEGMENTS;
    const a=TRACK_SAMPLES[i], b=TRACK_SAMPLES[i+1];
    const dx=b.x-a.x, dz=b.z-a.z, len2=dx*dx+dz*dz;
    const u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len2));
    const px=a.x+u*dx, pz=a.z+u*dz;
    const d=(x-px)**2+(z-pz)**2;
    if(d<best){best=d;segment=i;fraction=u;cx=px;cz=pz;}
  };
  if(hintT!==undefined && Number.isFinite(hintT)){
    const center=Math.floor((((hintT%1)+1)%1)*SEGMENTS);
    for(let k=-22;k<=22;k++)scan(center+k);
    // The local neighborhood is reliable inside or immediately beside the
    // road; full scan recovers if a reset/large discontinuity moves us away.
    if(best>(ROAD_HALF_WIDTH+12)**2)
      for(let i=0;i<SEGMENTS;i++)scan(i);
  }else for(let i=0;i<SEGMENTS;i++)scan(i);
  const a=TRACK_SAMPLES[segment], b=TRACK_SAMPLES[segment+1];
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
  const rightX=dz/length,rightZ=-dx/length;
  return {
    t:(segment+fraction)/SEGMENTS,
    distance:Math.sqrt(best),
    lateral:(x-cx)*rightX+(z-cz)*rightZ,
    y:a.y+(b.y-a.y)*fraction,
    centerX:cx,centerZ:cz,
    heading:Math.atan2(dx,dz),rightX,rightZ,
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
