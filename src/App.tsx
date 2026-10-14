import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
const RaceStage=lazy(()=>import('./RaceStage'));
import { RuntimeBoundary } from './visuals/RuntimeBoundary';
import { Minimap } from './Minimap';
import { InputController, RaceEngine, type RaceSnapshot } from './simulation';
import { RaceAudio } from './audio';

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
  const activePointers=useRef<Set<number>>(new Set());
  const release=(pointerId:number)=>{
    activePointers.current.delete(pointerId);
    input.release(code,pointerId);
  };
  useEffect(()=>{
    const active=activePointers.current;
    return ()=>{
      // Removing a captured button can omit pointerup. Release on unmount.
      active.forEach(id=>input.release(code,id));
      active.clear();
    };
  },[code,input]);
  return <button className="touch-control" type="button"
    onPointerDown={event=>{
      event.preventDefault();
      if(event.pointerType==='mouse' && event.button!==0)return;
      activePointers.current.add(event.pointerId);
      input.press(code,event.pointerId);
      try{event.currentTarget.setPointerCapture(event.pointerId);}
      catch{release(event.pointerId);}
    }}
    onPointerUp={event=>release(event.pointerId)}
    onPointerCancel={event=>release(event.pointerId)}
    onLostPointerCapture={event=>release(event.pointerId)}
    onContextMenu={event=>event.preventDefault()}
    aria-label={text}>{text}</button>;
}

