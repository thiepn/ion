import {
  BufferGeometry, CatmullRomCurve3, Float32BufferAttribute,
  Vector3,
} from 'three';

export const ROAD_HALF_WIDTH = 13;
/** The inner physical face of the visually rendered rail, in track meters. */
export const RAIL_INNER_OFFSET = ROAD_HALF_WIDTH - 0.28;
export const RAIL_BOTTOM_RISE = 0.40;
export const RAIL_TOP_RISE = 3.55;
export const SEGMENTS = 480;

/**
 * I06 NIGHTSHIFT — an independently authored, single closed racing course.
 *
 * Clockwise race direction from the south launch straight:
 * 1. LAUNCH: long open approach and a progressive right-hand bend.
 * 2. SWITCHBACK: the east tower run has a readable, gentle S-curve.
 * 3. CREST: the northern rise bends into a visible elevated sweep.
 * 4. DESCENT: a pronounced northwest braking corner and falling west side.
 * 5. HOMECOMING: a flowing return sector and a long visible finish approach.
 *
 * The same curve owns physical race progress, collision projection, checkpoint
 * geometry, road/rail renderers, minimap, boost pads and camera lookahead.
 * Keep the control points sufficiently separated for a 26m-wide elevated deck.
 */
const points = [
  [0, 17, -245], [70, 15, -245], [140, 13, -234],
  [190, 12, -215], [224, 14, -178], [238, 17, -126],
  [239, 20, -83], [248, 22, -29], [250, 22, 31],
  [246, 19, 80], [248, 18, 136], [239, 18, 191],
  [199, 21, 247], [152, 25, 286], [94, 31, 306],
  [35, 34, 306], [-27, 30, 280], [-73, 24, 256],
  [-117, 19, 239], [-164, 17, 228], [-211, 15, 216],
  [-242, 14, 187], [-262, 15, 147], [-271, 17, 100],
  [-274, 19, 50], [-280, 21, -9], [-277, 24, -64],
  [-262, 26, -117], [-246, 25, -174], [-204, 23, -219],
  [-145, 19, -245], [-70, 18, -245],
].map(([x, y, z]) => new Vector3(x, y, z));

/** Physical boost-strip locations. Rendered strips and rewards share this source. */
export const BOOST_PAD_T = [0.16, 0.43, 0.80] as const;

/** Authored visible course wayfinding, tied to exact curve locations. */
export const CIRCUIT_SECTIONS = [
  {t:0.09, name:'LAUNCH', hint:'OPEN THE THROTTLE'},
  {t:0.285, name:'SWITCHBACK', hint:'FLOW THROUGH THE S'},
  {t:0.45, name:'NORTH CREST', hint:'READ THE EXIT'},
  {t:0.65, name:'DESCENT', hint:'BRAKE FOR THE BEND'},
  {t:0.86, name:'HOMECOMING', hint:'SET UP THE STRAIGHT'},
] as const;

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

/**
 * Upright rail wall following the same canonical road samples as the deck,
 * collision projector, boost strips and lap gates. This is solely rendered
 * geometry; it neither projects the vehicle nor awards checkpoints.
 *
 * The previous horizontal 'rail' ribbon was only 0.43 m above the surface;
 * the craft hovered at y + 2.5 m and appeared to drive through the rail.
 */
export function railWall(side: -1 | 1): BufferGeometry {
  const positions:number[]=[];
  const indices:number[]=[];
  const uvs:number[]=[];
  for(let i=0;i<=SEGMENTS;i++){
    const {position,right}=trackAt(i/SEGMENTS);
    const x=position.x+right.x*RAIL_INNER_OFFSET*side;
    const z=position.z+right.z*RAIL_INNER_OFFSET*side;
    for(const height of [RAIL_BOTTOM_RISE,RAIL_TOP_RISE]){
      positions.push(x,position.y+height,z);
      uvs.push(i/SEGMENTS*60,(height-RAIL_BOTTOM_RISE)/(RAIL_TOP_RISE-RAIL_BOTTOM_RISE));
    }
    if(i<SEGMENTS){
      const k=i*2;
      indices.push(k,k+1,k+2,k+1,k+3,k+2);
    }
  }
  const result=new BufferGeometry();
  result.setAttribute('position',new Float32BufferAttribute(positions,3));
  result.setAttribute('uv',new Float32BufferAttribute(uvs,2));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}
