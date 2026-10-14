import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { World } from './World';
import { Minimap } from './Minimap';
import { InputController, RaceEngine, type RaceSnapshot } from './simulation';

type CameraMode = 'CHASE' | 'NEAR';
type Quality = 'PERFORMANCE' | 'QUALITY';
type CraftKind = 'KESTREL'|'RACER';
const PAINTS = [
  { name: 'ARCTIC', hex: '#e2f0ed', detail: 'CERAMIC WHITE' },
  { name: 'EMBER', hex: '#f08958', detail: 'SIGNAL ORANGE' },
  { name: 'ION BLUE', hex: '#54bdd9', detail: 'ELECTRIC BLUE' },
  { name: 'TITANIUM', hex: '#7a8799', detail: 'SATIN GRAPHITE' },
  { name: 'VOLT', hex: '#b8d66c', detail: 'ACID LIME' },
] as const;
function initialPaint() {
  try {
    const color = localStorage.getItem('ion-v2-paint');
    return PAINTS.find(p => p.hex === color)?.hex || PAINTS[0].hex;
  } catch { return PAINTS[0].hex; }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '--:--.---';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
}

function Meter({ label, amount, accent }: {label:string;amount:number;accent?:'coral'|'blue'}) {
  return (
    <div className="meter">
      <div className="meter-heading"><span>{label}</span><b>{amount}%</b></div>
      <div className="meter-track"><div className={`meter-fill ${accent||'blue'}`} style={{width:`${amount}%`}}/></div>
    </div>
  );
}

function TouchButton({ code, text, input }: { code:string; text:string; input:InputController }) {
  const release=()=>input.release(code);
  return <button className="touch-control" type="button"
    onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);input.press(code);}}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    aria-label={text}>{text}</button>;
}

