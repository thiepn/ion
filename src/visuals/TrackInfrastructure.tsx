import { useEffect, useMemo, useRef } from 'react';
import {
  Color, InstancedMesh, Matrix4, Object3D, Vector3
} from 'three';
import { ROAD_HALF_WIDTH, trackAt } from '../track';
import { sectionVisualAt } from './sectionPalette';

type Quality = 'QUALITY' | 'PERFORMANCE';

function frame(t: number) {
  const {position,tangent,right}=trackAt(t);
  return { position, tangent, right, yaw:Math.atan2(tangent.x,tangent.z) };
}

function useMatrices(records: {position:Vector3; yaw:number; scale:[number,number,number]; tilt?:number}[]) {
  return useMemo(()=>{
    const dummy=new Object3D();
    return records.map(record=>{
      dummy.position.copy(record.position);
      dummy.rotation.set(0,record.yaw,record.tilt ?? 0);
      dummy.scale.set(...record.scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  },[records]);
}

function BakedInstances({
  matrices, color, colors, metalness=.55, roughness=.45, emissive=false
}:{
  matrices: Matrix4[];
  color:string;
  colors?:string[];
  metalness?:number;
  roughness?:number;
  emissive?:boolean;
}) {
  const mesh=useRef<InstancedMesh>(null);
  useEffect(()=>{
    if(!mesh.current)return;
    matrices.forEach((m,i)=>{
      mesh.current!.setMatrixAt(i,m);
      if(colors)mesh.current!.setColorAt(i,new Color(colors[i]));
    });
    mesh.current.instanceMatrix.needsUpdate=true;
    if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
    mesh.current.computeBoundingSphere();
  },[matrices,colors]);
  if(!matrices.length)return null;
  return (
    <instancedMesh ref={mesh} args={[undefined,undefined,matrices.length]} castShadow={!emissive} receiveShadow={!emissive}>
      <boxGeometry args={[1,1,1]}/>
      {emissive?
        <meshBasicMaterial color={color} toneMapped={false}/>:
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness}/>}
    </instancedMesh>
  );
}

/**
 * Tracks are real structural objects instead of a thin ungrounded ribbon.
 * Geometry is instanced and shares the original track's authoritative spline;
 * it never changes collision, checkpoints or lap progression.
 */
function SuspendedDeck({quality}:{quality:Quality}) {
  const data=useMemo(()=>{
    const ribs: {position:Vector3;yaw:number;scale:[number,number,number]}[]=[];
    const spines: typeof ribs=[];
    const conduits: typeof ribs=[];
    const count=quality==='QUALITY'?240:120;
    for(let i=0;i<count;i++){
      const f=frame(i/count);
      const y=f.position.y-1.4;
      ribs.push({position:new Vector3(f.position.x,y,f.position.z),yaw:f.yaw,scale:[ROAD_HALF_WIDTH*2+2.8,.48,.45]});
      if(i%3===0){
        for(const side of [-1,1]){
          spines.push({
            position:new Vector3(f.position.x+f.right.x*(ROAD_HALF_WIDTH-1.8)*side,y-.77,f.position.z+f.right.z*(ROAD_HALF_WIDTH-1.8)*side),
            yaw:f.yaw,scale:[.67,1.9,1.25]
          });
        }
      }
      if(i%2===0){
        for(const side of [-1,1]){
          conduits.push({
            position:new Vector3(f.position.x+f.right.x*(ROAD_HALF_WIDTH+1.4)*side,f.position.y-.38,f.position.z+f.right.z*(ROAD_HALF_WIDTH+1.4)*side),
            yaw:f.yaw,scale:[.55,.48,3.8]
          });
        }
      }
    }
    return {ribs,spines,conduits};
  },[quality]);
  const ribMatrices=useMatrices(data.ribs);
  const spineMatrices=useMatrices(data.spines);
  const conduitMatrices=useMatrices(data.conduits);
  return (
    <group>
      <BakedInstances matrices={ribMatrices} color="#263f4e" metalness={.77}/>
      <BakedInstances matrices={spineMatrices} color="#1b3544" metalness={.82}/>
      <BakedInstances matrices={conduitMatrices} color="#36566a" metalness={.67}/>
    </group>
  );
}

function RoadGuides({quality}:{quality:Quality}) {
  const {strips,directionals,stripColors,directionalColors}=useMemo(()=>{
    const strips: {position:Vector3;yaw:number;scale:[number,number,number]}[]=[];
    const directionals: typeof strips=[];
    const stripColors:string[]=[];
    const directionalColors:string[]=[];
    const count=quality==='QUALITY'?160:80;
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;
      const f=frame(t);
      const section=sectionVisualAt(t);
      for(const side of [-1,1]){
        const offset=ROAD_HALF_WIDTH-1.9;
        strips.push({
          position:new Vector3(f.position.x+f.right.x*offset*side,f.position.y+.24,f.position.z+f.right.z*offset*side),
          yaw:f.yaw,scale:[.24,.09,1.58]
        });
        stripColors.push(section.edge);
      }
      if(i%4===0){
        for(const side of [-1,1]){
          directionals.push({
            position:new Vector3(f.position.x+f.right.x*3.7*side,f.position.y+.22,f.position.z+f.right.z*3.7*side),
            yaw:f.yaw+side*.55,scale:[.25,.045,2.5]
          });
          directionalColors.push(section.accent);
        }
      }
    }
    return {strips,directionals,stripColors,directionalColors};
  },[quality]);
  const stripMatrices=useMatrices(strips);
  const arrowMatrices=useMatrices(directionals);
  return (
    <group>
      <BakedInstances matrices={stripMatrices} color="#ffffff" colors={stripColors} emissive/>
      <BakedInstances matrices={arrowMatrices} color="#ffffff" colors={directionalColors} emissive/>
    </group>
  );
}

type Port={position:Vector3;yaw:number;scale:[number,number,number]};
function TrackCanopies({quality}:{quality:Quality}) {
  const {arches,beams,lamps,lampColors}=useMemo(()=>{
    const arches:Port[]=[];
    const beams:Port[]=[];
    const lamps:Port[]=[];
    const lampColors:string[]=[];
    const centers=quality==='QUALITY'?[.28,.64,.88]:[.28,.64];
    for(const center of centers){
      for(let i=0;i<8;i++){
        const t=center+(i-3.5)*.0045;
        const f=frame(t);
        const section=sectionVisualAt(t);
        const radius=ROAD_HALF_WIDTH+3.0;
        for(const side of [-1,1]){
          arches.push({
            position:new Vector3(f.position.x+f.right.x*radius*side,f.position.y+6.4,f.position.z+f.right.z*radius*side),
            yaw:f.yaw,scale:[.94,12.8,1.22]
          });
          lamps.push({
            position:new Vector3(f.position.x+f.right.x*(radius-.58)*side,f.position.y+8.1,f.position.z+f.right.z*(radius-.58)*side),
            yaw:f.yaw,scale:[.17,6.2,.19]
          });
          lampColors.push(section.edge);
        }
        beams.push({
          position:new Vector3(f.position.x,f.position.y+12.85,f.position.z),
          yaw:f.yaw,scale:[radius*2+.85,.9,1.35]
        });
        lamps.push({
          position:new Vector3(f.position.x,f.position.y+12.28,f.position.z),
          yaw:f.yaw,scale:[radius*2-.35,.12,.28]
        });
        lampColors.push(section.accent);
      }
    }
    return {arches,beams,lamps,lampColors};
  },[quality]);
  const archMatrices=useMatrices(arches);
  const beamMatrices=useMatrices(beams);
  const lampMatrices=useMatrices(lamps);
  return (
    <group>
      <BakedInstances matrices={archMatrices} color="#223e4d" metalness={.84}/>
      <BakedInstances matrices={beamMatrices} color="#304e60" metalness={.74}/>
      <BakedInstances matrices={lampMatrices} color="#ffffff" colors={lampColors} emissive/>
    </group>
  );
}

export function TrackInfrastructure({quality}:{quality:Quality}) {
  return (
    <group>
      <SuspendedDeck quality={quality}/>
      <RoadGuides quality={quality}/>
      <TrackCanopies quality={quality}/>
    </group>
  );
}
