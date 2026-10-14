import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  DoubleSide, Group, InstancedMesh, MathUtils,
  Object3D, Vector3, BufferGeometry, Float32BufferAttribute,
} from 'three';
import { InputController, RaceEngine, type RaceSnapshot } from './simulation';
import { ROAD_HALF_WIDTH, ribbon, trackAt } from './track';
import { Craft } from './visuals/Craft';
import { CircuitDressing } from './visuals/CircuitDressing';
import { CinematicEffects, ReflectionEnvironment, useRoadMaterials } from './visuals/Rendering';

type CameraMode = 'CHASE' | 'NEAR';
type Props = {
  game: RaceEngine;
  input: InputController;
  cameraMode: CameraMode;
  paint: string;
  showcase: boolean;
  quality: 'PERFORMANCE'|'QUALITY';
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

function Road() {
  const surface=useRoadMaterials();
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

  return (
    <group>
      <mesh geometry={ribbons.underside} receiveShadow>
        <meshStandardMaterial color="#101924" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh geometry={ribbons.base} receiveShadow>
        <meshStandardMaterial color="#ffffff" map={surface.colorMap}
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
      {dashes.map((dash, i) => (
        <mesh key={i} position={dash.position} rotation={dash.rotation}>
          <boxGeometry args={[0.19, 0.025, 2.4]} />
          <meshBasicMaterial color="#aac0d0" />
        </mesh>
      ))}
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
      y: position.y - 24 + height / 2,
      z: position.z + right.z * distance * side,
      width, height,
      color: i % 9 === 0 ? '#344d61' : i % 4 === 0 ? '#22394d' : '#1a293b',
    };
    });
  }, []);

  const supports = useMemo(() => Array.from({length: 32}, (_, i) => {
    const {position} = trackAt((i + 0.2) / 32);
    const height = Math.max(5, position.y + 25);
    return {x:position.x, y: -25 + height * 0.5, z:position.z, height};
  }), []);

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

  return (
    <group>
      <mesh position={[0, -25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1700, 1700]} />
        <meshStandardMaterial color="#101b2b" metalness={0.18} roughness={0.94} />
      </mesh>
      {supports.map((support, i) => (
        <mesh key={'support'+i} position={[support.x,support.y,support.z]} receiveShadow>
          <cylinderGeometry args={[2.8,3.7,support.height,8]}/>
          <meshStandardMaterial color="#243545" metalness={0.6} roughness={0.67}/>
        </mesh>
      ))}
      {farMonoliths.map((m, i) => (
        <mesh key={'far' + i} position={[Math.sin(m.angle) * 530, -20 + m.height/2, Math.cos(m.angle)*530]}>
          <boxGeometry args={[m.width, m.height, m.width * 0.7]} />
          <meshStandardMaterial color={i%3 ? '#172333' : '#263343'} metalness={0.2} roughness={0.95} />
        </mesh>
      ))}
      {buildingData.map((b, i) => (
        <group key={'tower'+i} position={[b.x,b.y,b.z]}>
          <mesh castShadow={false} receiveShadow>
            <boxGeometry args={[b.width,b.height,b.width*0.8]} />
            <meshStandardMaterial color={b.color} metalness={0.57} roughness={0.7} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0,b.height/2 + 0.2,0]}>
              <boxGeometry args={[b.width + 0.5,0.4,b.width*0.8 + 0.5]} />
              <meshBasicMaterial color={i%2===0 ? CYAN : ORANGE} toneMapped={false} />
            </mesh>
          )}
          {i % 5 === 0 && (
            <mesh position={[0,0,b.width*0.4 + 0.04]}>
              <boxGeometry args={[0.22,b.height*0.75,0.05]} />
              <meshBasicMaterial color="#506d81" />
            </mesh>
          )}
        </group>
      ))}
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

