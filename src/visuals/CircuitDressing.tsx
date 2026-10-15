import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture, DoubleSide, InstancedMesh, Object3D,
  SRGBColorSpace, Vector3,
} from 'three';
import { CIRCUIT_SECTIONS, ROAD_HALF_WIDTH, trackAt } from '../track';
import { emissiveAmber, emissiveCyan } from './Rendering';

function panelTexture(title:string,subtitle:string):CanvasTexture|null {
  const canvas=document.createElement('canvas');
  canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d');
  if(!c) return null;
  c.fillStyle='#111f2c';c.fillRect(0,0,1024,256);
  c.fillStyle='#83e9ec';c.fillRect(28,22,9,212);
  c.fillStyle='#e6f1f3';c.font='900 126px Arial,sans-serif';
  // Make the longest actual section name readable rather than letting the
  // canvas clip the end of NORTH CREST or HOMECOMING.
  c.fillText(title,68,152,780);
  c.fillStyle='#f1ab7d';c.font='700 27px Arial,sans-serif';c.fillText(subtitle,72,205);
  c.fillStyle='#4c7080';c.fillRect(60,24,915,2);
  c.fillRect(60,225,915,2);
  for(let i=0;i<8;i++){
    c.fillStyle=i%2?'#dbedf0':'#83e9ec';
    c.fillRect(880+i*12,45,7,70);
  }
  const texture=new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

function SignalBridge({section}: {section:(typeof CIRCUIT_SECTIONS)[number]}) {
  const {t,name,hint}=section;
  const {position,tangent}=trackAt(t);
  const yaw=Math.atan2(tangent.x,tangent.z);
  const texture=useMemo(()=>panelTexture(name,hint),[name,hint]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  return (
    <group position={[position.x,position.y,position.z]} rotation={[0,yaw,0]}>
      {[-15.8,15.8].map(side=>(
        <group key={side}>
          <mesh position={[side,7.2,0]} castShadow>
            <boxGeometry args={[1.25,14.4,1.25]}/>
            <meshStandardMaterial color="#182c3c" metalness={.83} roughness={.34}/>
          </mesh>
          <mesh position={[side,7.2,-.67]}>
            <boxGeometry args={[.12,12.3,.12]}/>
            <meshBasicMaterial color={emissiveCyan} toneMapped={false}/>
          </mesh>
          {[3.2,7.7,11.2].map(y=>(
            <mesh key={y} position={[side>0?side-.55:side+.55,y,0]}>
              <boxGeometry args={[1.4,.27,1.6]}/>
              <meshStandardMaterial color="#3f6370" metalness={.65} roughness={.4}/>
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0,14.6,0]} castShadow>
        <boxGeometry args={[32.8,2.2,1.5]}/>
        <meshStandardMaterial color="#1d3445" metalness={.77} roughness={.42}/>
      </mesh>
      <mesh position={[0,15.45,-.16]}>
        <boxGeometry args={[30.5,.14,1.68]}/>
        <meshBasicMaterial color={emissiveAmber} toneMapped={false}/>
      </mesh>
      <mesh position={[0,12.85,-.82]}>
        <planeGeometry args={[18.5,4.5]}/>
        <meshBasicMaterial map={texture??undefined} color={texture?'#ffffff':'#294656'}
          side={DoubleSide} toneMapped={false}/>
      </mesh>
      <mesh position={[0,10.34,-.84]}>
        <boxGeometry args={[20.2,.14,.2]}/>
        <meshBasicMaterial color={emissiveCyan} toneMapped={false}/>
      </mesh>
      {[0,1,2,3,4,5].map(i=>(
        <mesh key={i} position={[-12+i*4.8,14.2,-.89]}>
          <boxGeometry args={[.25,.34,.12]}/>
          <meshBasicMaterial color={i<3?emissiveAmber:emissiveCyan} toneMapped={false}/>
        </mesh>
      ))}
    </group>
  );
}

function BarrierSystem(){
  const posts=useMemo(()=>{
    const arr:{position:Vector3;heading:number}[]=[];
    for(let i=0;i<200;i++){
      const t=i/100;
      const {position,tangent,right}=trackAt(t);
      const side=i%2===0?-1:1;
      arr.push({
        position:new Vector3(
          position.x+right.x*(ROAD_HALF_WIDTH+1.0)*side,
          position.y+1.1,
          position.z+right.z*(ROAD_HALF_WIDTH+1.0)*side
        ),
        heading:Math.atan2(tangent.x,tangent.z),
      });
    }
    return arr;
  },[]);
  const postsRef=useRef<InstancedMesh>(null);
  const bandsRef=useRef<InstancedMesh>(null);
  useEffect(()=>{
    if(!postsRef.current||!bandsRef.current)return;
    const dummy=new Object3D();
    for(let i=0;i<posts.length;i++){
      dummy.position.copy(posts[i].position);
      dummy.rotation.y=posts[i].heading;
      dummy.scale.set(.47,2.25,.74);
      dummy.updateMatrix();
      postsRef.current.setMatrixAt(i,dummy.matrix);
      dummy.position.y+=.7;
      dummy.scale.set(.52,.16,.75);
      dummy.updateMatrix();
      bandsRef.current.setMatrixAt(i,dummy.matrix);
    }
    postsRef.current.instanceMatrix.needsUpdate=true;
    bandsRef.current.instanceMatrix.needsUpdate=true;
    postsRef.current.computeBoundingSphere();
    bandsRef.current.computeBoundingSphere();
  },[posts]);
  return (
    <group>
      <instancedMesh ref={postsRef} args={[undefined,undefined,posts.length]}>
        <boxGeometry args={[1,1,1]}/>
        <meshStandardMaterial color="#344858" metalness={.73} roughness={.39}/>
      </instancedMesh>
      <instancedMesh ref={bandsRef} args={[undefined,undefined,posts.length]} frustumCulled={false}>
        <boxGeometry args={[1,1,1]}/>
        <meshBasicMaterial toneMapped={false} color={emissiveCyan}/>
      </instancedMesh>
    </group>
  );
}

function DirectionSignals({quality}:{quality:'QUALITY'|'PERFORMANCE'}){
  const cornerMarkers=useMemo(()=>{
    const markers:{t:number;side:number}[]=[];
    for(let i=2;i<58;i++){
      const t=i/60;
      const {tangent:a}=trackAt(t-.006);
      const {tangent:b}=trackAt(t+.006);
      const turn=a.x*b.z-a.z*b.x;
      if(Math.abs(turn)>.028 && i%3===0)
        markers.push({t,side:turn>0?1:-1});
    }
    return markers;
  },[]);
  return (
    <group>
      {(quality==='QUALITY'?cornerMarkers:cornerMarkers.filter((_,i)=>i%2===0)).map(({t,side},idx)=>{
        const {position,right,tangent}=trackAt(t);
        const yaw=Math.atan2(tangent.x,tangent.z);
        return (
          <group key={idx} position={[
            position.x+right.x*(ROAD_HALF_WIDTH+2.6)*side,
            position.y+3.8,
            position.z+right.z*(ROAD_HALF_WIDTH+2.6)*side,
          ]} rotation={[0,yaw,0]}>
            <mesh>
              <boxGeometry args={[.22,5.2,2.3]}/>
              <meshStandardMaterial color="#213e50" metalness={.74}/>
            </mesh>
            {[0,1,2].map(k=>(
              <mesh key={k} position={[0,1.35-k*1.1,-1.23]}
                rotation={[0,0,side*(Math.PI/4)]}>
                <boxGeometry args={[.15,.92,.1]}/>
                <meshBasicMaterial color={emissiveAmber} toneMapped={false}/>
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
function CoolingTowers({quality}:{quality:'QUALITY'|'PERFORMANCE'}){
  const positions=useMemo(()=>[.075,.28,.54,.83].map(t=>{
    const {position,right,tangent}=trackAt(t);
    const side=t>.5?-1:1;
    return {
      xyz:[position.x+right.x*70*side,position.y-9,position.z+right.z*70*side] as [number,number,number],
      yaw:Math.atan2(tangent.x,tangent.z)
    };
  }),[]);
  return (
    <group>
      {(quality==='QUALITY'?positions:positions.filter((_,i)=>i%2===0)).map((x,i)=>(
        <group key={i} position={x.xyz} rotation={[0,x.yaw,0]}>
          <mesh position={[0,21,0]} castShadow>
            <cylinderGeometry args={[8,12,42,8]}/>
            <meshStandardMaterial color="#233d4d" metalness={.47} roughness={.57}/>
          </mesh>
          {[7,17,27,38].map(y=>(
            <mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}>
              <torusGeometry args={[9,0.3,5,8]}/>
              <meshBasicMaterial color={i%2?emissiveAmber:emissiveCyan} toneMapped={false}/>
            </mesh>
          ))}
          <mesh position={[0,46,0]}>
            <cylinderGeometry args={[3.2,4.5,12,8]}/>
            <meshStandardMaterial color="#1e3546" metalness={.62} roughness={.5}/>
          </mesh>
          <mesh position={[0,53,0]}>
            <sphereGeometry args={[2.5,12,8]}/>
            <meshBasicMaterial color={i%2?emissiveAmber:emissiveCyan} toneMapped={false}/>
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function CircuitDressing({quality}:{quality:'QUALITY'|'PERFORMANCE'}){
  return (
    <group>
      <BarrierSystem/>
      <DirectionSignals quality={quality}/>
      <CoolingTowers quality={quality}/>
      {/* All five major sections are signposted even in PERFORMANCE mode;
          they are track wayfinding, not optional decorative scenery. */}
      {CIRCUIT_SECTIONS.map(section=>(
        <SignalBridge key={section.name} section={section}/>
      ))}
    </group>
  );
}

