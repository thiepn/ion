import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending, Color, DynamicDrawUsage, Group, InstancedMesh, Mesh,
  Object3D, TorusGeometry,
} from 'three';
import type { RaceEngine } from '../simulation';

/**
 * Original, engine-driven magnetic propulsion wake. One instanced torus draw,
 * shared colors and geometry. Neither reads nor writes a second race state.
 */
export function BoostFX({game,quality}:{
  game:RaceEngine;quality:'QUALITY'|'PERFORMANCE';
}){
  const group=useRef<Group>(null);
  const rings=useRef<InstancedMesh>(null);
  const core=useRef<Mesh>(null);
  const count=quality==='QUALITY'?32:12;
  const nodes=useMemo(()=>Array.from({length:count},(_,i)=>({
    x:i%2===0?-1.07:1.07,
    offset:(Math.floor(i/2)+.5)/Math.ceil(count/2),
    wave:i*2.39996,
  })),[count]);
  const dummy=useMemo(()=>new Object3D(),[]);
  const geometry=useMemo(()=>new TorusGeometry(.29,.035,5,15),[]);
  const cyan=useMemo(()=>new Color('#67e4fb'),[]);
  const amber=useMemo(()=>new Color('#ff9d66'),[]);
  useEffect(()=>()=>{
    geometry.dispose();
  },[geometry]);
  useEffect(()=>{
    const mesh=rings.current;
    if(mesh)mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  },[count]);
  useFrame(({clock})=>{
    const node=group.current,mesh=rings.current;
    if(!node||!mesh)return;
    const active=game.phase==='racing'&&game.speed>12;
    node.visible=active;
    if(!active)return;
    node.position.copy(game.position);
    node.rotation.set(0,game.heading,0);
    const boost=game.isBoosting;
    const power=Math.min(1,game.speed/100);
    const length=boost?19+power*10:5+power*9;
    const width=boost?1.9:1.05;
    const progress=clock.elapsedTime*(boost?1.75:.85);
    for(let i=0;i<nodes.length;i++){
      const item=nodes[i];
      const pct=(item.offset+progress)%1;
      dummy.position.set(item.x,-.08+Math.sin(pct*7+item.wave)*.035,-3.1-pct*length);
      dummy.rotation.set(0,0,0);
      const scale=(.40+pct*width)*(boost?1.13:.74);
      dummy.scale.set(scale,scale,.45+pct*.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,boost&&i%4===0?amber:cyan);
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    const coreMesh=core.current;
    if(coreMesh)coreMesh.scale.y=boost?2.4:1.1;
  });
  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={rings} args={[geometry,undefined,count]} frustumCulled={false}>
        <meshBasicMaterial color="#ffffff" transparent opacity={.38} blending={AdditiveBlending}
          depthWrite={false} toneMapped={false}/>
      </instancedMesh>
      <mesh ref={core} position={[0,-.3,-4.5]} rotation={[-Math.PI/2,0,0]}>
        <cylinderGeometry args={[.22,.08,2.4,12]}/>
        <meshBasicMaterial color="#74cddd" transparent opacity={.12} blending={AdditiveBlending}
          toneMapped={false} depthWrite={false}/>
      </mesh>
    </group>
  );
}
