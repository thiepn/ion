import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending, Color, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, PointLight, Shape,
} from 'three';
import type { RaceEngine } from '../simulation';

/**
 * ION-01 // Kestrel
 *
 * Hand-authored bevelled hard-surface craft. No external mesh, texture or
 * third-party model; its silhouette, panel layering, ducts and avionics are
 * separate physically lit surfaces rather than one scaled box.
 */
const ELECTRIC = new Color('#65ecfa').multiplyScalar(2.4);
const WARM = new Color('#ffa96d').multiplyScalar(2.1);

function bevelledPlate(points: [number,number][], depth: number, bevel=0.075): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x,y] of points.slice(1)) shape.lineTo(x,y);
  shape.closePath();
  // Local XY becomes horizontal XZ, extrusion becomes the thickness in Y.
  const g = new ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 2, curveSegments: 3, steps: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function hullShape(): [number,number][] {
  return [
    [0,-3.55],[0.52,-3.15],[0.9,-2.38],[1.12,-0.25],[1.0,1.85],
    [0.72,2.72],[-0.72,2.72],[-1.0,1.85],[-1.12,-0.25],
    [-0.9,-2.38],[-0.52,-3.15],
  ];
}
function wingShape(side:number): [number,number][] {
  const x=(v:number)=>side*v;
  return [
    [x(0.88),-1.2],[x(1.5),-1.25],[x(3.86),-0.45],
    [x(3.55),0.95],[x(3.05),1.35],[x(2.25),1.70],
    [x(1.0),2.2],
  ];
}
function finShape(side:number): [number,number][] {
  const x=(v:number)=>side*v;
  return [
    [x(2.38),0.05],[x(3.62),0.08],[x(3.58),1.25],
    [x(2.82),1.15],[x(2.18),0.82],
  ];
}
const bodyMaterial = { metalness:.64, roughness:.31 } as const;
const edgeMaterial = { metalness:.82, roughness:.29 } as const;
function Ribs({ side }: { side:number }) {
  return (
    <group>
      {[0,1,2,3,4].map(i=>(
        <group key={i} position={[side*(1.23+i*.23),.42,-1.08+i*.47]}>
          <mesh rotation={[0,side*-.12,0]}>
            <boxGeometry args={[.11,.07,.53]}/>
            <meshStandardMaterial color="#132f3b" {...edgeMaterial}/>
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Engine({x,game}:{x:number;game:RaceEngine}) {
  const core=useRef<Mesh>(null);
  const exhaust=useRef<Mesh>(null);
  useFrame(({clock})=>{
    const pulse=.9+Math.sin(clock.elapsedTime*32+x*8)*.095;
    if(core.current) core.current.scale.set(pulse,pulse,1);
    if(exhaust.current) {
      exhaust.current.scale.y=game.isBoosting?1.55:.47;
      exhaust.current.visible=game.speed>6;
      const material=exhaust.current.material;
      if(material instanceof MeshBasicMaterial)
        material.opacity=game.isBoosting?.62:.22;
    }
  });
  return (
    <group position={[x,-.12,-2.08]}>
      <mesh rotation={[Math.PI/2,0,0]} castShadow>
        <cylinderGeometry args={[.49,.66,1.85,18,1,false]}/>
        <meshStandardMaterial color="#152536" metalness={.85} roughness={.33}/>
      </mesh>
      <mesh position={[0,0,-.97]}>
        <torusGeometry args={[.46,.09,10,28]}/>
        <meshStandardMaterial color="#8193a1" metalness={.8} roughness={.3}/>
      </mesh>
      <mesh ref={core} position={[0,0,-1.01]} rotation={[0,Math.PI,0]}>
        <circleGeometry args={[.38,28]}/>
        <meshBasicMaterial color={ELECTRIC} toneMapped={false}/>
      </mesh>
      <mesh ref={exhaust} position={[0,0,-1.76]} rotation={[-Math.PI/2,0,0]}>
        <cylinderGeometry args={[.32,.08,2.2,14]}/>
        <meshBasicMaterial color={ELECTRIC} transparent opacity={.27}
          blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
      </mesh>
      {[0,Math.PI/2,Math.PI,Math.PI*1.5].map(angle=>(
        <mesh key={angle} position={[Math.cos(angle)*.54,Math.sin(angle)*.54,.2]}
          rotation={[0,0,angle]}>
          <boxGeometry args={[.12,.19,1.9]}/>
          <meshStandardMaterial color="#546677" metalness={.77} roughness={.35}/>
        </mesh>
      ))}
    </group>
  );
}
export function Craft({game,shipRef,hullRef,paint}:{
  game:RaceEngine;
  shipRef: React.RefObject<Group|null>;
  hullRef: React.RefObject<Group|null>;
  paint:string;
}) {
  const [hull,wings,fins] = useMemo(()=>{
    const body=bevelledPlate(hullShape(),.45,.1);
    const wings=[bevelledPlate(wingShape(-1),.18),bevelledPlate(wingShape(1),.18)];
    const fins=[bevelledPlate(finShape(-1),.19),bevelledPlate(finShape(1),.19)];
    return [body,wings,fins] as const;
  },[]);
  useEffect(() => () => {
    hull.dispose();
    wings.forEach(g => g.dispose());
    fins.forEach(g => g.dispose());
  }, [hull, wings, fins]);
  const cockpit=useRef<Mesh>(null);
  const boostLamp=useRef<PointLight>(null);
  useFrame(({clock})=>{
    if(cockpit.current) cockpit.current.rotation.y=Math.sin(clock.elapsedTime*.65)*.013;
    if(boostLamp.current)boostLamp.current.intensity=game.isBoosting?12:game.speed>5?3.5:1;
  });

  return (
    <group ref={shipRef}>
      <group ref={hullRef}>
        <group position={[0,0,0]}>
          <mesh geometry={hull} castShadow receiveShadow>
            <meshPhysicalMaterial color={paint} {...bodyMaterial} clearcoat={.75} clearcoatRoughness={.21}/>
          </mesh>
          <mesh position={[0,-.18,.25]} castShadow>
            <boxGeometry args={[1.5,.18,5.4]}/>
            <meshStandardMaterial color="#132431" {...edgeMaterial}/>
          </mesh>
          <mesh position={[0,.49,-1.66]} castShadow>
            <boxGeometry args={[1.37,.17,1.72]}/>
            <meshStandardMaterial color="#172c3d" metalness={.8} roughness={.28}/>
          </mesh>
          <mesh position={[0,.63,.55]} rotation={[Math.PI/2,0,0]} castShadow>
            <sphereGeometry args={[.76,24,14]}/>
            <meshPhysicalMaterial color="#17384d" metalness={.3} roughness={.12}
              clearcoat={1} clearcoatRoughness={.1}/>
          </mesh>
          <mesh ref={cockpit} position={[0,.68,.55]} scale={[.72,.39,1.21]}>
            <sphereGeometry args={[1,26,18]}/>
            <meshPhysicalMaterial color="#1a4658" metalness={.42} roughness={.11}
              clearcoat={1} clearcoatRoughness={.04} transparent opacity={.93}/>
          </mesh>
          <mesh position={[0,.5,2.46]}>
            <boxGeometry args={[.14,.08,1.2]}/>
            <meshBasicMaterial toneMapped={false} color={WARM}/>
          </mesh>
          {[-1,1].map((side,i)=>(
            <group key={side}>
              <mesh geometry={wings[i]} position={[0,-.08,0]} castShadow receiveShadow>
                <meshPhysicalMaterial color={paint} {...bodyMaterial} clearcoat={.7}/>
              </mesh>
              <mesh geometry={fins[i]} position={[0,.18,0]} castShadow>
                <meshStandardMaterial color="#183244" {...edgeMaterial}/>
              </mesh>
              <mesh position={[side*3.05,.24,.72]} rotation={[0,side*.15,0]}>
                <boxGeometry args={[.14,.13,1.2]}/>
                <meshBasicMaterial toneMapped={false} color={ELECTRIC}/>
              </mesh>
              <mesh position={[side*2.37,.35,-.3]} rotation={[0,side*.12,0]}>
                <boxGeometry args={[.28,.15,1.37]}/>
                <meshStandardMaterial color="#121e2a" metalness={.74} roughness={.3}/>
              </mesh>
              <mesh position={[side*1.3,.45,.3]}>
                <boxGeometry args={[.12,.085,3.1]}/>
                <meshBasicMaterial toneMapped={false} color={ELECTRIC}/>
              </mesh>
              <mesh position={[side*.88,.29,2.2]}>
                <boxGeometry args={[.13,.13,.72]}/>
                <meshBasicMaterial toneMapped={false} color={WARM}/>
              </mesh>
              <mesh position={[side*3.18,.26,.12]} castShadow>
                <boxGeometry args={[.22,.4,1.52]}/>
                <meshStandardMaterial color="#576f80" {...edgeMaterial}/>
              </mesh>
              <Ribs side={side}/>
              <mesh position={[side*.87,.52,1.38]}>
                <sphereGeometry args={[.1,8,8]}/>
                <meshBasicMaterial color={ELECTRIC} toneMapped={false}/>
              </mesh>
            </group>
          ))}
          <Engine x={-1.06} game={game}/>
          <Engine x={1.06} game={game}/>
          {[-1,1].map(side=>(
            <group key={side} position={[side*3.32,-.18,-.7]}>
              <mesh rotation={[Math.PI/2,0,0]}>
                <cylinderGeometry args={[.29,.35,1.1,14]}/>
                <meshStandardMaterial color="#223746" metalness={.75} roughness={.35}/>
              </mesh>
              <mesh position={[0,0,-.62]} rotation={[0,Math.PI,0]}>
                <circleGeometry args={[.22,16]}/>
                <meshBasicMaterial color={WARM} toneMapped={false}/>
              </mesh>
              <pointLight color="#67dff8" intensity={1.2} distance={7} decay={2}/>
            </group>
          ))}
          <pointLight ref={boostLamp} position={[0,0,-3.0]} color="#59ddf4" intensity={2} distance={16} decay={2}/>
        </group>
      </group>
    </group>
  );
}
