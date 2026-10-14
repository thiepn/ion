import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import {
  Color, DoubleSide, Group, InstancedMesh,
  Object3D, Vector3, BufferGeometry, Float32BufferAttribute,
} from 'three';
import { InputController, RaceEngine, type RaceSnapshot } from './simulation';
import { ROAD_HALF_WIDTH, ribbon, trackAt } from './track';
import { Craft } from './visuals/Craft';
import { CircuitDressing } from './visuals/CircuitDressing';
import { TrackInfrastructure } from './visuals/TrackInfrastructure';
import { SpeedWake } from './visuals/SpeedWake';
import { BoostFX } from './visuals/BoostFX';
import { RailImpactFX } from './visuals/RailImpactFX';
import { CircuitSurfaceDetails } from './visuals/CircuitSurfaceDetails';
import { RaceLineGuidance } from './visuals/RaceLineGuidance';
import { IndustrialHorizon } from './visuals/IndustrialHorizon';
import { IndustrialSky } from './visuals/IndustrialSky';
import { ChaseRig } from './visuals/ChaseRig';
import { KenneyDistricts, KenneyRacer } from './visuals/KenneyAssets';
import { CinematicEffects, ReflectionEnvironment, useRoadMaterials } from './visuals/Rendering';

type CameraMode = 'CHASE' | 'NEAR';
type Props = {
  game: RaceEngine;
  input: InputController;
  cameraMode: CameraMode;
  paint: string;
  showcase: boolean;
  quality: 'PERFORMANCE'|'QUALITY';
  craftKind:'KESTREL'|'RACER';
  onSnapshot: (snapshot: RaceSnapshot) => void;
};

const CYAN = '#79eff0';
const ORANGE = '#ffa36a';
const RAIL = '#192c3d';

