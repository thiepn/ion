import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Color, Group, Mesh, PointLight, Vector3 } from 'three';
import { trackAt } from '../track';
import { AssetBoundary } from './AssetBoundary';

export type KenneyName =
  'craft-racer'|'craft-speedera'|'craft-speederb'|
  'hangar-largea'|'hangar-roundglass'|'gate-complex'|
  'satellitedish-detailed'|'machine-generatorlarge'|
  'platform-large'|'monorail-trainfront'|'monorail-trackstraight'|
  'supports-high'|'structure-detailed'|'rock-crystalslargea';

type ModelProps={
  asset:KenneyName;
  width:number;
  position?:[number,number,number];
  rotation?:[number,number,number];
  tint?:string;
};

/**
 * Each model is a genuine self-contained Kenney Space Kit GLB, downloaded
 * at build time from a pinned public revision and Git-blob-hash validated.
 * Center/pivot normalization gives wildly different native model scales
 * predictable placement and ground contact in ION's simulation units.
 */
export function KenneyModel({asset,width,position=[0,0,0],rotation=[0,0,0],tint}:ModelProps){
  const gltf=useLoader(GLTFLoader, '/assets/kenney/'+asset+'.glb');
  const object=useMemo(()=>{
    const clone=gltf.scene.clone(true);
    clone.traverse(child=>{
      if(!(child instanceof Mesh))return;
      child.castShadow=true;
      child.receiveShadow=true;
      if(tint){
        const materials=Array.isArray(child.material)?child.material:[child.material];
        const recolored=materials.map(m=>{
          const copy=m.clone();
          if('color' in copy && copy.color && typeof copy.color==='object'){
            const color=copy.color as import('three').Color;
            color.lerp(new Color(tint),.38);
          }
          if('metalness' in copy && typeof copy.metalness==='number') copy.metalness=Math.max(copy.metalness,.48);
          if('roughness' in copy && typeof copy.roughness==='number') copy.roughness=Math.min(copy.roughness,.62);
          return copy;
        });
        child.material=Array.isArray(child.material)?recolored:recolored[0];
      }
    });
    const box=new Box3().setFromObject(clone);
    const dimensions=box.getSize(new Vector3());
    const center=box.getCenter(new Vector3());
    const factor=width/Math.max(dimensions.x,dimensions.z,.0001);
    clone.scale.setScalar(factor);
    clone.position.set(-center.x*factor,-box.min.y*factor,-center.z*factor);
    return clone;
  },[gltf,asset,width,tint]);
  useEffect(()=>()=>{ if(!tint)return;object.traverse(child=>{
    if(child instanceof Mesh){
      const mats=Array.isArray(child.material)?child.material:[child.material];
      mats.forEach(m=>m.dispose());
    }
  });},[object,tint]);
  return <group position={position} rotation={rotation}><primitive object={object}/></group>;
}

type Placement={
  asset:KenneyName;
  t:number;
  side:number;
  distance:number;
  width:number;
  headingOffset?:number;
  raise?:number;
};

/* Designed scenic regions: dockyards / orbital relay / energy factory.
 * All coordinates are derived from the authoritative lap spline.
 */
const DISTRICT:Placement[]=[
  {asset:'hangar-largea',t:.04,side:1,distance:63,width:32},
  {asset:'hangar-roundglass',t:.085,side:1,distance:79,width:23},
  {asset:'platform-large',t:.11,side:1,distance:53,width:21},
  {asset:'gate-complex',t:.15,side:-1,distance:40,width:24},
  {asset:'structure-detailed',t:.21,side:-1,distance:63,width:22},
  {asset:'satellitedish-detailed',t:.255,side:1,distance:66,width:15},
  {asset:'machine-generatorlarge',t:.29,side:1,distance:40,width:18},
  {asset:'supports-high',t:.325,side:-1,distance:29,width:12},
  {asset:'hangar-largea',t:.39,side:-1,distance:74,width:28},
  {asset:'gate-complex',t:.425,side:-1,distance:31,width:23},
  {asset:'rock-crystalslargea',t:.475,side:1,distance:62,width:23},
  {asset:'platform-large',t:.525,side:-1,distance:48,width:24},
  {asset:'satellitedish-detailed',t:.565,side:-1,distance:74,width:18},
  {asset:'machine-generatorlarge',t:.61,side:1,distance:46,width:16},
  {asset:'structure-detailed',t:.655,side:1,distance:68,width:29},
  {asset:'hangar-roundglass',t:.715,side:-1,distance:64,width:28},
  {asset:'gate-complex',t:.755,side:1,distance:36,width:25},
  {asset:'supports-high',t:.805,side:1,distance:33,width:13},
  {asset:'rock-crystalslargea',t:.865,side:-1,distance:67,width:20},
  {asset:'hangar-largea',t:.915,side:1,distance:70,width:33},
  {asset:'monorail-trainfront',t:.95,side:-1,distance:82,width:17},
  {asset:'monorail-trackstraight',t:.952,side:-1,distance:83,width:17},
];

