import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
const RaceStage=lazy(()=>import('./RaceStage'));
import { RuntimeBoundary } from './visuals/RuntimeBoundary';
import { Minimap } from './Minimap';
import { InputController, RaceEngine, type RaceSnapshot } from './simulation';
import { RaceAudio } from './audio';
import { upcomingApproach } from './track';

type CameraMode = 'CHASE' | 'NEAR';
type Quality = 'PERFORMANCE' | 'QUALITY';
type CraftKind = 'KESTREL'|'RACER';
const STICK_DEADZONE_OPTIONS=[0.10,0.15,0.20,0.25] as const;
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

type TouchAction = { code: string; text: string; label: string };
const STEERING_ACTIONS: readonly TouchAction[] = [
  {code:'ArrowLeft',text:'←',label:'Steer left'},
  {code:'ArrowRight',text:'→',label:'Steer right'},
];
const DRIVING_ACTIONS: readonly TouchAction[] = [
  {code:'Space',text:'BOOST',label:'Boost'},
  {code:'ArrowUp',text:'GO',label:'Accelerate'},
  {code:'ArrowDown',text:'BRAKE',label:'Brake'},
];

/**
 * One pointer owner per thumb zone. React's pressed styles and the original
 * InputController are updated from the same current pointer→action mapping.
 * Capturing the zone, not its starting button, makes a slide between controls
 * unambiguous. No second steering engine or separate simulation state.
 */
