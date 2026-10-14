import { headingAt, nearestTrack, ROAD_HALF_WIDTH, TRACK_LENGTH, trackAt } from './track';

export type Phase = 'menu' | 'countdown' | 'racing' | 'paused' | 'finished';
export type FinishReason = 'complete' | 'destroyed' | null;
export type Controls = { throttle: number; brake: number; steer: number; boost: boolean };
export type RaceSnapshot = {
  phase: Phase;
  reason: FinishReason;
  count: number;
  speedKmh: number;
  lap: number;
  laps: number;
  elapsed: number;
  lapTime: number;
  lapTimes: number[];
  bestLap: number | null;
  boost: number;
  shield: number;
  nextGate: number;
  progress: number;
  isBoosting: boolean;
  impact: number;
  worldX: number;
  worldZ: number;
  heading: number;
  sectorTimes: number[];
  lastSectorTime: number | null;
  lastSector: number | null;
  recoveryReady: boolean;
  recoveryCount: number;
};

const MAX_LAPS = 3;
const STORAGE_KEY = 'ion-v2-best-lap';

function readBestLap(): number | null {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
}
function saveBestLap(value: number) {
  try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* storage optional */ }
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export class InputController {
  private held = new Set<string>();
  private touchHeld = new Map<string,Set<number>>();
  private attached = false;
  private gamepadActionButtons=[false,false,false,false];
  onKeyAction?: (action: 'pause' | 'reset' | 'camera' | 'recover') => void;

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    const element=e.target;
    if(element instanceof HTMLElement &&
      (element.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(element.tagName))) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
    if (!e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (code === 'Escape' || code === 'KeyP') this.onKeyAction?.('pause');
      if (code === 'KeyR') this.onKeyAction?.('reset');
      if (code === 'KeyV') this.onKeyAction?.('camera');
      if (code === 'KeyT') this.onKeyAction?.('recover');
    }
    this.held.add(code);
  };
  private onKeyUp = (e: KeyboardEvent) => this.held.delete(e.code);
  private onBlur = () => this.clear();
  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }
  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.clear();
    this.gamepadActionButtons.fill(false);
  }
  clear() {
    this.held.clear();
    this.touchHeld.clear();
  }
  /** Called even while paused so gamepad Start can resume a race. */
  pollGamepadActions() {
    let pad: Gamepad | null = null;
    try {
      pad=typeof navigator.getGamepads==='function'?
        Array.from(navigator.getGamepads()).find((p):p is Gamepad=>Boolean(p)) ?? null:null;
    }catch { pad=null; }
    const indices=[9,3,2,4]; // Start/Pause, Y/Camera, X/Reset, LB/Recover
    const actions=['pause','camera','reset','recover'] as const;
    indices.forEach((index,i)=>{
      const pressed=Boolean(pad?.buttons[index]?.pressed);
      if(pressed&&!this.gamepadActionButtons[i])this.onKeyAction?.(actions[i]);
      this.gamepadActionButtons[i]=pressed;
    });
  }
  press(code:string,pointerId?:number) {
    if(pointerId===undefined) {this.held.add(code);return;}
    let ids=this.touchHeld.get(code);
    if(!ids){ids=new Set();this.touchHeld.set(code,ids);}
    ids.add(pointerId);
  }
  release(code:string,pointerId?:number) {
    if(pointerId===undefined){this.held.delete(code);return;}
    const ids=this.touchHeld.get(code);
    ids?.delete(pointerId);
    if(ids?.size===0)this.touchHeld.delete(code);
  }
  get(): Controls {
    const has=(code:string)=>this.held.has(code)||Boolean(this.touchHeld.get(code)?.size);
    let steer = Number(has('KeyD') || has('ArrowRight')) - Number(has('KeyA') || has('ArrowLeft'));
    let throttle = Number(has('KeyW') || has('ArrowUp'));
    let brake = Number(has('KeyS') || has('ArrowDown'));
    let boost = has('Space') || has('ShiftLeft') || has('ShiftRight');
    if (typeof navigator.getGamepads === 'function') {
      // Some sandboxed/browser configurations deny Gamepad API access.
      let pad: Gamepad | null = null;
      try { pad=Array.from(navigator.getGamepads()).find((p):p is Gamepad=>Boolean(p)) ?? null; }
      catch { pad=null; }
      if (pad) {
        const rawAxis=pad.axes[0]||0;
        const axis=Math.abs(rawAxis)>.15?
          Math.sign(rawAxis)*(Math.abs(rawAxis)-.15)/.85:0;
        steer = Math.abs(axis) > Math.abs(steer) ? axis : steer;
        throttle = Math.max(throttle, pad.buttons[7]?.value || 0, Number(Boolean(pad.buttons[0]?.pressed)));
        brake = Math.max(brake, pad.buttons[6]?.value || 0, Number(Boolean(pad.buttons[1]?.pressed)));
        boost = boost || Boolean(pad.buttons[5]?.pressed);
      }
    }
    return { throttle, brake, steer, boost };
  }
}

