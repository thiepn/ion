import { useMemo } from 'react';
import { TRACK_SAMPLES } from './track';
import type { RaceSnapshot } from './simulation';

const VIEW = 210;
const PAD = 17;
const extents = TRACK_SAMPLES.reduce(
  (v, point) => ({
    left: Math.min(v.left, point.x),
    right: Math.max(v.right, point.x),
    near: Math.min(v.near, point.z),
    far: Math.max(v.far, point.z),
  }),
  { left: Infinity, right: -Infinity, near: Infinity, far: -Infinity }
);
const mapWidth = Math.max(extents.right - extents.left, extents.far - extents.near);
const scale = (VIEW - PAD * 2) / mapWidth;
const mapX = (x: number) => VIEW / 2 + (x - (extents.left + extents.right) / 2) * scale;
const mapY = (z: number) => VIEW / 2 - (z - (extents.near + extents.far) / 2) * scale;
const circuit = TRACK_SAMPLES
  .filter((_, i) => i % 3 === 0)
  .map((p, i) => `${i === 0 ? 'M' : 'L'}${mapX(p.x).toFixed(2)} ${mapY(p.z).toFixed(2)}`)
  .join(' ') + ' Z';
const gateMarkers = [0, 0.25, 0.5, 0.75].map(t => TRACK_SAMPLES[Math.round(t * (TRACK_SAMPLES.length - 1))]);

/**
 * Only the original RaceSnapshot.nextGate may decide the required marker.
 * The finish line is index 0, while S1/S2/S3 are 1/2/3 respectively.
 * At grid nextGate=1: finish is NOT an earned sector.
 */
export function gateMarkerStatus(index:number,nextGate:number):'next'|'earned'|'pending' {
  if(index===0)return nextGate===4?'next':'pending';
  if(index===nextGate)return 'next';
  return index<nextGate?'earned':'pending';
}

/** Vector track map derived from the real collision/course spline, never a fabricated map. */
export function Minimap({ race }: { race: RaceSnapshot }) {
  const marker = useMemo(() => ({
    x: mapX(race.worldX),
    y: mapY(race.worldZ),
    angle: race.heading * 180 / Math.PI,
  }), [race.worldX, race.worldZ, race.heading]);

  const progressPercent=Math.max(0,Math.min(100,Math.floor(race.progress*100)));
  const gateTarget=race.nextGateLabel;
  return (
    <div className="minimap" aria-label={`Nightshift track map. Lap ${race.lap} of ${race.laps}. Next required: ${gateTarget}. Position approximately ${progressPercent} percent along the course.`}>
      <div className="minimap-heading"><span>TRACK / NEXT GATE</span>
        <strong>{race.nextGate===4?'FINISH':`S${race.nextGate}`}</strong></div>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label="Nightshift circuit outline, vehicle position and official ordered quarter gates">
        <path d={circuit} fill="none" stroke="#0e2636" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit} fill="none" stroke="#507d90" strokeWidth="1.5" strokeLinejoin="round"/>
        {gateMarkers.map((p, i) => {
          const status=gateMarkerStatus(i,race.nextGate);
          return <circle key={i} data-gate={i===0?'finish':`S${i}`}
            data-status={status}
            cx={mapX(p.x)} cy={mapY(p.z)}
            r={status==='next'?5.3:i===0?4.4:3.2}
            fill={status==='next'?'#ffba8d':status==='earned'?'#99f2e8':'#577b8b'}
            stroke={status==='next'?'#f8fff7':'#08131d'}
            strokeWidth={status==='next'?2:1.5}/>;
        })}
        <g transform={`translate(${marker.x} ${marker.y}) rotate(${marker.angle})`}>
          <path d="M0 -10 L6 7 L0 4 L-6 7Z" fill="#e9fff8" stroke="#243b43" strokeWidth="1.5"/>
        </g>
      </svg>
      <div className="minimap-foot"><span>ON TRACK</span><strong>{progressPercent}%</strong></div>
      <div className="minimap-progress" role="progressbar"
        aria-label="Current physical position along this lap"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
        <span style={{width:`${progressPercent}%`}}/>
      </div>
    </div>
  );
}