export function App() {
  const game = useMemo(()=>new RaceEngine(),[]);
  const input = useMemo(()=>new InputController(),[]);
  const audio = useMemo(()=>new RaceAudio(),[]);
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [soundError,setSoundError]=useState(false);
  const [data,setData]=useState<RaceSnapshot>(()=>game.snapshot());
  const [cameraMode,setCameraMode]=useState<CameraMode>('CHASE');
  const [quality,setQuality]=useState<Quality>(()=>{
    try{
      const choice=localStorage.getItem('ion-v4-graphics');
      if(choice==='QUALITY'||choice==='PERFORMANCE')return choice;
      return window.matchMedia('(pointer:coarse)').matches?'PERFORMANCE':'QUALITY';
    }catch{return 'PERFORMANCE';}
  });
  const chooseQuality=useCallback((next:Quality)=>{
    setQuality(next);
    try{localStorage.setItem('ion-v4-graphics',next);}catch{/* optional preference */}
  },[]);
  const [rendererError,setRendererError]=useState<string|null>(null);
  const [gamepadNotice,setGamepadNotice]=useState<string|null>(null);
  const disconnectedController=useRef(false);
  const [rendererEpoch,setRendererEpoch]=useState(0);
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

  const refresh=useCallback(()=>{
    const snapshot=game.snapshot();
    audio.update(snapshot);
    setData(snapshot);
  },[game,audio]);
  const toggleSound=useCallback(async ()=>{
    if(audio.enabled){
      audio.disable();
      setSoundEnabled(false);
      setSoundError(false);
      return;
    }
    const enabled=await audio.enable();
    if(enabled)audio.update(game.snapshot());
    setSoundEnabled(enabled);
    setSoundError(!enabled);
  },[audio,game]);
  useEffect(()=>()=>audio.dispose(),[audio]);
  const togglePause=useCallback(()=>{
    // Never carry a stale keyboard/pointer boost or throttle through pause.
    input.clear();
    game.pause();
    refresh();
  },[game,input,refresh]);
  const start=useCallback(()=>{
    input.clear();
    game.start();
    setGamepadNotice(null);
    setGarage(false);setHelp(false);refresh();
  },[game,input,refresh]);
  const mainMenu=useCallback(()=>{
    input.clear();
    game.menu();
    setGamepadNotice(null);
    setGarage(false);setHelp(false);refresh();
  },[game,input,refresh]);
  const toggleCamera=useCallback(()=>setCameraMode(m=>m==='CHASE'?'NEAR':'CHASE'),[]);
  const recover=useCallback(()=>{
    if(game.recover())refresh();
  },[game,refresh]);

  useEffect(()=>{
    input.attach();
    input.onGamepadDisconnect=()=>{
      disconnectedController.current=true;
      const active=game.phase==='racing'||game.phase==='countdown';
      if(active)game.pause();
      setGamepadNotice(active?
        'Controller disconnected. Race paused; reconnect or use the keyboard.':
        'Controller disconnected. Keyboard and touch controls remain available.');
      refresh();
    };
    input.onGamepadConnect=()=>{
      if(disconnectedController.current) {
        disconnectedController.current=false;
        setGamepadNotice(game.phase==='paused'?
          'Controller reconnected. Release buttons before resuming your race.':
          'Controller reconnected. Release held buttons before driving.');
      }
    };
    input.onKeyAction=(action)=>{
      if (action==='pause') togglePause();
      if (action==='reset' && newest.current.phase!=='menu') start();
      if (action==='camera') toggleCamera();
      if (action==='recover') recover();
    };
    const onHidden=()=>{
      if(!document.hidden)return;
      input.clear();
      if(game.phase==='racing'||game.phase==='countdown'){
        game.pause();
        refresh();
      }
    };
    // A window may lose keyboard focus without becoming document.hidden
    // (system dialogs, task switching, another window over the game).
    // Pause the authoritative race and clear held controls in both cases.
    const onBlur=()=>{
      input.clear();
      if(game.phase==='racing'||game.phase==='countdown'){
        game.pause();
        refresh();
      }
    };
    document.addEventListener('visibilitychange',onHidden);
    window.addEventListener('blur',onBlur);
    return ()=>{
      document.removeEventListener('visibilitychange',onHidden);
      window.removeEventListener('blur',onBlur);
      input.onKeyAction=undefined;
      input.onGamepadConnect=undefined;
      input.onGamepadDisconnect=undefined;
      input.detach();
    };
  },[game,input,refresh,start,togglePause,toggleCamera,recover]);

  const onTelemetry=useCallback((next:RaceSnapshot)=>{
    audio.update(next);
    setData(next);
  },[audio]);
  const onRendererFailure=useCallback((message:string)=>{
    input.clear();
    if(game.phase==='racing'||game.phase==='countdown')game.pause();
    setRendererError(message);
    refresh();
  },[game,input,refresh]);
  const retryRenderer=useCallback(()=>{
    setRendererError(null);
    setRendererEpoch(v=>v+1);
  },[]);
  const isRace = data.phase==='racing' || data.phase==='countdown';
  const isBlocking = data.phase==='menu'||data.phase==='paused'||data.phase==='finished';
  const won=data.reason==='complete';

  return (
    <div className="app-shell">
      <div className="viewport" aria-label="3D anti-gravity racing scene">
        <RuntimeBoundary key={rendererEpoch} onFailure={onRendererFailure}>
          {rendererError===null && (
            <Suspense fallback={
              <div className="stage-loading" role="status" aria-live="polite">
                <span>ION / RENDERER</span><strong>INITIALIZING CIRCUIT</strong>
                <p>Loading the 3D scene and locally licensed spacecraft.</p>
              </div>
            }>
              <RaceStage game={game} input={input} cameraMode={cameraMode}
                paint={paint} showcase={garage} quality={quality} craftKind={craftKind}
                onSnapshot={onTelemetry} onRendererFailure={onRendererFailure}/>
            </Suspense>
          )}
        </RuntimeBoundary>
      </div>
      <div className="vignette" aria-hidden="true"/>
      {soundError && (
        <div className="gamepad-notice" role="status">
          Browser audio is unavailable. The race remains fully playable without sound.
          <button type="button" onClick={()=>setSoundError(false)} aria-label="Dismiss audio warning">×</button>
        </div>
      )}
      {gamepadNotice && (
        <div className="gamepad-notice" role="status" aria-live="polite">
          <span>{gamepadNotice}</span>
          <button type="button" onClick={()=>setGamepadNotice(null)}
            aria-label="Dismiss controller status"><span aria-hidden="true">×</span></button>
        </div>
      )}
      {rendererError!==null && (
        <section className="renderer-recovery" role="alert">
          <div className="label-line">ION GRAPHICS / RECOVERY REQUIRED</div>
          <h2>RENDER INTERRUPTED</h2>
          <p>The 3D scene could not continue. Race time is paused when possible.
          Retry the renderer or switch to the reduced graphics preset.</p>
          <p className="renderer-detail">{rendererError}</p>
          <button className="cta" type="button" onClick={retryRenderer}>RETRY RENDERER <span>↗</span></button>
          <button className="secondary-action" type="button" onClick={()=>{
            chooseQuality('PERFORMANCE');
            retryRenderer();
          }}>RESTART IN PERFORMANCE MODE</button>
          <button className="secondary-action" type="button"
            onClick={()=>window.location.reload()}>
            RELOAD APP IF RENDERER RETRY FAILS
          </button>
        </section>
      )}
      {data.impact>0.02 && isRace && <div className="impact-flash" style={{opacity:data.impact*0.35}} aria-hidden="true"/>}

      <header className="masthead">
        <div className="identity">
          <span className="identity-mark">I<span>O</span>N</span>
          <span className="identity-divider" aria-hidden="true"/>
          <span className="identity-detail">ANTI-GRAVITY<br/>RACING SYSTEM</span>
        </div>
        <div className="masthead-right">
          <span className="build-label">V15 · DEVELOPMENT BUILD</span>
          <button className="small-button" type="button" onClick={toggleSound}
            aria-pressed={soundEnabled} aria-label={soundEnabled?'Mute race audio':'Enable race audio'}>
            AUDIO {soundEnabled?'ON':'OFF'}
          </button>
          {isRace && <>
            <button className="small-button camera-button" type="button"
              onClick={toggleCamera} aria-label="Switch race camera">CAMERA <kbd>V</kbd></button>
            <button className="small-button" type="button" onClick={togglePause}>PAUSE <kbd>ESC</kbd></button>
          </>}
        </div>
      </header>

      {isRace && (
        <div className="hud" aria-live="off">
          {data.trackWarning && data.phase==='racing' && (
            <div className="track-alert" role="status" aria-live="polite">
              <strong>{data.trackWarning==='wrong-way'?'WRONG WAY':
                data.trackWarning==='projection-recovered'?'COURSE ALIGNMENT':'CHECKPOINT MISSED'}</strong>
              <span>{data.trackWarning==='wrong-way'?
                'Turn around and follow the circuit direction':
                data.trackWarning==='projection-recovered'?
                  'Vehicle re-centered after an ambiguous course projection':
                  'Return to the next required sector marker or use recovery'}</span>
            </div>
          )}
          <div className="race-top">
            <div className="race-value">
              <span className="eyebrow">CURRENT LAP</span>
              <strong>{String(data.lap).padStart(2,'0')}<span className="divider-text"> / 0{data.laps}</span></strong>
              <span className="quiet">SECTOR {Math.min(data.nextGate,4)} / 4</span>
              <span className="quiet gate-distance" aria-label="Distance along track to next required gate">
                NEXT {data.nextGateLabel} · {data.distanceToGateM} M
              </span>
              <span className="quiet split-hud">{data.lastSectorTime===null?
                'FIRST SPLIT PENDING':
                `LAST S${data.lastSector} · ${formatTime(data.lastSectorTime)}`}</span>
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
              <span className="race-note">WASD / ARROWS: DRIVE &nbsp;·&nbsp; SPACE: BOOST &nbsp;·&nbsp; V: CAMERA &nbsp;·&nbsp; T: RECOVER</span>
              {data.recoveryCount>0&&<span className="quiet recovery-count">TRACK RECOVERIES: {data.recoveryCount}</span>}
            </div>
            <div className="speed-area">
              <div className="speed-number mono">{data.speedKmh}</div>
              <div className="speed-unit">KM/H</div>
              <div className="speed-caption">{data.isBoosting?'BOOST ACTIVE':
                data.padSurge?'BOOST PAD SURGE':'ANTI-GRAVITY DRIVE'}</div>
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
          <div className="graphics-choice">
            <div className="paint-title">RENDER QUALITY <span>{quality==='QUALITY'?'REFLECTIONS / BLOOM':'OPTIMIZED / LOW EFFECTS'}</span></div>
            <div className="craft-picker" role="group" aria-label="Graphics quality">
              <button type="button" className={quality==='PERFORMANCE'?'active':''}
                aria-pressed={quality==='PERFORMANCE'} onClick={()=>chooseQuality('PERFORMANCE')}>
                <b>PERFORMANCE</b><small>REDUCED GPU LOAD</small>
              </button>
              <button type="button" className={quality==='QUALITY'?'active':''}
                aria-pressed={quality==='QUALITY'} onClick={()=>chooseQuality('QUALITY')}>
                <b>QUALITY</b><small>FULL VISUAL EFFECTS</small>
              </button>
            </div>
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
          <button type="button" className="secondary-action" disabled={!data.recoveryReady} onClick={recover}>
            RECOVER TO LAST SECTOR <span>+5 S · −8 SHIELD</span>
          </button>
          <button type="button" className="secondary-action" onClick={start}>RESTART FROM GRID</button>
          <button type="button" className="secondary-action" onClick={mainMenu}>RETURN TO MENU</button>
          <div className="pause-options">
            <div className="label-line">DISPLAY</div>
            <button type="button" className="option-button" onClick={()=>chooseQuality(quality==='QUALITY'?'PERFORMANCE':'QUALITY')}>
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
          <p>{won?'Three laps complete. Your best lap is saved locally; this run’s splits are shown below.':'Your shield failed after too many collisions. Try a cleaner line.'}</p>
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
              <div><dt>TRACK RECOVERY</dt><dd>T / GAMEPAD LB</dd></div>
            </dl>
            <p>Gamepad left stick, triggers, Start (pause), Y (camera), X (restart), and LB (recover) are supported. Touch controls appear on small screens. Orange track pads replenish boost. Track recovery returns you to your last earned sector, with a 5-second and shield penalty.</p>
            <p>Optional synthesized race audio can be switched on or off with AUDIO in the header. Sound starts muted each session, uses no external recordings, and never affects race scoring.</p>
            <button className="cta" type="button" onClick={()=>setHelp(false)}>CLOSE MANUAL <span>×</span></button>
          </section>
        </div>
      )}

      {isRace && (
        <div className="touch-bar" aria-label="Mobile driving controls">
          <div className="touch-group">
            <button type="button" className="touch-control touch-recover" disabled={!data.recoveryReady}
              onClick={recover} aria-label="Recover to most recent checkpoint with penalty">RECOVER</button>
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
          <span className="audio-status">OPTIONAL SYNTH AUDIO</span>
        </span>
      </footer>
      <span className="sr-only" aria-live="polite">{data.phase==='racing'?'Race in progress':data.phase==='finished'?'Race ended':data.phase}</span>
    </div>
  );
}
