import { Canvas } from '@react-three/fiber';
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

/** Lazy loaded Three.js application code, separate from the lightweight UI. */
export default function RaceStage(props:Props){
  const {quality,onRendererFailure}=props;
  return (
    <Canvas
      key={quality}
      shadows={quality==='QUALITY'}
      dpr={quality==='QUALITY'?[1,1.55]:[1,1.1]}
      camera={{fov:66,near:0.12,far:1400,position:[0,22,-178]}}
      gl={{antialias:quality==='QUALITY',powerPreference:'high-performance',alpha:false}}
      onCreated={({gl})=>{
        gl.toneMapping=ACESFilmicToneMapping;
        gl.toneMappingExposure=quality==='QUALITY'?1.06:1.12;
        gl.domElement.addEventListener('webglcontextlost',event=>{
          event.preventDefault();
          onRendererFailure('The browser interrupted the WebGL graphics context');
        },{once:true});
      }}>
      <World {...props}/>
    </Canvas>
  );
}
