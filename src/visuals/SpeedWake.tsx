import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Group, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import type { RaceEngine } from '../simulation';

/** Small, GPU-instanced, camera-independent speed cues. Purely visual. */
export function SpeedWake({game,quality,reducedMotion}:{
  game:RaceEngine;
  quality:'QUALITY'|'PERFORMANCE';
  reducedMotion:boolean;
}) {
  const group=useRef<Group>(null);
  const streaks=useRef<InstancedMesh>(null);
  const glow=useRef<MeshBasicMaterial>(null);
  const count=quality==='QUALITY'?36:12;
  const dummy=useMemo(()=>new Object3D(),[]);
  const seeds=useMemo(()=>Array.from({length:count},(_,i)=>{
    const h=(i*1664525+1013904223)>>>0;
    const u=h/4294967296;
    return { x:(u-.5)*11, height:(i%5)*.20-.8, gap:(i*.6180339887)%1 };
  }),[count]);
  useEffect(()=>{
    if(streaks.current){
      streaks.current.instanceMatrix.setUsage(35048); // DynamicDrawUsage
      streaks.current.frustumCulled=false;
    }
  },[count]);
  useFrame(({clock})=>{
    const active=!reducedMotion&&game.phase==='racing'&&game.speed>31;
    if(!group.current||!streaks.current)return;
    group.current.visible=active;
    if(!active)return;
    group.current.position.copy(game.position);
    group.current.rotation.y=game.heading;
    const travel=clock.elapsedTime*(8+game.speed*.60);
    const power=Math.min(1,Math.max(0,(game.speed-31)/85));
    const stretch=.48+power*1.35;
    if(glow.current)glow.current.opacity=
      Math.min(.31,.10+power*.12+((game.isBoosting||game.padSurge)?.07:0));
    for(let i=0;i<count;i++){
      const seed=seeds[i];
      const phase=((seed.gap*100+travel)%85);
      dummy.position.set(seed.x,seed.height,-3.6-phase);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(.045,.055,(1.6+((i%7)*.31))*stretch);
      dummy.updateMatrix();
      streaks.current.setMatrixAt(i,dummy.matrix);
    }
    streaks.current.instanceMatrix.needsUpdate=true;
  });
  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={streaks} args={[undefined,undefined,count]}>
        <boxGeometry args={[1,1,1]}/>
        <meshBasicMaterial ref={glow} color="#94ebef" opacity={.10} transparent
          blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
      </instancedMesh>
    </group>
  );
}
