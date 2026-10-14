import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry, Float32BufferAttribute, InstancedMesh, Object3D, Color, DoubleSide,
} from 'three';

type Quality='QUALITY'|'PERFORMANCE';

/** Hand-authored procedural industrial escarpment, not an external terrain asset. */
function ridgeGeometry(radius:number, height:number, seed:number, segments:number) {
  const positions:number[]=[];
  const indices:number[]=[];
  const tones:number[]=[];
  const levels=4;
  const base=-25;
  const wave=(x:number) =>
    .55*Math.sin(x*3+seed)+.32*Math.sin(x*7+seed*1.6)+.13*Math.sin(x*21+seed*.6);
  for(let i=0;i<=segments;i++){
    const t=i/segments*Math.PI*2;
    const shape=wave(t);
    const outer=radius+(shape*13);
    for(let level=0;level<=levels;level++){
      const u=level/levels;
      const r=outer+u*(40+radius*.11);
      const y=base+height*(1-u)*( .72+.28*Math.sin(t*5+seed*.9))+(u*7);
      positions.push(Math.sin(t)*r,y,Math.cos(t)*r);
      const shade=(.63+.16*shape+.20*u);
      tones.push(shade*.55,shade*.72,shade*.86);
      if(i<segments && level<levels){
        const a=i*(levels+1)+level;
        const b=a+levels+1;
        indices.push(a,a+1,b, a+1,b+1,b);
      }
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new Float32BufferAttribute(tones,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function RidgeLandscape({quality}:{quality:Quality}){
  const ridges=useMemo(()=>{
    const segs=quality==='QUALITY'?320:128;
    return [
      ridgeGeometry(340,49,3.8,segs),
      ridgeGeometry(445,94,1.6,segs),
      ridgeGeometry(580,136,4.7,segs),
    ];
  },[quality]);
  useEffect(()=>()=>ridges.forEach(g=>g.dispose()),[ridges]);
  return (
    <group>
      {ridges.map((geometry,i)=>(
        <mesh geometry={geometry} key={i} receiveShadow={false}>
          <meshStandardMaterial vertexColors metalness={i===0?.22:.03}
            roughness={.88} side={DoubleSide} flatShading={false}/>
        </mesh>
      ))}
    </group>
  );
}

function RadioMasts({quality}:{quality:Quality}){
  const count=quality==='QUALITY'?54:20;
  const body=useRef<InstancedMesh>(null);
  const tips=useRef<InstancedMesh>(null);
  const specs=useMemo(()=>Array.from({length:count},(_,i)=>{
    const angle=(i*.61803398875%1)*Math.PI*2;
    const dist=250+(i%6)*32;
    const height=18+(i*31%52);
    return {
      x:Math.cos(angle)*dist,z:Math.sin(angle)*dist,
      y:-25+height/2,height,
    };
  }),[count]);
  useEffect(()=>{
    if(!body.current||!tips.current)return;
    const dummy=new Object3D();
    for(let i=0;i<specs.length;i++){
      const p=specs[i];
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(.65,p.height,.65);
      dummy.updateMatrix();
      body.current.setMatrixAt(i,dummy.matrix);
      dummy.position.y=-25+p.height+.85;
      dummy.scale.set(1.45,1.45,1.45);
      dummy.updateMatrix();
      tips.current.setMatrixAt(i,dummy.matrix);
      tips.current.setColorAt(i,new Color(i%3===0?'#fda780':'#65bccc'));
    }
    body.current.instanceMatrix.needsUpdate=true;
    tips.current.instanceMatrix.needsUpdate=true;
    if(tips.current.instanceColor)tips.current.instanceColor.needsUpdate=true;
    body.current.computeBoundingSphere();
    tips.current.computeBoundingSphere();
  },[specs]);
  return (
    <group>
      <instancedMesh ref={body} args={[undefined,undefined,count]} castShadow={false}>
        <cylinderGeometry args={[.18,.4,1,7]}/>
        <meshStandardMaterial color="#57707d" metalness={.77} roughness={.48}/>
      </instancedMesh>
      <instancedMesh ref={tips} args={[undefined,undefined,count]}>
        <icosahedronGeometry args={[1,0]}/>
        <meshBasicMaterial color="#ffffff" toneMapped={false}/>
      </instancedMesh>
    </group>
  );
}

export function IndustrialHorizon({quality}:{quality:Quality}){
  return <group>
    <RidgeLandscape quality={quality}/>
    <RadioMasts quality={quality}/>
  </group>;
}