function TouchZone({input,actions,className,label,keyboardBase}:{
  input:InputController;
  actions:readonly TouchAction[];
  className:string;
  label:string;
  keyboardBase:number;
}) {
  const heldByPointer=useRef<Map<number,string|null>>(new Map());
  const [pressed,setPressed]=useState<Set<string>>(()=>new Set());

  const syncPressed=()=>{
    setPressed(new Set([...heldByPointer.current.values()].filter((code):code is string=>code!==null)));
  };
  const release=(pointerId:number)=>{
    const old=heldByPointer.current.get(pointerId);
    if(old===undefined)return;
    if(old!==null)input.release(old,pointerId);
    heldByPointer.current.delete(pointerId);
    syncPressed();
  };
  const transfer=(pointerId:number,next:string|null)=>{
    const old=heldByPointer.current.get(pointerId);
    if(old===undefined||old===next)return;
    if(old!==null)input.release(old,pointerId);
    if(next!==null)input.press(next,pointerId);
    // Preserve the physical pointer even when it leaves the zone. If it
    // returns while captured, the nearest button can rearm immediately.
    heldByPointer.current.set(pointerId,next);
    syncPressed();
  };
  const resetAll=()=>{
    const current=heldByPointer.current;
    current.forEach((code,pointerId)=>{if(code!==null)input.release(code,pointerId);});
    current.clear();
    syncPressed();
  };
  useEffect(()=>{
    // The browser may change orientation or hide the page without issuing
    // pointercancel on every touched button. Clear both pressed artwork and
    // held input immediately so returning cannot resume ghost acceleration.
    const onHidden=()=>{if(document.hidden)resetAll();};
    window.addEventListener('blur',resetAll);
    window.addEventListener('pagehide',resetAll);
    window.addEventListener('orientationchange',resetAll);
    document.addEventListener('visibilitychange',onHidden);
    return ()=>{
      window.removeEventListener('blur',resetAll);
      window.removeEventListener('pagehide',resetAll);
      window.removeEventListener('orientationchange',resetAll);
      document.removeEventListener('visibilitychange',onHidden);
      // Cleanup releases every live physical/key pointer without setState.
      heldByPointer.current.forEach((code,id)=>{if(code!==null)input.release(code,id);});
      heldByPointer.current.clear();
    };
  // InputController lifetime is the same as the app; no stale handlers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[input]);

  const actionAt=(zone:HTMLDivElement,x:number,y:number):string|null=>{
    const bounds=zone.getBoundingClientRect();
    const tolerance=12;
    if(x<bounds.left-tolerance||x>bounds.right+tolerance||
       y<bounds.top-tolerance||y>bounds.bottom+tolerance)return null;
    // Within the thumb zone the nearest action wins, including the small
    // physical gap between buttons, avoiding dead strips during a slide.
    let best:string|null=null,dist=Infinity;
    zone.querySelectorAll<HTMLButtonElement>('.touch-control').forEach(button=>{
      const r=button.getBoundingClientRect();
      const dx=Math.max(r.left-x,0,x-r.right);
      const dy=Math.max(r.top-y,0,y-r.bottom);
      const d=dx*dx+dy*dy;
      if(d<dist){dist=d;best=button.dataset.action??null;}
    });
    return best;
  };

  return (
    <div className={'touch-zone '+className} role="group" aria-label={label}
      onPointerDown={event=>{
        if(event.pointerType==='mouse'&&event.button!==0)return;
        event.preventDefault();
        if(heldByPointer.current.has(event.pointerId))return;
        const action=actionAt(event.currentTarget,event.clientX,event.clientY);
        if(!action)return;
        heldByPointer.current.set(event.pointerId,action);
        input.press(action,event.pointerId);
        syncPressed();
        try{event.currentTarget.setPointerCapture(event.pointerId);}
        catch{release(event.pointerId);}
      }}
      onPointerMove={event=>{
        if(!heldByPointer.current.has(event.pointerId))return;
        transfer(event.pointerId,actionAt(event.currentTarget,event.clientX,event.clientY));
      }}
      onPointerUp={event=>release(event.pointerId)}
      onPointerCancel={event=>release(event.pointerId)}
      onLostPointerCapture={event=>release(event.pointerId)}
      onContextMenu={event=>event.preventDefault()}>
      {actions.map((action,index)=>{
        const keyboardPointer=keyboardBase-index;
        const active=pressed.has(action.code);
        return (
          <button key={action.code} type="button" data-action={action.code}
            className={'touch-control'+(active?' is-held':'')}
            aria-label={action.label} aria-pressed={active}
            onKeyDown={event=>{
              if(event.code!=='Space'&&event.code!=='Enter')return;
              event.preventDefault();
              event.stopPropagation();
              if(event.repeat||heldByPointer.current.has(keyboardPointer))return;
              heldByPointer.current.set(keyboardPointer,action.code);
              input.press(action.code,keyboardPointer);
              syncPressed();
            }}
            onKeyUp={event=>{
              if(event.code!=='Space'&&event.code!=='Enter')return;
              event.preventDefault();
              event.stopPropagation();
              release(keyboardPointer);
            }}
            onBlur={()=>release(keyboardPointer)}>
            {action.text}
          </button>
        );
      })}
    </div>
  );
}

export function App() {
  const game = useMemo(()=>new RaceEngine(),[]);
  const input = useMemo(()=>new InputController(),[]);
  const [stickDeadzone,setStickDeadzone]=useState(()=>input.getStickDeadzone());
  const chooseStickDeadzone=useCallback((next:number)=>{
    input.setStickDeadzone(next);
    setStickDeadzone(input.getStickDeadzone());
  },[input]);
  const cycleStickDeadzone=useCallback(()=>{
    const index=STICK_DEADZONE_OPTIONS.findIndex(value=>Math.abs(value-stickDeadzone)<.001);
    chooseStickDeadzone(STICK_DEADZONE_OPTIONS[(index+1)%STICK_DEADZONE_OPTIONS.length]);
  },[chooseStickDeadzone,stickDeadzone]);
  const audio = useMemo(()=>new RaceAudio(),[]);
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [soundError,setSoundError]=useState(false);
  // Track requested state independently of AudioContext.resume() latency.
  // Rapid ON/OFF/ON taps must not let an old async result win the UI race.
  const soundRequested=useRef(false);
  const soundIntentVersion=useRef(0);
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
  const [showFirstRaceHint,setShowFirstRaceHint]=useState(()=>{
    try{return localStorage.getItem('ion-i08-first-race-guide')!=='dismissed';}
    catch{return true;}
  });
  const dismissFirstRaceHint=useCallback(()=>{
    setShowFirstRaceHint(false);
    try{localStorage.setItem('ion-i08-first-race-guide','dismissed');}
    catch{/* optional local first-run preference */}
  },[]);
  const [garage,setGarage]=useState(false);
  const [touchResetSerial,setTouchResetSerial]=useState(0);
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
    const enableRequested=!soundRequested.current;
    soundRequested.current=enableRequested;
    const request=++soundIntentVersion.current;
    if(!enableRequested){
      audio.disable();
      setSoundEnabled(false);
      setSoundError(false);
      return;
    }
    setSoundError(false);
    const enabled=await audio.enable();
    if(request!==soundIntentVersion.current)return;
    if(enabled)audio.update(game.snapshot());
    soundRequested.current=enabled;
    setSoundEnabled(enabled);
    setSoundError(!enabled);
  },[audio,game]);
  useEffect(()=>{
    audio.reopen();
    return ()=>{
      ++soundIntentVersion.current;
      soundRequested.current=false;
      audio.dispose();
    };
  },[audio]);
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
    if(!game.recover())return;
    // Recovery teleports the craft. Releasing every held input, then
    // remounting both thumb zones prevents a finger held across recovery
    // from steering/accelerating the newly recovered vehicle on its own.
    input.clear();
    setTouchResetSerial(n=>n+1);
    refresh();
  },[game,input,refresh]);

  useEffect(()=>{
    input.attach();
    // Keep focused header buttons from swallowing WASD/arrow driving while
    // retaining native keyboard activation of controls in menus and pause.
    input.isRaceActive=()=>game.phase==='racing'||game.phase==='countdown';
    input.onGamepadDisconnect=()=>{
      input.clear();
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
  // Read-only from the same spline as the physical race. Never issues input,
  // credits gates or interrupts steering; suppressed while track is invalid.
  const approach=(data.phase==='racing' && !data.trackWarning &&
    (!showFirstRaceHint||data.elapsed>=17) && data.speedKmh>30)?
    upcomingApproach(data.progress,data.speedKmh):null;
  const showCoach=showFirstRaceHint && (data.phase==='countdown'||
    (data.phase==='racing'&&data.elapsed<17));
  const recentEvent=data.phase==='racing' && data.raceEvent &&
    data.elapsed-data.raceEvent.elapsed>=0 &&
    data.elapsed-data.raceEvent.elapsed<3.1?data.raceEvent:null;
  const goSignal=data.phase==='racing'&&data.elapsed<1.9 &&
    data.raceEvent===null;
  const recoveryDestination=data.nextGate===1?'START GRID':
    'EARNED SECTOR '+(data.nextGate-1);

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
          <span className="identity-detail">NIGHTSHIFT / TIME TRIAL</span>
        </div>
        <div className="masthead-right">
          <span className="build-label">I06 · NIGHTSHIFT CIRCUIT</span>
          <button className="small-button" type="button" onClick={toggleSound}
            aria-pressed={soundEnabled} aria-label={soundEnabled?'Mute race audio':'Enable race audio'}>
            SOUND {soundEnabled?'ON':'OFF'}
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
                  'Re-cross the required gate forwards, or recover to the last earned sector'}</span>
            </div>
          )}
          {showCoach && (
            <aside className="first-race-brief" aria-label="First race driving instructions">
              <strong>FIRST RUN · THREE LAPS</strong>
              <p>Hold W / ↑ or GO, steer with A/D or the left thumb.
                Follow the highlighted sector gate; slow for amber corner boards.</p>
              <button type="button" onClick={dismissFirstRaceHint}
                aria-label="Dismiss first race instructions">GOT IT <span aria-hidden="true">×</span></button>
            </aside>
          )}
          {!showCoach && approach && (
            <div className={'approach-advice'+(approach.brakeNow?' brake-now':'')}
              aria-label={approach.brakeNow?
                'Brake for '+approach.direction.toLowerCase()+' turn':
                approach.direction.toLowerCase()+' turn ahead'}>
              <strong>{approach.brakeNow?'BRAKE · ':''}{approach.direction}</strong>
              <span>{approach.distanceM} M · {approach.suggestedKmh} KM/H ADVISORY</span>
            </div>
          )}
          {!data.trackWarning && (recentEvent||goSignal) && (
            <div className={'race-milestone'+(recentEvent?.kind==='lap'?' is-lap':'')}
              role="status" aria-live="polite">
              <strong>{recentEvent?
                (recentEvent.kind==='lap'?
                  'LAP '+String(recentEvent.lap).padStart(2,'0')+' COMPLETE':
                  'SECTOR '+recentEvent.sector+' CLEARED'):
                'GO · FOLLOW S1'}</strong>
              {recentEvent && <span>{formatTime(recentEvent.time)}
                {recentEvent.kind==='lap' && recentEvent.personalBest?' · PERSONAL BEST':''}
                {recentEvent.kind==='lap' && data.completedLapChallenges[recentEvent.lap-1]?.clean?
                  ' · CLEAN LAP':''}
                {recentEvent.kind==='lap'?
                  ' · '+(data.completedLapChallenges[recentEvent.lap-1]?.pads??0)+'/3 PADS':''}
                {recentEvent.kind==='sector'?' · NEXT '+(recentEvent.sector===3?'FINISH':'S'+(recentEvent.sector+1)):''}
              </span>}
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
              <span className="quiet replay-live">THIS LAP · {data.currentLapClean?'CLEAN SO FAR':'RAIL/RECOVERY RECORDED'}
                {' · '}{data.currentLapPads}/3 PADS</span>
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
              {data.phase==='racing' && (data.impact>.55 || data.padSurge || data.shield<=25) && (
                <span className="race-condition" aria-live="off">
                  {data.impact>.55?('RAIL IMPACT · SHIELD '+data.shield+'%'):
                    data.padSurge?'BOOST PAD · SURGE EARNED':'SHIELD CRITICAL'}
                </span>
              )}
              <span className="race-note">W / ↑ ACCELERATE · A D / ← → STEER · S / ↓ BRAKE · SPACE BOOST</span>
              {data.recoveryCount>0&&<span className="quiet recovery-count">TRACK RECOVERIES: {data.recoveryCount}</span>}
            </div>
            <div className="speed-area">
              <div className="speed-number mono">{data.speedKmh}</div>
              <div className="speed-unit">KM/H</div>
              <div className="speed-caption">{data.isBoosting?'BOOST ACTIVE':
                data.padSurge?'BOOST PAD SURGE':'ANTI-GRAVITY DRIVE'}</div>
            </div>
          </div>
          {data.phase==='countdown' && <div className="countdown" role="status">
            <span>{data.count<=1?'GET READY':'STARTING IN'}</span>
            <b>{data.count}</b>
          </div>}
        </div>
      )}

      {isBlocking && <div className="overlay-backdrop" aria-hidden="true"/>}

      {data.phase==='menu' && !garage && (
        <main className="menu-panel">
          <div className="menu-rule"><span>ION / NIGHTSHIFT</span><span>3 LAPS · TIME TRIAL</span></div>
          <p className="intro-overline">TAKE THE LINE. BEAT YOUR TIME.</p>
          <h1>DRIVE<br/><em>THE NIGHT.</em></h1>
          <p className="intro-copy">Five readable sectors: a long launch, east-side S-bends, a northern crest, a braking descent and a fast return. Three laps. Your line, your time.</p>
          <p className="replay-challenge">NEXT RUN · {data.bestLap===null?
            'SET YOUR FIRST VERIFIED LAP TIME':
            'BEAT '+formatTime(data.bestLap)+' ON THE SAME CIRCUIT'}
            <span>OPTIONAL: FINISH A LAP WITHOUT RAIL DAMAGE OR RECOVERY, AND EARN ALL 3 BOOST STRIPS.</span>
          </p>
          <div className="menu-actions">
            <button type="button" className="cta" onClick={start}>START TIME TRIAL <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-action" onClick={()=>setGarage(true)}>CUSTOMIZE HOVERCRAFT <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-action" onClick={()=>setHelp(true)}>CONTROLS & HOW TO PLAY <span aria-hidden="true">↗</span></button>
          </div>
          <div className="menu-stats">
            <div><span>TRACK</span><b>01 / NIGHTSHIFT I06</b></div>
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
            RECOVER TO {recoveryDestination} <span>+5 S · −8 SHIELD · −25 BOOST</span>
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
            <button type="button" className="option-button" onClick={cycleStickDeadzone}
              aria-label={'Controller steering dead zone '+Math.round(stickDeadzone*100)+' percent. Change sensitivity'}>
              STICK DEAD ZONE <b>{Math.round(stickDeadzone*100)}% <span>↔</span></b>
            </button>
          </div>
        </main>
      )}

      {data.phase==='finished' && (
        <main className="dialog-panel finish-panel">
          <div className="label-line">RACE CONTROL / {won?'RUN COMPLETE':'VEHICLE DISABLED'}</div>
          <h2>{won?'FINISH':'RUN OVER'}<span className="period">.</span></h2>
          <p>{won?'Three source-scored laps complete. Sector splits and the original personal-best record appear below.':'Your shield failed after too many collisions. Try a cleaner line.'}</p>
          {won&&data.newRecordThisRun&&(
            <div className="finish-best" role="status">NEW PERSONAL BEST LAP · {data.bestLap===null?'—':formatTime(data.bestLap)}</div>
          )}
          {won && <p className="replay-result-summary">
            {data.recordToBeat===null?'FIRST VERIFIED RECORD RUN':
              'PREVIOUS RECORD: '+formatTime(data.recordToBeat)}
            {' · '}{data.completedLapChallenges.filter(lap=>lap.clean).length}/3 CLEAN LAPS
            {' · '}{data.completedLapChallenges.filter(lap=>lap.pads===3).length}/3 FULL-PAD LAPS
          </p>}
          {won && <div className="results">
            <div><span>TOTAL TIME</span><strong className="mono">{formatTime(data.elapsed)}</strong></div>
            {data.lapTimes.map((lap,index)=>(
              <div className="lap-result" key={index}>
                <span>LAP {String(index+1).padStart(2,'0')}</span>
                <div className="lap-result-metrics">
                  <strong className="mono">{formatTime(lap)}</strong>
                  <small>{(data.completedSectorTimes[index]||[]).map((split,sector)=>
                    'S'+(sector+1)+' '+formatTime(split)).join('  ·  ')}</small>
                  {data.completedLapChallenges[index] && (
                    <small className="replay-lap-status">
                      {data.completedLapChallenges[index].clean?'CLEAN LAP':'RAIL DAMAGE / RECOVERY'}
                      {' · '}{data.completedLapChallenges[index].pads}/3 EARNED PADS
                      {data.completedLapChallenges[index].differenceFromStartingBest===null?
                        ' · FIRST RECORD RUN':
                        ' · '+(data.completedLapChallenges[index].differenceFromStartingBest!<0?
                          'FASTER THAN PRIOR PB BY '+formatTime(-data.completedLapChallenges[index].differenceFromStartingBest!):
                          'BEHIND PRIOR PB BY '+formatTime(data.completedLapChallenges[index].differenceFromStartingBest!))}
                    </small>
                  )}
                </div>
              </div>
            ))}
            <div><span>PERSONAL BEST LAP</span><strong className="mono">{data.bestLap===null?'—':formatTime(data.bestLap)}</strong></div>
            <div><span>RECOVERIES</span><strong className="mono">{data.recoveryCount} · +{data.recoveryCount*5} S</strong></div>
            <div><span>NEXT CHALLENGE</span><strong>BEAT YOUR BEST · CLEAN LAP · ALL 3 PADS</strong></div>
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
            <p>Follow the illuminated deck and the highlighted amber quarter-gate beacon, then the finish line after S3. Each of the three laps requires S1, S2 and S3 in order. Amber roadside braking boards warn of tighter bends; the on-screen curve speed is advice, not automatic braking. Guardrail impacts damage your shield.</p>
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
            <div className="controller-setting">
              <label htmlFor="ion-stick-deadzone">CONTROLLER STICK DEAD ZONE</label>
              <select id="ion-stick-deadzone" value={stickDeadzone}
                onChange={event=>chooseStickDeadzone(Number(event.currentTarget.value))}>
                {STICK_DEADZONE_OPTIONS.map(value=>(
                  <option key={value} value={value}>{Math.round(value*100)}% {value===.15?'· DEFAULT':''}</option>
                ))}
              </select>
              <small>Lower values respond earlier. Increase this if a drifting stick steers without input.</small>
            </div>
            <p>Gamepad left stick, D-pad left/right, triggers, Start (pause), Y (camera), X (restart), and LB (recover) are supported. Touch controls use left-thumb steering and right-thumb GO, BRAKE and BOOST; slide between buttons without lifting. Orange track pads replenish boost. Track recovery sends you to the last earned quarter gate (or the start grid before S1), costing 5 seconds, 8 shield and 25 boost. It cannot award a missed checkpoint.</p>
            <p>Optional synthesized race audio can be switched on or off with AUDIO in the header. Sound starts muted each session, uses no external recordings, and never affects race scoring. Release an empty boost trigger to recharge, or cross an orange pad for a genuine refill.</p>
            <button className="cta" type="button" onClick={()=>setHelp(false)}>CLOSE MANUAL <span>×</span></button>
          </section>
        </div>
      )}

      {isRace && (
        <div className="touch-bar" aria-label="Thumb driving controls">
          <TouchZone key={'steer-'+touchResetSerial} input={input} actions={STEERING_ACTIONS}
            className="touch-steering" label="Steering" keyboardBase={-101}/>
          <TouchZone key={'drive-'+touchResetSerial} input={input} actions={DRIVING_ACTIONS}
            className="touch-driving" label="Throttle, brake and boost" keyboardBase={-201}/>
          <button type="button" className="touch-recover" disabled={!data.recoveryReady}
            onClick={recover} aria-label={'Recover to '+recoveryDestination+
              ', adding 5 seconds and reducing shield and boost'}>
            RECOVER · +5 S
          </button>
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