function seeded(seed: number) {
  let v = seed >>> 0;
  return () => {
    v = (Math.imul(1664525, v) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

function Road({quality}:{quality:'QUALITY'|'PERFORMANCE'}) {
  const surface=useRoadMaterials(quality);
  const dashRef=useRef<InstancedMesh>(null);
  const ribbons = useMemo(() => ({
    base: ribbon(-ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, 0),
    underside: ribbon(-ROAD_HALF_WIDTH - 1.1, ROAD_HALF_WIDTH + 1.1, -0.95),
    leftRail: ribbon(-ROAD_HALF_WIDTH - 0.95, -ROAD_HALF_WIDTH + 0.28, 0.43),
    rightRail: ribbon(ROAD_HALF_WIDTH - 0.28, ROAD_HALF_WIDTH + 0.95, 0.43),
    leftLight: ribbon(-ROAD_HALF_WIDTH + 0.8, -ROAD_HALF_WIDTH + 1.08, 0.17),
    rightLight: ribbon(ROAD_HALF_WIDTH - 1.08, ROAD_HALF_WIDTH - 0.8, 0.17),
    centerLine: ribbon(-0.09, 0.09, 0.13),
  }), []);
  useEffect(() => () => Object.values(ribbons).forEach(g => g.dispose()), [ribbons]);

  const dashes = useMemo(() => {
    return Array.from({ length: 115 }, (_, i) => {
      const t = (i + 0.4) / 115;
      const { position, right, tangent } = trackAt(t);
      return {
        position: [position.x + right.x * -5.7, position.y + 0.19, position.z + right.z * -5.7] as [number,number,number],
        rotation: [0, Math.atan2(tangent.x, tangent.z), 0] as [number,number,number],
      };
    });
  }, []);

  useEffect(()=>{
    const instanced=dashRef.current;
    if(!instanced)return;
    const dummy=new Object3D();
    for(let i=0;i<dashes.length;i++){
      const dash=dashes[i];
      dummy.position.set(...dash.position);
      dummy.rotation.set(...dash.rotation);
      dummy.scale.set(1,1,1);
      dummy.updateMatrix();
      instanced.setMatrixAt(i,dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate=true;
    instanced.computeBoundingSphere();
  },[dashes]);
  return (
    <group>
      <mesh geometry={ribbons.underside} receiveShadow>
        <meshStandardMaterial color="#101924" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh geometry={ribbons.base} receiveShadow>
        <meshStandardMaterial color={surface.colorMap?'#ffffff':'#657c86'} map={surface.colorMap}
          normalMap={surface.normalMap} roughnessMap={surface.roughnessMap}
          metalness={.27} roughness={.89} side={DoubleSide}/>
      </mesh>
      <mesh geometry={ribbons.leftRail} castShadow>
        <meshStandardMaterial color={RAIL} metalness={0.68} roughness={0.35} side={DoubleSide} />
      </mesh>
      <mesh geometry={ribbons.rightRail} castShadow>
        <meshStandardMaterial color={RAIL} metalness={0.68} roughness={0.35} side={DoubleSide} />
      </mesh>
      <mesh geometry={ribbons.leftLight}>
        <meshBasicMaterial color={CYAN} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh geometry={ribbons.rightLight}>
        <meshBasicMaterial color={CYAN} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh geometry={ribbons.centerLine}>
        <meshBasicMaterial color="#6a899a" side={DoubleSide} />
      </mesh>
      <instancedMesh ref={dashRef} args={[undefined,undefined,dashes.length]}>
        <boxGeometry args={[.19,.025,2.4]}/>
        <meshBasicMaterial color="#aac0d0"/>
      </instancedMesh>
    </group>
  );
}

function startGate(t: number, accent: string) {
  const { position, tangent } = trackAt(t);
  const angle = Math.atan2(tangent.x, tangent.z);
  return (
    <group key={t} position={[position.x, position.y, position.z]} rotation={[0, angle, 0]}>
      {[-14, 14].map((x) => (
        <group key={x} position={[x, 5.6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 11, 1.65]} />
            <meshStandardMaterial color="#263b4d" metalness={0.8} roughness={0.34} />
          </mesh>
          <mesh position={[0, 0, 0.86]}>
            <boxGeometry args={[0.2, 9.8, 0.1]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 11.1, 0]} castShadow>
        <boxGeometry args={[28.7, 1.2, 2]} />
        <meshStandardMaterial color="#182b39" metalness={0.8} />
      </mesh>
      <mesh position={[0, 10.4, 1.05]}>
        <boxGeometry args={[23, 0.15, 0.1]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CircuitDetails() {
  const monolithRef=useRef<InstancedMesh>(null);
  const supportRef=useRef<InstancedMesh>(null);
  const towersRef=useRef<InstancedMesh>(null);
  const roofsRef=useRef<InstancedMesh>(null);
  const panelsRef=useRef<InstancedMesh>(null);
  const buildingData = useMemo(() => {
    const random = seeded(734211);
    return Array.from({ length: 124 }, (_, i) => {
    const t = (i + random() * 0.6) / 124;
    const { position, right } = trackAt(t);
    const side = i % 2 === 0 ? -1 : 1;
    const distance = ROAD_HALF_WIDTH + 25 + random() * 95;
    const height = 14 + random() ** 2 * 110;
    const width = 8 + random() * 15;
    return {
      x: position.x + right.x * distance * side,
      y: -25 + height / 2,
      z: position.z + right.z * distance * side,
      width, height,
      color: i % 9 === 0 ? '#344d61' : i % 4 === 0 ? '#22394d' : '#1a293b',
    };
    });
  }, []);

  const roofBuildings=useMemo(()=>buildingData.filter((_,i)=>i%3===0),[buildingData]);
  const panelBuildings=useMemo(()=>buildingData.filter((_,i)=>i%5===0),[buildingData]);
  useEffect(()=>{
    const dummy=new Object3D();
    const colored=(mesh:InstancedMesh|null, list:typeof buildingData, purpose:'tower'|'roof'|'panel')=>{
      if(!mesh)return;
      list.forEach((b,index)=>{
        dummy.rotation.set(0,0,0);
        if(purpose==='tower'){
          dummy.position.set(b.x,b.y,b.z);
          dummy.scale.set(b.width,b.height,b.width*.8);
          mesh.setColorAt(index,new Color(b.color));
        } else if(purpose==='roof'){
          dummy.position.set(b.x,b.y+b.height*.5+.2,b.z);
          dummy.scale.set(b.width+.5,.4,b.width*.8+.5);
          mesh.setColorAt(index,new Color(index%2===0?'#79eff0':'#ffa36a'));
        } else {
          dummy.position.set(b.x,b.y,b.z+b.width*.4+.04);
          dummy.scale.set(.22,b.height*.75,.05);
          mesh.setColorAt(index,new Color('#506d81'));
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(index,dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.computeBoundingSphere();
    };
    colored(towersRef.current,buildingData,'tower');
    colored(roofsRef.current,roofBuildings,'roof');
    colored(panelsRef.current,panelBuildings,'panel');
  },[buildingData,roofBuildings,panelBuildings]);

  const supports = useMemo(() => Array.from({length: 32}, (_, i) => {
    const {position} = trackAt((i + 0.2) / 32);
    const height = Math.max(5, position.y + 25);
    return {x:position.x, y: -25 + height * 0.5, z:position.z, height};
  }), []);

  useEffect(()=>{
    const mesh=supportRef.current;
    if(!mesh)return;
    const dummy=new Object3D();
    supports.forEach((support,i)=>{
      dummy.position.set(support.x,support.y,support.z);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(1, support.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
  },[supports]);

  // Thousands of emissive surface details in one draw call, not separate meshes.
  const windows = useMemo(() => {
    const random = seeded(93137);
    const result: Vector3[] = [];
    buildingData.forEach((b, index) => {
      if (index % 3 === 1) return;
      const rows = Math.min(12, Math.max(2, Math.floor(b.height / 9)));
      for(let row = 0; row < rows; row++) {
        if(random() < 0.32) continue;
        for(let col=-1; col<=1; col++) {
          if(random() < 0.38) continue;
          result.push(new Vector3(
            b.x + col * (b.width * 0.22),
            b.y - b.height * 0.5 + 4 + (row + 0.5) * (b.height - 7) / rows,
            b.z + b.width * 0.4 + 0.07
          ));
        }
      }
    });
    return result;
  }, [buildingData]);
  const windowRef = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!windowRef.current) return;
    const dummy = new Object3D();
    for (let i = 0; i < windows.length; i++) {
      dummy.position.copy(windows[i]);
      dummy.scale.set(0.85, 1.7, 0.1);
      dummy.updateMatrix();
      windowRef.current.setMatrixAt(i, dummy.matrix);
    }
    windowRef.current.instanceMatrix.needsUpdate = true;
  }, [windows]);

  const lamps = useMemo(() => Array.from({ length: 170 }, (_, i) => {
    const t = i / 85;
    const { position, right } = trackAt(t);
    const side = i % 2 === 0 ? 1 : -1;
    return new Vector3(position.x + right.x * 14.1 * side, position.y + 1.25, position.z + right.z * 14.1 * side);
  }), []);

  const lampRef = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!lampRef.current) return;
    const dummy = new Object3D();
    lamps.forEach((position, index) => {
      dummy.position.copy(position);
      dummy.scale.set(0.28, 0.55, 0.3);
      dummy.updateMatrix();
      lampRef.current!.setMatrixAt(index, dummy.matrix);
    });
    lampRef.current.instanceMatrix.needsUpdate = true;
  }, [lamps]);

  const farMonoliths = useMemo(() => {
    const random = seeded(11752);
    return Array.from({ length: 24 }, (_, i) => ({
      angle: i * Math.PI * 2 / 24,
      height: 50 + random() * 175,
      width: 12 + random() * 19,
    }));
  }, []);
  useEffect(()=>{
    const mesh=monolithRef.current;
    if(!mesh)return;
    const dummy=new Object3D();
    farMonoliths.forEach((m,i)=>{
      dummy.position.set(Math.sin(m.angle)*530,-25+m.height/2,Math.cos(m.angle)*530);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(m.width,m.height,m.width*.7);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,new Color(i%3===0?'#263343':'#172333'));
    });
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();
  },[farMonoliths]);

  return (
    <group>
      <mesh position={[0, -25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1700, 1700]} />
        <meshStandardMaterial color="#101b2b" metalness={0.18} roughness={0.94} />
      </mesh>
      <instancedMesh ref={supportRef} args={[undefined,undefined,supports.length]} receiveShadow>
        <cylinderGeometry args={[2.8,3.7,1,8]}/>
        <meshStandardMaterial color="#243545" metalness={.6} roughness={.67}/>
      </instancedMesh>
      <instancedMesh ref={monolithRef} args={[undefined,undefined,farMonoliths.length]}>
        <boxGeometry args={[1,1,1]}/>
        <meshStandardMaterial color="#ffffff" metalness={.2} roughness={.95}/>
      </instancedMesh>
      <instancedMesh ref={towersRef} args={[undefined,undefined,buildingData.length]} receiveShadow>
        <boxGeometry args={[1,1,1]}/>
        <meshStandardMaterial color="#ffffff" metalness={.57} roughness={.7}/>
      </instancedMesh>
      <instancedMesh ref={roofsRef} args={[undefined,undefined,roofBuildings.length]}>
        <boxGeometry args={[1,1,1]}/>
        <meshBasicMaterial color="#ffffff" toneMapped={false}/>
      </instancedMesh>
      <instancedMesh ref={panelsRef} args={[undefined,undefined,panelBuildings.length]}>
        <boxGeometry args={[1,1,1]}/>
        <meshStandardMaterial color="#ffffff" metalness={.48} roughness={.53}/>
      </instancedMesh>
      <instancedMesh ref={windowRef} args={[undefined,undefined,windows.length]} frustumCulled={false}>
        <boxGeometry args={[1,1,1]}/>
        <meshBasicMaterial color="#87c3d1" toneMapped={false}/>
      </instancedMesh>
      <instancedMesh ref={lampRef} args={[undefined,undefined,lamps.length]} frustumCulled={false}>
        <boxGeometry args={[1,1,1]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </instancedMesh>
      {startGate(0, ORANGE)}
      {[0.18, 0.34, 0.58, 0.74, 0.93].map(t => startGate(t, '#43788a'))}
      {[0.16, 0.48, 0.80].map(t => {
        const { position, tangent } = trackAt(t);
        return (
          <group key={'boost'+t} position={[position.x,position.y+0.2,position.z]}
            rotation={[0,Math.atan2(tangent.x,tangent.z),0]}>
            {[-7,0,7].map(x=>(
              <mesh key={x} position={[x,0,0]}>
                <boxGeometry args={[2,0.08,4.7]} />
                <meshBasicMaterial color={ORANGE} toneMapped={false} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function AtmosphericParticles({quality}:{quality:'QUALITY'|'PERFORMANCE'}) {
  const geometry = useMemo(() => {
    const r = seeded(11002);
    const count=quality==='QUALITY'?700:220;
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      coords[i*3] = (r()-.5)*950;
      coords[i*3+1] = 15 + r()*130;
      coords[i*3+2] = (r()-.5)*950;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position',new Float32BufferAttribute(coords,3));
    return geo;
  },[quality]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#9bc5d3" size={0.42} transparent opacity={0.39} depthWrite={false} sizeAttenuation/>
    </points>
  );
}

export function World({ game, input, onSnapshot, cameraMode, paint, showcase, quality, craftKind }: Props) {
  const ship = useRef<Group>(null);
  const hull = useRef<Group>(null);
  const { camera } = useThree();
  const cameraRig = useMemo(()=>new ChaseRig(),[]);
  const prefersReducedMotion = useMemo(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  },[]);
  const lastReport = useRef(0);
  const fixedAccumulator = useRef(0);

  useFrame(({ clock }, dt) => {
    // Gamepad pause, camera and restart are polled even while race time is frozen.
    input.pollGamepadActions();
    // Deterministic 60 Hz simulation independent of monitor refresh.
    // Cap catch-up after tab stalls rather than simulating seconds in one frame.
    if (game.phase === 'racing' || game.phase === 'countdown') {
      fixedAccumulator.current = Math.min(fixedAccumulator.current + Math.min(dt, 0.12), 7 / 60);
      const controls = input.get();
      let substeps = 0;
      while (fixedAccumulator.current >= 1 / 60 && substeps < 7) {
        game.update(1 / 60, controls);
        fixedAccumulator.current -= 1 / 60;
        substeps++;
      }
    } else {
      fixedAccumulator.current = 0;
    }
    const h = game.heading;
    if (ship.current) {
      ship.current.position.copy(game.position);
      ship.current.rotation.y = h;
      ship.current.position.y += Math.sin(clock.elapsedTime * 2.5) * 0.10;
    }
    if (hull.current) {
      hull.current.rotation.z = game.roll;
      hull.current.rotation.x = game.pitch + Math.sin(clock.elapsedTime * 4) * 0.012;
    }
    cameraRig.update(camera,game,dt,cameraMode,showcase,clock.elapsedTime,prefersReducedMotion);
    if (clock.elapsedTime - lastReport.current > 0.1) {
      lastReport.current = clock.elapsedTime;
      onSnapshot(game.snapshot());
    }
  });

  return (
    <>
      <color attach="background" args={['#090f1b']}/>
      <IndustrialSky/>
      <fogExp2 attach="fog" args={['#111c2c',0.0016]}/>
      <hemisphereLight args={['#b7daf4','#27303e',quality==='QUALITY'?1.38:1.65]}/>
      <ambientLight intensity={quality==='QUALITY'?.32:.5} color="#7a99b9"/>
      <directionalLight color="#ffcca8" intensity={quality==='QUALITY'?2.75:2.3}
        position={[110,180,-100]} castShadow={quality==='QUALITY'}
        shadow-mapSize={[2048,2048]} shadow-camera-left={-165} shadow-camera-right={165}
        shadow-camera-top={165} shadow-camera-bottom={-165} shadow-bias={-0.0007}
        shadow-normalBias={.04}/>
      <ReflectionEnvironment enabled={quality==='QUALITY'}/>
      <Road quality={quality}/>
      <CircuitSurfaceDetails quality={quality}/>
      <CircuitDetails/>
      <IndustrialHorizon quality={quality}/>
      <CircuitDressing/>
      <RaceLineGuidance game={game} quality={quality}/>
      <TrackInfrastructure quality={quality}/>
      <KenneyDistricts quality={quality}/>
      <AtmosphericParticles quality={quality}/>
      <SpeedWake game={game} quality={quality}/>
      <BoostFX game={game} quality={quality}/>
      <RailImpactFX game={game} quality={quality}/>
      {craftKind==='RACER' ? (
        <Suspense fallback={<Craft game={game} shipRef={ship} hullRef={hull} paint={paint}/> }>
          <KenneyRacer game={game} shipRef={ship} hullRef={hull} paint={paint}/>
        </Suspense>
      ) : <Craft game={game} shipRef={ship} hullRef={hull} paint={paint}/>}

      {quality==='QUALITY' && <CinematicEffects/>}
    </>
  );
}