export class RaceEngine {
  phase: Phase = 'menu';
  reason: FinishReason = null;
  position = (() => {
    const p = trackAt(0).position.clone();
    p.y += 2.5;
    return p;
  })();
  heading = headingAt(0);
  speed = 0;
  pitch = 0;
  roll = 0;
  lap = 1;
  elapsed = 0;
  lapTime = 0;
  lapTimes: number[] = [];
  boost = 100;
  shield = 100;
  bestLap = readBestLap();
  count = 3.5;
  checkpoints = 0;
  progress = 0;
  previousT = 0;
  isBoosting = false;
  impact = 0;
  private wallCooldown = 0;
  private wallContactSide = 0;
  private usedBoostPad = -1;
  private steering=0;
  /** Smoothed driver's last steering command, shared only within this engine. */
  get steeringAmount(){return this.steering;}
  private lastBoostPadDistance = -1;
  sectorTimes:number[]=[];
  lastSectorTime:number|null=null;
  lastSector:number|null=null;
  private sectorStartTime=0;
  private highestScoredCheckpoint=0;
  recoveryCount=0;
  private recoveryCooldown=0;
  private lastImpactSide=1;
  get impactSide(){return this.lastImpactSide;}
  get recoveryReady(){
    return (this.phase==='racing'||this.phase==='paused')&&
      this.recoveryCooldown<=0&&this.shield>0;
  }

  reset() {
    this.position.copy(trackAt(0).position);
    this.position.y += 2.5;
    this.heading = headingAt(0);
    this.speed = 0;
    this.pitch = 0;
    this.roll = 0;
    this.lap = 1;
    this.elapsed = 0;
    this.lapTime = 0;
    this.lapTimes = [];
    this.boost = 100;
    this.shield = 100;
    this.checkpoints = 0;
    this.progress = 0;
    this.previousT = 0;
    this.isBoosting = false;
    this.reason = null;
    this.count = 3.5;
    this.wallCooldown = 0;
    this.wallContactSide = 0;
    this.usedBoostPad = -1;
    this.lastBoostPadDistance = -1;
    this.impact = 0;
    this.steering=0;
    this.sectorTimes=[];
    this.lastSectorTime=null;
    this.lastSector=null;
    this.sectorStartTime=0;
    this.highestScoredCheckpoint=0;
    this.recoveryCount=0;
    this.recoveryCooldown=0;
    this.lastImpactSide=1;
  }
  /**
   * Recover from being pinned to a rail, without resetting a race or
   * bypassing any unearned checkpoints. Only the last crossed 25% marker
   * is a valid respawn. Time/shield/boost penalties prevent record exploits.
   */
  recover(): boolean {
    if(!this.recoveryReady)return false;
    const gate=Math.min(3,this.highestScoredCheckpoint);
    const t=gate*.25;
    const spot=trackAt(t);
    this.position.copy(spot.position);
    this.position.y+=2.5;
    this.heading=Math.atan2(spot.tangent.x,spot.tangent.z);
    this.previousT=t;
    this.progress=t;
    this.checkpoints=gate;
    this.highestScoredCheckpoint=gate;
    this.sectorTimes.length=gate;
    this.lastSectorTime=gate>0?this.sectorTimes[gate-1]??null:null;
    this.lastSector=gate>0?gate:null;
    // The time penalty belongs to the current split too; otherwise the sum
    // of displayed sector times silently diverges from the official lap time.
    this.sectorStartTime=this.lapTime;
    this.speed=0;
    this.roll=0;
    this.pitch=0;
    this.steering=0;
    this.impact=0;
    this.elapsed+=5;
    this.lapTime+=5;
    this.boost=Math.max(0,this.boost-25);
    this.shield=Math.max(1,this.shield-8);
    this.wallCooldown=1;
    this.wallContactSide=0;
    this.recoveryCooldown=8;
    this.usedBoostPad=-1;
    this.lastBoostPadDistance=(this.lap-1)+t;
    this.recoveryCount++;
    return true;
  }
  start() { this.reset(); this.phase = 'countdown'; }
  restart() { this.start(); }
  pause() {
    if (this.phase === 'racing' || this.phase === 'countdown') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = this.count > 0 ? 'countdown' : 'racing';
  }
  menu() { this.reset(); this.phase = 'menu'; }