function AtmosphericParticles() {
  const geometry = useMemo(() => {
    const r = seeded(11002);
    const coords = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      coords[i*3] = (r()-.5)*950;
      coords[i*3+1] = 15 + r()*130;
      coords[i*3+2] = (r()-.5)*950;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position',new Float32BufferAttribute(coords,3));
    return geo;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#9bc5d3" size={0.42} transparent opacity={0.39} depthWrite={false} sizeAttenuation/>
    </points>
  );
}

export function World({ game, input, onSnapshot, cameraMode, paint, showcase, quality }: Props) {
  const ship = useRef<Group>(null);
  const hull = useRef<Group>(null);
  const { camera } = useThree();
  const desiredCamera = useMemo(()=>new Vector3(),[]);
  const focus = useMemo(()=>new Vector3(),[]);
  const lastReport = useRef(0);
  const fixedAccumulator = useRef(0);
  const initialised = useRef(false);

  useFrame(({ clock }, dt) => {
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
    const forwardX = Math.sin(h);
    const forwardZ = Math.cos(h);
    if (ship.current) {
      ship.current.position.copy(game.position);
      ship.current.rotation.y = h;
      ship.current.position.y += Math.sin(clock.elapsedTime * 2.5) * 0.10;
    }
    if (hull.current) {
      hull.current.rotation.z = game.roll;
      hull.current.rotation.x = game.pitch + Math.sin(clock.elapsedTime * 4) * 0.012;
    }
    const distance = cameraMode === 'NEAR' ? 9 : 18;
    if (showcase && game.phase === 'menu') {
      const theta = clock.elapsedTime * 0.22;
      desiredCamera.set(game.position.x + Math.sin(theta) * 14, game.position.y + 6.8, game.position.z + Math.cos(theta) * 14);
      focus.set(game.position.x, game.position.y + 0.5, game.position.z);
    } else {
      desiredCamera.set(game.position.x - forwardX*distance, game.position.y + (cameraMode==='NEAR'?4.4:8.8),game.position.z-forwardZ*distance);
      focus.set(game.position.x + forwardX*12,game.position.y+2,game.position.z + forwardZ*12);
    }
    if (!initialised.current) {
      camera.position.copy(desiredCamera);
      initialised.current = true;
    } else {
      camera.position.lerp(desiredCamera,1-Math.exp(-dt*4.7));
    }
    camera.lookAt(focus);
    if ('fov' in camera && typeof camera.fov === 'number') {
      const wanted = (cameraMode === 'NEAR' ? 67 : 62) + Math.min(game.speed/8,12);
      camera.fov = MathUtils.lerp(camera.fov,wanted,Math.min(1,dt*3));
      camera.updateProjectionMatrix();
    }
    if (clock.elapsedTime - lastReport.current > 0.1) {
      lastReport.current = clock.elapsedTime;
      onSnapshot(game.snapshot());
    }
  });

  return (
    <>
      <color attach="background" args={['#090f1b']}/>
      <fogExp2 attach="fog" args={['#111c2c',0.0016]}/>
      <hemisphereLight args={['#b7daf4','#27303e',1.45]}/>
      <ambientLight intensity={0.36} color="#7a99b9"/>
      <directionalLight color="#ffcca8" intensity={3.1} position={[110,180,-100]} castShadow
        shadow-mapSize={[2048,2048]} shadow-camera-left={-240} shadow-camera-right={240}
        shadow-camera-top={240} shadow-camera-bottom={-240} shadow-bias={-0.001}/>
      <ReflectionEnvironment enabled={quality==='QUALITY'}/>
      <Road/>
      <CircuitDetails/>
      <CircuitDressing/>
      <AtmosphericParticles/>
      <Craft game={game} shipRef={ship} hullRef={hull} paint={paint}/>
      <mesh position={[-420,205,-380]}>
        <sphereGeometry args={[60,32,16]}/>
        <meshBasicMaterial color="#d99766" toneMapped={false} />
      </mesh>
      {quality==='QUALITY' && <CinematicEffects/>}
    </>
  );
}
