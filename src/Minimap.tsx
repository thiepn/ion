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

/** Vector track map derived from the real collision/course spline, never a fabricated map. */
export function Minimap({ race }: { race: RaceSnapshot }) {
  const marker = useMemo(() => ({
    x: mapX(race.worldX),
    y: mapY(race.worldZ),
    angle: 180 - race.heading * 180 / Math.PI,
  }), [race.worldX, race.worldZ, race.heading]);

  return (
    <div className="minimap" aria-label={`Track map: approximately ${Math.floor((race.progress % 1) * 100)} percent of lap progression`}>
      <div className="minimap-heading"><span>SECTOR MAP</span><span>01</span></div>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label="Circular track map with live vehicle position and sector checkpoints">
        <path d={circuit} fill="none" stroke="#0e2636" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit} fill="none" stroke="#507d90" strokeWidth="1.5" strokeLinejoin="round"/>
        {gateMarkers.map((p, i) =>
          <circle key={i} cx={mapX(p.x)} cy={mapY(p.z)} r={i === 0 ? 4.4 : 3.2}
            fill={i === 0 ? '#f4ab77' : i <= race.nextGate - 1 ? '#99f2e8' : '#577b8b'} stroke="#08131d" strokeWidth="1.5"/>
        )}
        <g transform={`translate(${marker.x} ${marker.y}) rotate(${marker.angle})`}>
          <path d="M0 -10 L6 7 L0 4 L-6 7Z" fill="#e9fff8" stroke="#243b43" strokeWidth="1.5"/>
        </g>
      </svg>
      <div className="minimap-foot"><span>PROGRESS</span><strong>{Math.floor(Math.min(1,race.progress) * 100)}%</strong></div>
    </div>
  );
}
