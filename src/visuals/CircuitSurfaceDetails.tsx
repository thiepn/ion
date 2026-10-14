import { useEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { trackAt, ROAD_HALF_WIDTH } from '../track';

/** Finishing grid and turn-in cues stamped onto the true authoritative road. */
type Marker={x:number;y:number;z:number;heading:number;width:number;depth:number};
function makeMarkers(quality:'QUALITY'|'PERFORMANCE'){
  const grid:Marker[]=[];
  const caution:Marker[]=[];
  const fastline:Marker[]=[];
  // 24 staggered launch chequers across the actual track centerline.
  for(let row=0;row<5;row++){
    const t=(row-.5)/1800;
    const section=trackAt(t);
    const heading=Math.atan2(section.tangent.x,section.tangent.z);
    for(let column=0;column<12;column++){
      if((column+row)%2!==0)continue;
      const offset=-ROAD_HALF_WIDTH+1.1+column*((ROAD_HALF_WIDTH*2-2.2)/12);
      grid.push({
        x:section.position.x+section.right.x*offset,
        y:section.position.y+.235,
        z:section.position.z+section.right.z*offset,
        heading,width:1.6,depth:1.7,
      });
    }
  }
  // Stripe rhythm rises at real bends, not randomly in straight sections.
  const steps=quality==='QUALITY'?120:60;
  for(let i=0;i<steps;i++){
    const t=(i+.3)/steps;
    const at=trackAt(t);
    const prior=trackAt(t-.008);
    const ahead=trackAt(t+.008);
    const curvature=prior.tangent.x*ahead.tangent.z-prior.tangent.z*ahead.tangent.x;
    const heading=Math.atan2(at.tangent.x,at.tangent.z);
    if(Math.abs(curvature)>.045 && i%2===0){
      const side=Math.sign(curvature);
      const width=ROAD_HALF_WIDTH-3.5;
      caution.push({
        x:at.position.x+at.right.x*width*side,
        y:at.position.y+.24,
        z:at.position.z+at.right.z*width*side,
        heading:heading+side*.5,width:.22,depth:3.4,
      });
    }
    if(i%4===0){
      const offset=0;
      fastline.push({
        x:at.position.x+at.right.x*offset,
        y:at.position.y+.21,
        z:at.position.z+at.right.z*offset,
        heading,width:.15,depth:1.2,
      });
    }
  }
  return {grid,caution,fastline};
}

function Batch({markers,color,emissive}:{
  markers:Marker[];color:string;emissive?:boolean;
}){
  const ref=useRef<InstancedMesh>(null);
  useEffect(()=>{
    if(!ref.current)return;
    const helper=new Object3D();
    markers.forEach((m,i)=>{
      helper.position.set(m.x,m.y,m.z);
      helper.rotation.set(0,m.heading,0);
      helper.scale.set(m.width,.03,m.depth);
      helper.updateMatrix();
      ref.current!.setMatrixAt(i,helper.matrix);
    });
    ref.current.instanceMatrix.needsUpdate=true;
    ref.current.computeBoundingSphere();
  },[markers]);
  return (
    <instancedMesh ref={ref} args={[undefined,undefined,markers.length]}>
      <boxGeometry args={[1,1,1]}/>
      {emissive?
        <meshBasicMaterial color={color} toneMapped={false}/>:
        <meshStandardMaterial color={color} metalness={.25} roughness={.53} emissive={color} emissiveIntensity={.18}/>}
    </instancedMesh>
  );
}

export function CircuitSurfaceDetails({quality}:{quality:'QUALITY'|'PERFORMANCE'}){
  const items=useMemo(()=>makeMarkers(quality),[quality]);
  return <group>
    <Batch markers={items.grid} color="#dce9e8"/>
    <Batch markers={items.caution} color="#ffaa68" emissive/>
    <Batch markers={items.fastline} color="#5d96a7"/>
  </group>;
}