  update(rawDelta: number, controls: Controls) {
    const dt = Math.min(rawDelta, 0.045);
    if (this.phase === 'countdown') {
      this.count = Math.max(0, this.count - dt);
      if (this.count <= 0) this.phase = 'racing';
      return;
    }
    if (this.phase !== 'racing') return;

    this.elapsed += dt;
    this.lapTime += dt;
    this.wallCooldown = Math.max(0, this.wallCooldown - dt);
    this.recoveryCooldown = Math.max(0, this.recoveryCooldown - dt);
    this.impact = Math.max(0, this.impact - dt * 2.4);

    const driving = controls.throttle > 0;
    this.isBoosting = controls.boost && driving && this.boost > 0;
    if (this.isBoosting) this.boost = Math.max(0, this.boost - dt * 27);
    else this.boost = Math.min(100, this.boost + dt * 7.5);

    // Arcade acceleration, aerodynamic drag and stronger braking.
    // The 60 Hz fixed-step World loop is the only authoritative integrator.
    const acceleration=this.isBoosting?46:32;
    const braking=Math.max(0,controls.brake)*58;
    const drag=1.35 + .00093*this.speed*this.speed;
    this.speed=Math.max(0,Math.min(this.isBoosting?115:86,
      this.speed+(controls.throttle*acceleration-braking-drag)*dt));

    // Time-consistent input filtering removes digital steering snap and
    // works with continuous gamepad axes without introducing a second physics
    // authority. Braking helps rotate tightly at the apex.
    const desiredSteering=Math.max(-1,Math.min(1,controls.steer));
    const filter=1-Math.exp(-dt*(desiredSteering===0?8.3:11.0));
    this.steering+=(desiredSteering-this.steering)*filter;
    const speedFactor=Math.min(this.speed/77,1);
    const steeringRate=(.50+speedFactor*1.27)*(controls.brake>.05?1.18:1);
    this.heading=wrapAngle(this.heading+this.steering*steeringRate*dt);
    const roadBefore=nearestTrack(this.position.x,this.position.z,this.previousT);
    // Gentle tangent alignment only when steering is almost neutral; the
    // player always retains deliberate cornering control.
    const assist=.16+(1-Math.abs(this.steering))*.26;
    this.heading=wrapAngle(this.heading+
      wrapAngle(roadBefore.heading-this.heading)*dt*assist*Math.min(this.speed/38,1));

    this.position.x += Math.sin(this.heading)*this.speed*dt;
    this.position.z += Math.cos(this.heading)*this.speed*dt;

    const road=nearestTrack(this.position.x,this.position.z,roadBefore.t);
    this.position.y += (road.y + 2.5 - this.position.y) * Math.min(1, dt * 7);
    const bank=-this.steering*speedFactor*(controls.brake>.05?.17:.27);
    this.roll+=(bank-this.roll)*(1-Math.exp(-dt*7.4));
    const desiredPitch=-Math.min(.17,this.speed/620)+(controls.brake>.05?.075:0);
    this.pitch+=(desiredPitch-this.pitch)*(1-Math.exp(-dt*5.2));

    const boundary = ROAD_HALF_WIDTH - 1.5;
    if (Math.abs(road.lateral) > boundary) {
      const side = Math.sign(road.lateral);
      const newImpact=this.wallContactSide!==side;
      this.wallContactSide=side;
      this.position.x = road.centerX + road.rightX * boundary * side;
      this.position.z = road.centerZ + road.rightZ * boundary * side;
      // A continuous scrape against the same rail is one collision, not
      // new full-speed shield damage every cooldown cycle.
      if (newImpact && this.wallCooldown <= 0 && this.speed > 12) {
        // Resolve a real impact once, not exponential drag every frame while
        // the craft is touching a rail. Damage scales with actual impact speed.
        const impactSpeed = this.speed;
        this.speed *= 0.69;
        this.shield = Math.max(0, this.shield - Math.max(8, Math.min(19, 6 + impactSpeed * .115)));
        this.wallCooldown = 0.64;
        this.impact = 1;
        this.lastImpactSide=side;
      }
      // Redirect velocity along the track so a steering-locked player can
      // escape a guardrail rather than losing speed on every 60 Hz tick.
      this.heading = wrapAngle(this.heading +
        wrapAngle(road.heading - this.heading) * Math.min(1, dt * 13));
      if (this.shield <= 0) {
        this.phase = 'finished';
        this.reason = 'destroyed';
        this.isBoosting = false;
        return;
      }
    }else{
      this.wallContactSide=0;
    }

    // The road and its collision projector remain the only race source.
    // Reject discontinuous projection jumps (e.g. overlapping spline arms)
    // rather than granting a segment that the craft never physically drove.
    const previousTrackT=this.previousT;
    let travel=road.t-previousTrackT;
    if(travel<-.5)travel+=1;
    if(travel>.5)travel-=1;
    this.previousT=road.t;
    const maximumProgressStep=Math.max(.006,3*this.speed*dt/TRACK_LENGTH);
    const validTravel=Math.abs(travel)<=maximumProgressStep;
    const previousProgress=this.progress;
    if(validTravel){
      this.progress=Math.max(0,this.progress+travel);
    }

    // Score a quarter-sector at most once in this lap, only when actually
    // crossing it forward and in order; reverse re-crossing is not credit.
    if(validTravel && travel>0 && this.highestScoredCheckpoint<3){
      const gate=(this.highestScoredCheckpoint+1)*.25;
      if(previousProgress<gate && this.progress>=gate){
        const split=this.lapTime-this.sectorStartTime;
        this.sectorTimes[this.highestScoredCheckpoint]=split;
        this.lastSectorTime=split;
        this.lastSector=this.highestScoredCheckpoint+1;
        this.sectorStartTime=this.lapTime;
        this.highestScoredCheckpoint++;
      }
    }
    this.checkpoints=this.highestScoredCheckpoint;

    // Merely accumulating 100% progress cannot finish a lap. The vehicle
    // must cross the physical start/finish seam forward after S1-S3.
    const crossedFinish=validTravel && travel>0 &&
      previousTrackT>.95 && road.t<.05;
    if(crossedFinish && this.highestScoredCheckpoint===3 && this.progress>=.98){
      const finalSector=this.lapTime-this.sectorStartTime;
      this.sectorTimes[3]=finalSector;
      this.lastSectorTime=finalSector;
      this.lastSector=4;
      this.lapTimes.push(this.lapTime);
      if(this.bestLap===null || this.lapTime<this.bestLap){
        this.bestLap=this.lapTime;
        saveBestLap(this.lapTime);
      }
      this.lapTime=0;
      this.sectorStartTime=0;
      this.progress=Math.max(0,this.progress-1);
      this.highestScoredCheckpoint=0;
      this.checkpoints=0;
      this.sectorTimes=[];
      this.lap++;
      if(this.lap>MAX_LAPS){
        this.phase='finished';
        this.reason='complete';
        this.isBoosting=false;
        return; // Finished runs cannot trigger later boost-pad rewards.
      }
    }

    // Three track boost pads. Each is triggered once per crossing.
    const pads = [0.16, 0.48, 0.80];
    const nearestPad = pads.findIndex(t => Math.abs(road.t - t) < 0.009);
    const distance = (this.lap - 1) + this.progress;
    // Pads are three physical centered strips, not a full-width invisible
    // reward zone; no farming energy by rocking backward across their edges.
    const onPad = nearestPad >= 0 && Math.abs(road.lateral) < 8.25 &&
      validTravel && travel > 0 && this.speed > 8;
    if (onPad && this.usedBoostPad !== nearestPad &&
      distance - this.lastBoostPadDistance > .12) {
      this.boost = Math.min(100, this.boost + 24);
      this.speed = Math.min(112, this.speed + 16);
      this.usedBoostPad = nearestPad;
      this.lastBoostPadDistance = distance;
    } else if (nearestPad === -1) {
      this.usedBoostPad = -1;
    }
  }

  snapshot(): RaceSnapshot {
    return {
      phase: this.phase,
      reason: this.reason,
      count: Math.ceil(this.count),
      speedKmh: Math.round(this.speed * 3.6),
      lap: Math.min(this.lap, MAX_LAPS),
      laps: MAX_LAPS,
      elapsed: this.elapsed,
      lapTime: this.lapTime,
      lapTimes: [...this.lapTimes],
      bestLap: this.bestLap,
      boost: Math.round(this.boost),
      shield: Math.round(this.shield),
      nextGate: this.checkpoints + 1,
      progress: this.progress,
      isBoosting: this.isBoosting,
      impact: this.impact,
      worldX: this.position.x,
      worldZ: this.position.z,
      heading: this.heading,
      sectorTimes:[...this.sectorTimes],
      lastSectorTime:this.lastSectorTime,
      lastSector:this.lastSector,
      recoveryReady:this.recoveryReady,
      recoveryCount:this.recoveryCount,
    };
  }
}