export function App() {
  const game = useMemo(()=>new RaceEngine(),[]);
  const input = useMemo(()=>new InputController(),[]);
  const [data,setData]=useState<RaceSnapshot>(()=>game.snapshot());
  const [cameraMode,setCameraMode]=useState<CameraMode>('CHASE');
  const [quality,setQuality]=useState<Quality>('QUALITY');
  const [help,setHelp]=useState(false);
  const [garage,setGarage]=useState(false);
  const [craftKind,setCraftKind]=useState<CraftKind>(()=>{
    try {return localStorage.getItem('ion-v4-craft')==='RACER'?'RACER':'KESTREL';}catch{return 'KESTREL';}
  });
  const chooseCraft=useCallback((next:CraftKind)=>{
    setCraftKind(next);
    try{localStorage.setItem('ion-v4-craft',next);}catch{/* optional personal preference */}
  },[]);
  const [paint,setPaint]=useState<string>(initialPaint);
  const selectPaint=useCallback((next:string)=>{
    setPaint(next);
    try { localStorage.setItem('ion-v2-paint',next); } catch { /* optional local preference */ }
  },[]);
  const newest=useRef(data);
  newest.current=data;

  const refresh=useCallback(()=>setData(game.snapshot()),[game]);
  const togglePause=useCallback(()=>{game.pause();refresh()},[game,refresh]);
  const start=useCallback(()=>{game.start();setGarage(false);setHelp(false);refresh()},[game,refresh]);
  const mainMenu=useCallback(()=>{game.menu();setGarage(false);setHelp(false);refresh()},[game,refresh]);
  const toggleCamera=useCallback(()=>setCameraMode(m=>m==='CHASE'?'NEAR':'CHASE'),[]);

  useEffect(()=>{
    input.attach();
    input.onKeyAction=(action)=>{
      if (action==='pause') togglePause();
      if (action==='reset' && newest.current.phase!=='menu') start();
      if (action==='camera') toggleCamera();
    };
    const onHidden=()=>{
      if (document.hidden && (game.phase==='racing'||game.phase==='countdown')){
        game.pause();
        refresh();
      }
    };
    document.addEventListener('visibilitychange',onHidden);
    return ()=>{
      document.removeEventListener('visibilitychange',onHidden);
      input.onKeyAction=undefined;
      input.detach();
    };
  },[game,input,refresh,start,togglePause,toggleCamera]);

  const onTelemetry=useCallback((next:RaceSnapshot)=>setData(next),[]);
  const isRace = data.phase==='racing' || data.phase==='countdown';
  const isBlocking = data.phase==='menu'||data.phase==='paused'||data.phase==='finished';
  const won=data.reason==='complete';

  return (
    <div className="app-shell">
      <div className="viewport" aria-label="3D anti-gravity racing scene">
        <Canvas key={quality} shadows={quality==='QUALITY'} dpr={quality==='QUALITY'?[1,1.7]:[1,1.15]}
          camera={{fov:66,near:0.12,far:1400,position:[0,22,-178]}}
          gl={{antialias:quality==='QUALITY',powerPreference:'high-performance',alpha:false}}
          onCreated={({gl})=>{gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=1.15;}}>
          <World game={game} input={input} cameraMode={cameraMode} paint={paint} showcase={garage} quality={quality} craftKind={craftKind} onSnapshot={onTelemetry}/>
        </Canvas>
      </div>
      <div className="vignette" aria-hidden="true"/>
      {data.impact>0.02 && isRace && <div className="impact-flash" style={{opacity:data.impact*0.35}} aria-hidden="true"/>}

      <header className="masthead">
        <div className="identity">
          <span className="identity-mark">I<span>O</span>N</span>
          <span className="identity-divider" aria-hidden="true"/>
          <span className="identity-detail">ANTI-GRAVITY<br/>RACING SYSTEM</span>
        </div>
        <div className="masthead-right">
          <span className="build-label">V2 · DEVELOPMENT BUILD</span>
          {isRace && <button className="small-button" type="button" onClick={togglePause}>PAUSE <kbd>ESC</kbd></button>}
        </div>
      </header>

      {isRace && (
        <div className="hud" aria-live="off">
          <div className="race-top">
            <div className="race-value">
              <span className="eyebrow">CURRENT LAP</span>
              <strong>{String(data.lap).padStart(2,'0')}<span className="divider-text"> / 0{data.laps}</span></strong>
              <span className="quiet">SECTOR {Math.min(data.nextGate,4)} / 4</span>
            </div>
            <div className="race-value race-time">
              <span className="eyebrow">RACE TIME</span>
              <strong className="mono">{formatTime(data.elapsed)}</strong>
              <span className="quiet">LAP {formatTime(data.lapTime)}</span>
            </div>
          </div>
          <Minimap race={data}/>
          <div className="race-bottom">
            <div className="status-meters">
              <Meter label="SHIELD" amount={data.shield}/>
              <Meter label="BOOST" amount={data.boost} accent="coral"/>
              <span className="race-note">WASD / ARROWS: DRIVE &nbsp;·&nbsp; SPACE: BOOST &nbsp;·&nbsp; V: CAMERA</span>
            </div>
            <div className="speed-area">
              <div className="speed-number mono">{data.speedKmh}</div>
              <div className="speed-unit">KM/H</div>
              <div className="speed-caption">{data.isBoosting?'BOOST ACTIVE':'ANTI-GRAVITY DRIVE'}</div>
            </div>
          </div>
          {data.phase==='countdown' && <div className="countdown" role="status"><span>STARTING IN</span><b>{data.count}</b></div>}
        </div>
      )}

      {isBlocking && <div className="overlay-backdrop" aria-hidden="true"/>}

      {data.phase==='menu' && !garage && (
        <main className="menu-panel">
          <div className="menu-rule"><span>01 — PILOT INITIALIZATION</span><span>SYSTEM ONLINE</span></div>
          <p className="intro-overline">SINGLE PLAYER / CIRCUIT 01</p>
          <h1>THE EDGE OF<br/><em>CONTROL.</em></h1>
          <p className="intro-copy">One machine. One elevated circuit. Push the limit, hold the racing line, and set your fastest lap.</p>
          <div className="menu-actions">
            <button type="button" className="cta" onClick={start}>START TIME TRIAL <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-action" onClick={()=>setGarage(true)}>CUSTOMIZE HOVERCRAFT <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-action" onClick={()=>setHelp(true)}>CONTROLS & HOW TO PLAY <span aria-hidden="true">↗</span></button>
          </div>
          <div className="menu-stats">
            <div><span>TRACK</span><b>01 / NIGHTSHIFT</b></div>
            <div><span>YOUR BEST LAP</span><b className="mono">{data.bestLap===null?'— NO RECORD —':formatTime(data.bestLap)}</b></div>
          </div>
        </main>
      )}

      {data.phase==='menu' && garage && (
        <main className="garage-panel">
          <div className="menu-rule"><span>02 — VEHICLE CUSTOMIZATION</span><span>GARAGE</span></div>
          <p className="intro-overline">HANGAR / SELECT YOUR MACHINE</p>
          <h2>ION <em>{craftKind==='KESTREL'?'KESTREL':'RIFT'}</em></h2>
          <p className="intro-copy">Two distinct racing hulls. Kestrel uses original detailed ION geometry; Rift adapts a verified CC0 Kenney craft. Both retain the same handling and racing rules. Color and craft choices are saved locally.</p>
          <div className="craft-picker" role="group" aria-label="Hovercraft selection">
            <button type="button" className={craftKind==='KESTREL'?'active':''} aria-pressed={craftKind==='KESTREL'} onClick={()=>chooseCraft('KESTREL')}><b>01 / KESTREL</b><small>ION ORIGINAL</small></button>
            <button type="button" className={craftKind==='RACER'?'active':''} aria-pressed={craftKind==='RACER'} onClick={()=>chooseCraft('RACER')}><b>02 / RIFT</b><small>CC0 KENNEY BASE</small></button>
          </div>
          <div className="craft-specs">
            <div><span>TOP SPEED</span><b>310 KM/H</b></div>
            <div><span>BOOST CAP</span><b>414 KM/H</b></div>
            <div><span>DRIVE CLASS</span><b>ANTI-GRAV</b></div>
          </div>
          <div className="paint-title">FINISH <span>{PAINTS.find(p=>p.hex===paint)?.detail}</span></div>
          <div className="paint-palette" role="group" aria-label="Vehicle color selection">
            {PAINTS.map(option => (
              <button key={option.name} type="button"
                className={`paint-option ${paint===option.hex?'selected':''}`}
                aria-label={option.name} title={option.name}
                aria-pressed={paint===option.hex}
                onClick={()=>selectPaint(option.hex)}
                style={{'--paint':option.hex} as CSSProperties}>
                <span className="paint-dot"/>
                <span>{option.name}</span>
              </button>
            ))}
          </div>
          <div className="garage-actions">
            <button type="button" className="cta" onClick={start}>RACE WITH THIS CRAFT <span>↗</span></button>
            <button type="button" className="secondary-action" onClick={()=>setGarage(false)}>BACK TO MAIN MENU</button>
          </div>
        </main>
      )}

      {data.phase==='paused' && (
        <main className="dialog-panel">
          <div className="label-line">RACE CONTROL / SUSPENDED</div>
          <h2>PAUSED<span className="period">.</span></h2>
          <p>Your run is frozen. Resume from the same position and lap.</p>
          <button type="button" className="cta" onClick={togglePause}>RESUME RACE <span>↗</span></button>
          <button type="button" className="secondary-action" onClick={start}>RESTART FROM GRID</button>
          <button type="button" className="secondary-action" onClick={mainMenu}>RETURN TO MENU</button>
          <div className="pause-options">
            <div className="label-line">DISPLAY</div>
            <button type="button" className="option-button" onClick={()=>setQuality(q=>q==='QUALITY'?'PERFORMANCE':'QUALITY')}>
              GRAPHICS <b>{quality} <span>↔</span></b>
            </button>
            <button type="button" className="option-button" onClick={toggleCamera}>
              CAMERA <b>{cameraMode} <span>↔</span></b>
            </button>
          </div>
        </main>
      )}

      {data.phase==='finished' && (
        <main className="dialog-panel finish-panel">
          <div className="label-line">RACE CONTROL / {won?'RUN COMPLETE':'VEHICLE DISABLED'}</div>
          <h2>{won?'FINISH':'RUN OVER'}<span className="period">.</span></h2>
          <p>{won?'Three laps complete. Your result was recorded locally.':'Your shield failed after too many collisions. Try a cleaner line.'}</p>
          {won && <div className="results">
            <div><span>TOTAL TIME</span><strong className="mono">{formatTime(data.elapsed)}</strong></div>
            {data.lapTimes.map((lap,index)=>(
              <div key={index}><span>LAP {String(index+1).padStart(2,'0')}</span><strong className="mono">{formatTime(lap)}</strong></div>
            ))}
            <div><span>PERSONAL BEST LAP</span><strong className="mono">{data.bestLap===null?'—':formatTime(data.bestLap)}</strong></div>
          </div>}
          <button type="button" className="cta" onClick={start}>RACE AGAIN <span>↗</span></button>
          <button type="button" className="secondary-action" onClick={mainMenu}>RETURN TO MENU</button>
        </main>
      )}

      {help && (
        <div className="help-scrim" role="presentation">
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="menu-rule">PILOT MANUAL / INPUT SYSTEM</div>
            <h2 id="help-title">HOW TO RACE</h2>
            <p>Follow the elevated illuminated track and cross each sector in order. Complete three laps to record a finish. Stay off the guardrails—each impact damages your shield.</p>
            <dl>
              <div><dt>ACCELERATE</dt><dd>W / ↑</dd></div>
              <div><dt>BRAKE</dt><dd>S / ↓</dd></div>
              <div><dt>STEER</dt><dd>A D / ← →</dd></div>
              <div><dt>BOOST</dt><dd>SPACE / SHIFT</dd></div>
              <div><dt>PAUSE</dt><dd>ESC / P</dd></div>
              <div><dt>CAMERA</dt><dd>V</dd></div>
              <div><dt>RESTART</dt><dd>R</dd></div>
            </dl>
            <p>Gamepad left stick, triggers and face buttons are supported. Touch controls appear on small screens. Orange track pads replenish boost.</p>
            <button className="cta" type="button" onClick={()=>setHelp(false)}>CLOSE MANUAL <span>×</span></button>
          </section>
        </div>
      )}

      {isRace && (
        <div className="touch-bar" aria-label="Mobile driving controls">
          <div className="touch-group">
            <TouchButton code="ArrowLeft" text="◀" input={input}/>
            <TouchButton code="ArrowRight" text="▶" input={input}/>
          </div>
          <div className="touch-group">
            <TouchButton code="Space" text="BOOST" input={input}/>
            <TouchButton code="ArrowDown" text="BRAKE" input={input}/>
            <TouchButton code="ArrowUp" text="GO" input={input}/>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <span>ION / EXPERIMENTAL RACING SYSTEM</span>
        <span>
          <a href="https://github.com/thiepn/ion" target="_blank" rel="noopener noreferrer">SOURCE</a>
          <a href="/ion/credits.html" target="_blank" rel="noopener noreferrer">CREDITS</a>
          <span className="audio-status">AUDIO — PLANNED</span>
        </span>
      </footer>
      <span className="sr-only" aria-live="polite">{data.phase==='racing'?'Race in progress':data.phase==='finished'?'Race ended':data.phase}</span>
    </div>
  );
}
