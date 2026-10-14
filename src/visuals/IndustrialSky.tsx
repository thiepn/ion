import { BackSide } from 'three';

/** Original twilight atmosphere, independent of game physics and imported models. */
const vertex=[
 'varying vec3 vSkyDirection;',
 'void main() {',
 '  vSkyDirection=normalize(position);',
 '  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
 '}',
].join(String.fromCharCode(10));

const fragment=[
 'precision highp float;',
 'varying vec3 vSkyDirection;',
 'float random21(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
 'void main() {',
 '  vec3 dir=normalize(vSkyDirection);',
 '  float y=dir.y;',
 '  float horizon=smoothstep(-0.19,0.39,y);',
 '  float high=smoothstep(0.13,0.92,y);',
 '  vec3 lower=vec3(0.064,0.093,0.142);',
 '  vec3 middle=vec3(0.026,0.048,0.096);',
 '  vec3 highSky=vec3(0.0045,0.009,0.028);',
 '  vec3 sky=mix(lower,middle,horizon);',
 '  sky=mix(sky,highSky,high);',
 '  vec3 sunDirection=normalize(vec3(-0.64,0.29,-0.70));',
 '  float sunDot=max(0.0,dot(dir,sunDirection));',
 '  float flare=pow(sunDot,17.0);',
 '  float core=pow(sunDot,460.0);',
 '  float aurora=pow(max(0.0,1.0-abs(y-0.14)*4.5),3.0);',
 '  sky+=vec3(0.19,0.085,0.055)*flare;',
 '  sky+=vec3(0.80,0.43,0.23)*core;',
 '  sky+=vec3(0.008,0.022,0.032)*aurora;',
 '  vec2 pos=vec2(atan(dir.z,dir.x)*90.0,y*195.0);',
 '  vec2 cell=floor(pos);',
 '  float star=step(.9977,random21(cell));',
 '  float dotPattern=pow(max(0.0,1.0-length(fract(pos)-.5)*1.9),12.0);',
 '  sky+=star*dotPattern*max(0.0,smoothstep(.08,.45,y))*vec3(.27,.37,.42);',
 '  gl_FragColor=vec4(sky,1.0);',
 '}',
].join(String.fromCharCode(10));

export function IndustrialSky(){
  return (
    <mesh renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[1050,48,24]}/>
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        depthTest={false}
        transparent={false}
        fog={false}
        vertexShader={vertex}
        fragmentShader={fragment}
      />
    </mesh>
  );
}
