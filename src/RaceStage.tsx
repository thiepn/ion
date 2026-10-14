import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { World } from './World';
import type { InputController, RaceEngine, RaceSnapshot } from './simulation';

type Props = {
  game: RaceEngine;
  input: InputController;
  cameraMode: 'CHASE'|'NEAR';
  paint: string;
  showcase: boolean;
  quality: 'QUALITY'|'PERFORMANCE';
  craftKind: 'KESTREL'|'RACER';
  onSnapshot:(snapshot:RaceSnapshot)=>void;
  onRendererFailure:(reason:string)=>void;
};

/** Bound the pixel cost of quality presets across high-density mobile screens,
 * landscape rotation and high-resolution desktop monitors.
 */
function resolutionBudget(quality:Props['quality']):number {
  if(typeof window==='undefined')return 1;
  const pixels=Math.max(1,window.innerWidth*window.innerHeight);
  const pixelBudget=quality==='QUALITY'?2_200_000:1_100_000;
  const preference=Math.min(window.devicePixelRatio||1,quality==='QUALITY'?1.55:1.1);
  // An absolute .65 DPR floor exceeded the declared pixel budget on 4K/8K
  // screens. Honor the true pixel budget even on very dense displays.
  return Math.min(preference,Math.sqrt(pixelBudget/pixels));
}

/** The loss listener lives only as long as its particular WebGL canvas.
 * Avoid stale events from abandoned renderers pausing a recovered race.
 */
function GraphicsContextObserver({onFailure}:{onFailure:(reason:string)=>void}){
  const gl=useThree(state=>state.gl);
  useEffect(()=>{
    const canvas=gl.domElement;
    let failed=false;
    const onLost=(event:Event)=>{
      event.preventDefault();
      if(failed)return;
      failed=true;
      onFailure('The browser interrupted the WebGL graphics context');
    };
    canvas.addEventListener('webglcontextlost',onLost);
    return ()=>canvas.removeEventListener('webglcontextlost',onLost);
  },[gl,onFailure]);
  return null;
}

/** Lazy loaded Three.js application code, separate from the lightweight UI. */
export default function RaceStage(props:Props){
  const {quality,onRendererFailure}=props;
  const [dpr,setDpr]=useState(()=>resolutionBudget(quality));
  useEffect(()=>{
    const update=()=>setDpr(resolutionBudget(quality));
    update();
    window.addEventListener('resize',update,{passive:true});
    return ()=>window.removeEventListener('resize',update);
  },[quality]);
  return (
    <Canvas
      key={quality}
      shadows={quality==='QUALITY'}
      dpr={dpr}
      camera={{fov:66,near:0.12,far:1400,position:[0,22,-178]}}
      gl={{antialias:quality==='QUALITY',powerPreference:'high-performance',alpha:false}}
      onCreated={({gl})=>{
        gl.toneMapping=ACESFilmicToneMapping;
        gl.toneMappingExposure=quality==='QUALITY'?1.06:1.12;
      }}>
      <GraphicsContextObserver onFailure={onRendererFailure}/>
      <World {...props}/>
    </Canvas>
  );
}