function SceneryObject({item}: {item:Placement}) {
  const {position,right,tangent}=trackAt(item.t);
  const x=position.x+right.x*item.side*item.distance;
  const z=position.z+right.z*item.side*item.distance;
  const angle=Math.atan2(tangent.x,tangent.z) + (item.headingOffset||0);
  // These districts occupy elevated service platforms with real structural
  // supports down to the ground plane, never bare models floating in mid-air.
  const deckY=position.y-12+(item.raise||0);
  const columnHeight=Math.max(1,deckY+25);
  const deckWidth=item.width*1.32;
  return (
    <group>
      <group position={[x,deckY-.95,z]} rotation={[0,angle,0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[deckWidth,1.9,deckWidth*.92]}/>
          <meshStandardMaterial color="#1d3442" roughness={.48} metalness={.65}/>
        </mesh>
        {[-1,1].map(side=>(
          <mesh key={side} position={[side*(deckWidth*.48),.98,0]}>
            <boxGeometry args={[.24,.12,deckWidth*.84]}/>
            <meshBasicMaterial color="#65dce8" toneMapped={false}/>
          </mesh>
        ))}
      </group>
      <mesh position={[x,-25+columnHeight/2,z]} castShadow>
        <cylinderGeometry args={[Math.max(2,item.width*.12),Math.max(3,item.width*.17),columnHeight,8]}/>
        <meshStandardMaterial color="#253946" roughness={.58} metalness={.65}/>
      </mesh>
      <KenneyModel asset={item.asset} width={item.width}
        position={[x,deckY,z]} rotation={[0,angle,0]}/>
    </group>
  );
}

/** Non-colliding distant craft traffic in aerial lanes separate from the track. */
function FlyingTraffic({offset,asset}: {offset:number;asset:KenneyName}) {
  const group=useRef<Group>(null);
  useFrame(({clock})=>{
    if(!group.current)return;
    const t=(clock.elapsedTime*.007+offset)%1;
    const {position,right,tangent}=trackAt(t);
    group.current.position.set(position.x+right.x*42,position.y+21+Math.sin(clock.elapsedTime*1.7+offset*8)*1.2,position.z+right.z*42);
    group.current.rotation.y=Math.atan2(tangent.x,tangent.z);
    group.current.rotation.z=.09*Math.sin(clock.elapsedTime*1.7+offset);
  });
  return <group ref={group}>
    <KenneyModel asset={asset} width={9} rotation={[0,Math.PI,0]}/>
    <pointLight color="#81edf2" intensity={2} distance={18}/>
  </group>;
}

export function KenneyDistricts({quality}: {quality:'QUALITY'|'PERFORMANCE'}) {
  // The reduced preset retains the 9 hero landmarks, not 21 repeating props.
  const placements=quality==='QUALITY'?DISTRICT:DISTRICT.filter((_,i)=>i%3===0);
  return (
    <group>
      {placements.map((item,index)=>(
        <AssetBoundary key={index} assetLabel={item.asset} asset={item.asset} fallback={null}>
          <Suspense fallback={null}>
            <SceneryObject item={item}/>
          </Suspense>
        </AssetBoundary>
      ))}
      {quality==='QUALITY' && <>
        <AssetBoundary assetLabel="aerial traffic A" asset="craft-speedera" fallback={null}>
          <Suspense fallback={null}><FlyingTraffic offset={.28} asset="craft-speedera"/></Suspense>
        </AssetBoundary>
        <AssetBoundary assetLabel="aerial traffic B" asset="craft-racer" fallback={null}>
          <Suspense fallback={null}><FlyingTraffic offset={.77} asset="craft-racer"/></Suspense>
        </AssetBoundary>
      </>}
    </group>
  );
}

/** Second craft choice: a properly licensed Kenney racer with ION-specific
 * engine nacelles and visual effects. The shared RaceEngine remains authoritative.
 */
export function KenneyRacer({game,shipRef,hullRef,paint}:{
  game:import('../simulation').RaceEngine;
  shipRef:React.RefObject<Group|null>;
  hullRef:React.RefObject<Group|null>;
  paint:string;
}){
  const flameLeft=useRef<Mesh>(null);
  const flameRight=useRef<Mesh>(null);
  const boostLight=useRef<PointLight>(null);
  useFrame(({clock})=>{
    const scale=game.isBoosting?1.65:.5;
    if(boostLight.current)boostLight.current.intensity=game.isBoosting?10:game.speed>5?3:1;
    for(const m of [flameLeft.current,flameRight.current]){
      if(!m)continue;
      m.visible=game.speed>5;
      m.scale.y=scale + Math.sin(clock.elapsedTime*23)*.15;
    }
  });
  return (
    <group ref={shipRef}>
      <group ref={hullRef}>
        <KenneyModel asset="craft-racer" width={7.7} tint={paint}/>
        {[-1,1].map((side,i)=>(
          <group key={side} position={[side*1.35,.72,-2.65]}>
            <mesh rotation={[Math.PI/2,0,0]}>
              <cylinderGeometry args={[.34,.46,1.25,18]}/>
              <meshStandardMaterial color="#172735" metalness={.82} roughness={.31}/>
            </mesh>
            <mesh position={[0,0,-.7]}>
              <torusGeometry args={[.31,.08,8,20]}/>
              <meshBasicMaterial color="#80effb" toneMapped={false}/>
            </mesh>
            <mesh ref={i===0?flameLeft:flameRight} position={[0,0,-1.2]} rotation={[-Math.PI/2,0,0]}>
              <coneGeometry args={[.28,1.45,14]}/>
              <meshBasicMaterial color="#7deaff" toneMapped={false} transparent opacity={.62} depthWrite={false}/>
            </mesh>
          </group>
        ))}
        <pointLight ref={boostLight} position={[0,.5,-2.3]} intensity={2} distance={17} color="#65edff"/>
      </group>
    </group>
  );
}
