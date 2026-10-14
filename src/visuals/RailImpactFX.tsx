import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DynamicDrawUsage, InstancedMesh, Object3D } from 'three';
import type { RaceEngine } from '../simulation';

/**
 * Per-impact GPU-instanced metal sparks. The only trigger is the original
 * RaceEngine.impact property; no synthetic collision authority is added.
 */
export function RailImpactFX({game,quality}:{
  game:RaceEngine;
  quality:'QUALITY'|'PERFORMANCE';
}){
  const mesh=useRef<InstancedMesh>(null);
  const count=quality==='QUALITY'?34:14;
  const transforms=useMemo(()=>new Object3D(),[]);
  const seeds=useMemo(()=>Array.from({length:count},(_,i)=>{
    const h=(Math.imul(i+3,1664525)+1013904223)>>>0;
    return {
      lateral:.2+(h%100)/100,
      rise:.15+((h>>>8)%100)/145,
      pitch:(((h>>>15)%100)/100-.5)*2,
      velocity:7+((h>>>3)%180)/12,
    };
  }),[count]);
  useEffect(()=>{
    if(mesh.current){
      mesh.current.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.current.frustumCulled=false;
    }
  },[]);
  useFrame(()=>{
    const sparks=mesh.current;
    if(!sparks)return;
    const impact=Math.max(0,game.impact);
    sparks.visible=impact>.02 && game.phase==='racing';
    if(!sparks.visible)return;
    const age=Math.min(1,1-impact);
    const side=game.impactSide;
    const sn=Math.sin(game.heading),cs=Math.cos(game.heading);
    const rx=cs,rz=-sn;
    for(let i=0;i<count;i++){
      const s=seeds[i],direction=(s.lateral*2-1);
      const distance=1+age*s.velocity;
      const lateral=side*(4.1+distance*direction*.67);
      const forward=distance*(i%2===0?.32:-.15);
      transforms.position.set(
        game.position.x+rx*lateral+sn*forward,
        game.position.y-.75+age*s.rise*9-age*age*9.8,
        game.position.z+rz*lateral+cs*forward,
      );
      transforms.rotation.set(s.pitch,game.heading,age*4+i*.8);
      transforms.scale.set(.055,.07,.38*(1-age)+.02);
      transforms.updateMatrix();
      sparks.setMatrixAt(i,transforms.matrix);
    }
    sparks.instanceMatrix.needsUpdate=true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined,undefined,count]} visible={false}>
      <boxGeometry args={[1,1,1]}/>
      <meshBasicMaterial color="#ffbe82" toneMapped={false} transparent opacity={.84}
        blending={AdditiveBlending} depthWrite={false}/>
    </instancedMesh>
  );
}
