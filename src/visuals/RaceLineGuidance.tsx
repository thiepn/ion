import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color, DoubleSide, DynamicDrawUsage, InstancedMesh,
  Matrix4, Object3D, Vector3,
} from 'three';
import { trackAt, ROAD_HALF_WIDTH } from '../track';
import type { RaceEngine } from '../simulation';

type Transform = { pos: Vector3; yaw: number; scale: [number, number, number] };
function buildMatrices(items: Transform[]): Matrix4[] {
  const tmp = new Object3D();
  return items.map(({pos,yaw,scale}) => {
    tmp.position.copy(pos);
    tmp.rotation.set(0,yaw,0);
    tmp.scale.set(...scale);
    tmp.updateMatrix();
    return tmp.matrix.clone();
  });
}

function RibbonInstances({data,color}: {data:Matrix4[];color:string}) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const mesh=ref.current;
    if(!mesh) return;
    for(let i=0;i<data.length;i++) mesh.setMatrixAt(i,data[i]);
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
  },[data]);
  return (
    <instancedMesh ref={ref} args={[undefined,undefined,data.length]} receiveShadow={false}>
      <boxGeometry args={[1,1,1]}/>
      <meshBasicMaterial color={color} toneMapped={false} side={DoubleSide}/>
    </instancedMesh>
  );
}

/**
 * Spline-driven guidance: shoulder stripes, corner approach dots and braking
 * references actually relate to the racing line. No second track or collision.
 */
export function RaceLineGuidance({game,quality}:{
  game:RaceEngine; quality:'QUALITY'|'PERFORMANCE';
}) {
  const {shoulders,cornerLights,brakeBoards}=useMemo(()=>{
    const shoulders:Transform[]=[];
    const cornerLights:Transform[]=[];
    const brakeBoards:Transform[]=[];
    const density=quality==='QUALITY'?150:80;
    for(let i=0;i<density;i++){
      const t=(i+.35)/density;
      const {position,right,tangent}=trackAt(t);
      const yaw=Math.atan2(tangent.x,tangent.z);
      for(const side of [-1,1]){
        shoulders.push({
          pos:new Vector3(position.x+right.x*(ROAD_HALF_WIDTH-.6)*side,
            position.y+.24,position.z+right.z*(ROAD_HALF_WIDTH-.6)*side),
          yaw,scale:[.35,.055,2.3],
        });
      }
    }
    // More luminous warnings on higher-curvature sections; no random signage.
    for(let i=0;i<80;i++){
      const t=i/80;
      const prior=trackAt(t-.012).tangent;
      const next=trackAt(t+.012).tangent;
      const curvature=Math.atan2(prior.x*next.z-prior.z*next.x,
        prior.x*next.x+prior.z*next.z);
      if(Math.abs(curvature)<.07)continue;
      const p=trackAt(t);
      const yaw=Math.atan2(p.tangent.x,p.tangent.z);
      const outside=Math.sign(curvature) || 1;
      cornerLights.push({
        pos:new Vector3(p.position.x+p.right.x*outside*(ROAD_HALF_WIDTH+1.3),
          p.position.y+1.25,p.position.z+p.right.z*outside*(ROAD_HALF_WIDTH+1.3)),
        yaw,scale:[.55,1.65,.2],
      });
      // Additional road-side vertical marker offset ahead of the apex.
      if(i%4===0)brakeBoards.push({
        pos:new Vector3(p.position.x-p.tangent.x*23+p.right.x*outside*(ROAD_HALF_WIDTH+2.4),
          p.position.y+3.3,p.position.z-p.tangent.z*23+p.right.z*outside*(ROAD_HALF_WIDTH+2.4)),
        yaw,scale:[.28,4.8,2.3],
      });
    }
    return {
      shoulders:buildMatrices(shoulders),
      cornerLights:buildMatrices(cornerLights),
      brakeBoards:buildMatrices(brakeBoards),
    };
  },[quality]);

  const gateRef=useRef<InstancedMesh>(null);
  const gateTransforms=useMemo(()=>{
    const locations=[0,.25,.5,.75];
    const transforms:Transform[]=[];
    locations.forEach(t=>{
      const {position,right,tangent}=trackAt(t);
      for(const side of [-1,1]){
        transforms.push({
          pos:new Vector3(position.x+right.x*side*(ROAD_HALF_WIDTH+1.45),
            position.y+3.5,position.z+right.z*side*(ROAD_HALF_WIDTH+1.45)),
          yaw:Math.atan2(tangent.x,tangent.z),
          scale:[.6,7,.6],
        });
      }
    });
    return buildMatrices(transforms);
  },[]);
  const previous=useRef(-1);
  const lastUpdate=useRef(0);
  useEffect(()=>{
    const mesh=gateRef.current;
    if(!mesh)return;
    for(let i=0;i<gateTransforms.length;i++)mesh.setMatrixAt(i,gateTransforms[i]);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
    previous.current=-1;
  },[gateTransforms]);
  useFrame(({clock})=>{
    const mesh=gateRef.current;
    if(!mesh || clock.elapsedTime-lastUpdate.current<.13)return;
    lastUpdate.current=clock.elapsedTime;
    const active=game.phase==='racing'||game.phase==='countdown';
    // Four beacon pairs correspond to the upcoming sectors 0..3. At the
    // start of the run sector 0, not sector 1, must be the next target.
    const next=active?Math.min(3,game.checkpoints):0;
    if(previous.current===next)return;
    previous.current=next;
    for(let i=0;i<8;i++){
      const sector=Math.floor(i/2);
      mesh.setColorAt(i,new Color(sector===next?'#ffa56d':sector<next?'#74e0ce':'#456f80'));
    }
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  });
  return (
    <group>
      <RibbonInstances data={shoulders} color="#58a9c0"/>
      <RibbonInstances data={cornerLights} color="#eda371"/>
      <RibbonInstances data={brakeBoards} color="#d7e2e4"/>
      <instancedMesh ref={gateRef} args={[undefined,undefined,gateTransforms.length]} castShadow={false}>
        <boxGeometry args={[1,1,1]}/>
        <meshBasicMaterial color="#ffffff" toneMapped={false}/>
      </instancedMesh>
    </group>
  );
}
