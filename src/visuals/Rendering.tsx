import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CanvasTexture, Color, PMREMGenerator, RepeatWrapping, SRGBColorSpace, Vector2,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Original procedurally painted racing-surface maps. No external textures. */
function maps() {
  const size=512;
  const base=document.createElement('canvas');
  const normal=document.createElement('canvas');
  const rough=document.createElement('canvas');
  for (const canvas of [base,normal,rough]) {
    canvas.width=size; canvas.height=size;
  }
  const c=base.getContext('2d');
  const n=normal.getContext('2d');
  const r=rough.getContext('2d');
  if(!c || !n || !r) throw new Error('Canvas 2D context unavailable');
  let seed=40217;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

  c.fillStyle='#77868e';
  c.fillRect(0,0,size,size);
  // Modular dark basalt panels with subtle repeats along the entire racing line.
  for (let stripe=0;stripe<4;stripe++) {
    const yy=stripe*128;
    c.fillStyle= stripe%2===0?'#7c8991':'#718087';
    c.fillRect(0,yy+2,size,124);
    c.fillStyle='#465b68';
    c.fillRect(0,yy,size,2);
    c.fillStyle='rgba(209,224,226,.18)';
    c.fillRect(0,yy+6,size,1);
    c.fillStyle='rgba(15,29,36,.28)';
    c.fillRect(size/2,yy+3,1,122);
    for(let j=0;j<9;j++){
      c.fillStyle='rgba(23,49,57,.18)';
      c.fillRect(rnd()*512,yy+rnd()*122,5+rnd()*34,.8+rnd()*2);
    }
  }
  for(let i=0;i<11500;i++){
    const x=rnd()*size,y=rnd()*size;
    const alpha=.025+rnd()*.08;
    c.fillStyle=rnd()>.5?'rgba(18,35,39,'+alpha+')':'rgba(230,235,238,'+alpha+')';
    c.fillRect(x,y,.5+rnd()*1.8,.5+rnd()*2);
  }

  const normalImage=n.createImageData(size,size);
  const roughImage=r.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const idx=(y*size+x)*4;
    const line=y%128===0||y%128===1;
    const local=(Math.sin(x*.47)*Math.sin(y*.26)+Math.sin((x+y)*.14))*.5;
    normalImage.data[idx]=Math.round(126+local*13);
    normalImage.data[idx+1]=line?164:Math.round(128+local*9);
    normalImage.data[idx+2]=251;
    normalImage.data[idx+3]=255;
    const amount=line?225:193+Math.floor(rnd()*36);
    roughImage.data[idx]=amount;
    roughImage.data[idx+1]=amount;
    roughImage.data[idx+2]=amount;
    roughImage.data[idx+3]=255;
  }
  n.putImageData(normalImage,0,0);
  r.putImageData(roughImage,0,0);
  const colorMap=new CanvasTexture(base);
  colorMap.colorSpace=SRGBColorSpace;
  const normalMap=new CanvasTexture(normal);
  const roughnessMap=new CanvasTexture(rough);
  for(const map of [colorMap,normalMap,roughnessMap]){
    map.wrapS=RepeatWrapping;
    map.wrapT=RepeatWrapping;
    map.anisotropy=4;
  }
  return {colorMap,normalMap,roughnessMap};
}
export function useRoadMaterials() {
  const textures=useMemo(()=>maps(),[]);
  useEffect(()=>()=>Object.values(textures).forEach(t=>t.dispose()),[textures]);
  return textures;
}

/** Real-time PBR reflection probe from Three.js' MIT-licensed built-in room stage. */
export function ReflectionEnvironment({enabled}:{enabled:boolean}){
  const {gl,scene}=useThree();
  useEffect(()=>{
    if(!enabled) return;
    const pmrem=new PMREMGenerator(gl);
    const room=new RoomEnvironment();
    const reflection=pmrem.fromScene(room,.05);
    const previous=scene.environment;
    const oldIntensity=scene.environmentIntensity;
    scene.environment=reflection.texture;
    scene.environmentIntensity=.72;
    return ()=>{
      scene.environment=previous;
      scene.environmentIntensity=oldIntensity;
      reflection.dispose();
      room.dispose();
      pmrem.dispose();
    };
  },[enabled,gl,scene]);
  return null;
}

/**
 * GPU bloom chain only for the high-quality preset.
 * The performance preset retains the default direct WebGL renderer.
 */
export function CinematicEffects(){
  const {gl,scene,camera,size}=useThree();
  const composer=useMemo(()=>{
    const chain=new EffectComposer(gl);
    chain.addPass(new RenderPass(scene,camera));
    const bloom=new UnrealBloomPass(new Vector2(size.width,size.height),.42,.46,1.0);
    chain.addPass(bloom);
    chain.addPass(new OutputPass());
    return chain;
  },[gl,scene,camera]);
  useEffect(()=>{
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width,size.height);
  },[composer,gl,size.width,size.height]);
  useEffect(()=>()=>composer.dispose(),[composer]);
  useFrame((_,delta)=>composer.render(delta),1);
  return null;
}

export const emissiveCyan = new Color('#75dfea').multiplyScalar(2.5);
export const emissiveAmber = new Color('#fda475').multiplyScalar(2.3);
