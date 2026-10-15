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
  distanceToGateM: number;
  nextGateLabel: string;
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
  padSurge: boolean;
  trackWarning: 'wrong-way'|'missed-checkpoint'|'projection-recovered'|null;
};

const MAX_LAPS = 3;
// A materially different V17 circuit cannot share comparable lap records
// with the original Nightshift track. Older local records remain untouched.
const STORAGE_KEY = 'ion-v17-nightshift-best-lap';
const INPUT_STICK_DEADZONE_KEY = 'ion-i04-stick-deadzone';
const DEFAULT_STICK_DEADZONE = 0.15;
const MIN_STICK_DEADZONE = 0.08;
const MAX_STICK_DEADZONE = 0.28;
const TRIGGER_DEADZONE = 0.08;

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
  private gamepadIndex:number|null=null;
  private gamepadUsedForDriving=false;
  private requireNeutralGamepad=true;
  private stickDeadzone=InputController.readStickDeadzone();
  onGamepadDisconnect?: () => void;
  onGamepadConnect?: () => void;
  onKeyAction?: (action: 'pause' | 'reset' | 'camera' | 'recover') => void;
  /** Original authoritative race phase; menu buttons retain Space activation. */
  isRaceActive?: () => boolean;

  private readGamepad():Gamepad|null {
    let pads:(Gamepad|null)[]=[];
    try {
      pads=typeof navigator.getGamepads==='function'?
        Array.from(navigator.getGamepads()):[];
    }catch{pads=[];}
    const current=this.gamepadIndex===null?null:pads[this.gamepadIndex];
    if(current?.connected)return current;
    if(this.gamepadIndex!==null){
      this.gamepadIndex=null;
      this.gamepadActionButtons.fill(false);
      const wasDriving=this.gamepadUsedForDriving;
      this.gamepadUsedForDriving=false;
      this.requireNeutralGamepad=true;
      if(wasDriving)this.onGamepadDisconnect?.();
    }
    const next=pads.find((p):p is Gamepad=>Boolean(p?.connected))??null;
    if(next){
      this.gamepadIndex=next.index;
      this.requireNeutralGamepad=true;
      // Arm the new controller from its *current* physical state.
      // Holding Start while reconnecting must not toggle pause/restart.
      const indices=[9,3,2,4];
      this.gamepadActionButtons=indices.map(i=>Boolean(next.buttons[i]?.pressed));
      this.onGamepadConnect?.();
    }
    return next;
  }
  private static axis(value:number|undefined) {
    return Number.isFinite(value)?Math.max(-1,Math.min(1,value!)):0;
  }
  private static pressure(value:number|undefined) {
    return Number.isFinite(value)?Math.max(0,Math.min(1,value!)):0;
  }
  private static readStickDeadzone():number {
    try {
      const stored=localStorage.getItem(INPUT_STICK_DEADZONE_KEY);
      const parsed=stored===null?DEFAULT_STICK_DEADZONE:Number(stored);
      return Number.isFinite(parsed) && parsed>=MIN_STICK_DEADZONE &&
        parsed<=MAX_STICK_DEADZONE?parsed:DEFAULT_STICK_DEADZONE;
    } catch {return DEFAULT_STICK_DEADZONE;}
  }
  getStickDeadzone():number {return this.stickDeadzone;}
  setStickDeadzone(value:number) {
    if(!Number.isFinite(value))return;
    const selected=Math.max(MIN_STICK_DEADZONE,Math.min(MAX_STICK_DEADZONE,value));
    this.stickDeadzone=selected;
    try{localStorage.setItem(INPUT_STICK_DEADZONE_KEY,String(selected));}catch{/* optional preference */}
  }
  private static filteredTrigger(value:number|undefined):number {
    const pressure=InputController.pressure(value);
    return pressure<=TRIGGER_DEADZONE?0:
      (pressure-TRIGGER_DEADZONE)/(1-TRIGGER_DEADZONE);
  }
  /**
   * Gamepad actions and driving must share the same neutral handshake.
   * In particular a held Start button cannot restart an interrupted race
   * before the player releases the newly reconnected controller.
   */
  private readyGamepad(pad:Gamepad):boolean {
    if(!this.requireNeutralGamepad)return true;
    const neutral=Math.abs(InputController.axis(pad.axes[0]))<this.stickDeadzone &&
      InputController.pressure(pad.buttons[7]?.value)<=TRIGGER_DEADZONE &&
      InputController.pressure(pad.buttons[6]?.value)<=TRIGGER_DEADZONE &&
      // D-pad steering is also a driving input. Reconnect with a held
      // direction must remain disarmed until that physical input is released.
      ![0,1,2,3,4,5,9,14,15].some(i=>Boolean(pad.buttons[i]?.pressed));
    if(neutral)this.requireNeutralGamepad=false;
    return neutral;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    const element=e.target;
    if(element instanceof HTMLElement &&
      (element.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(element.tagName)))
      return;
    // Clicking SOUND, CAMERA or PAUSE leaves a <button> focused. Previously
    // *every* driving key except Escape was then discarded, so keyboard
    // driving silently stopped until the pilot clicked the canvas. During
    // racing, preserve driving keys even with a header button focused.
    // In menus/pause keep native button Space/Enter activation intact.
    const focusedButton=element instanceof HTMLElement && element.tagName==='BUTTON';
    const racing=this.isRaceActive?.()===true;
    if(focusedButton && !racing && code!=='Escape')return;
    if(focusedButton && racing && code==='Enter')return;
    // Do not suppress browser/system shortcuts (e.g. Ctrl+W, Alt+Left).
    // Input must also ignore all modifier chords rather than leaving a
    // previously held steering key latched through a shortcut.
    if(e.ctrlKey || e.altKey || e.metaKey)return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
    if (!e.repeat) {
      if (code === 'Escape' || code === 'KeyP') this.onKeyAction?.('pause');
      if (code === 'KeyR') this.onKeyAction?.('reset');
      if (code === 'KeyV') this.onKeyAction?.('camera');
      if (code === 'KeyT') this.onKeyAction?.('recover');
    }
    this.held.add(code);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    // Do not click the focused SOUND/CAMERA button as a side-effect of
    // releasing the boost key. Enter remains the accessible activation key.
    if(e.code==='Space' && this.isRaceActive?.() &&
      e.target instanceof HTMLElement && e.target.tagName==='BUTTON')
      e.preventDefault();
    this.held.delete(e.code);
  };
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
    this.isRaceActive=undefined;
    this.gamepadIndex=null;
    this.gamepadUsedForDriving=false;
    this.requireNeutralGamepad=true;
    this.gamepadActionButtons.fill(false);
  }
  clear() {
    this.held.clear();
    this.touchHeld.clear();
    // A new race/resume must not inherit "controller was used" from a prior
    // run. Otherwise an unused pad unplugged during keyboard play may pause
    // the new race even when its controls were never used for that run.
    this.gamepadUsedForDriving=false;
    // Reacquire the neutral controller position after interrupted focus,
    // instead of reviving a previously held throttle or boost trigger.
    this.requireNeutralGamepad=true;
  }
  /** Poll actions even while paused, with reconnect-safe edge detection. */
  pollGamepadActions() {
    const pad=this.readGamepad();
    if(!pad)return;
    const ready=this.readyGamepad(pad);
    const indices=[9,3,2,4]; // Start / Y / X / LB
    const actions=['pause','camera','reset','recover'] as const;
    indices.forEach((index,i)=>{
      const pressed=Boolean(pad.buttons[index]?.pressed);
      if(ready && pressed&&!this.gamepadActionButtons[i]){
        this.gamepadUsedForDriving=true;
        this.onKeyAction?.(actions[i]);
      }
      // Always capture the pressed baseline even when the neutral handshake
      // is still pending, so reconnecting with Start held is not an edge.
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
    const pad=this.readGamepad();
    if(pad){
      const rawAxis=InputController.axis(pad.axes[0]);
      if(!this.readyGamepad(pad))
        return {throttle,brake,steer,boost};
      const dz=this.stickDeadzone;
      const axis=Math.abs(rawAxis)>dz?
        Math.sign(rawAxis)*(Math.abs(rawAxis)-dz)/(1-dz):0;
      // Standard Gamepad D-pad left/right provides a usable fallback for
      // controllers without a reliable left stick. The existing dead-zoned
      // analog axis remains authoritative when no D-pad direction is held.
      const dpad=Number(Boolean(pad.buttons[15]?.pressed))-
        Number(Boolean(pad.buttons[14]?.pressed));
      const padSteer=dpad!==0?dpad:axis;
      // Explicit controller steering overrides a simultaneously held
      // keyboard direction. The former magnitude competition let a digital
      // key at |1| defeat every analog correction until that key was released.
      // A neutral controller leaves keyboard and touch steering available.
      if(dpad!==0 || Math.abs(axis)>.08)steer=padSteer;
      const gas=InputController.filteredTrigger(pad.buttons[7]?.value);
      const braking=InputController.filteredTrigger(pad.buttons[6]?.value);
      throttle=Math.max(throttle,gas,Number(Boolean(pad.buttons[0]?.pressed)));
      brake=Math.max(brake,braking,Number(Boolean(pad.buttons[1]?.pressed)));
      const padBoost=Boolean(pad.buttons[5]?.pressed);
      boost=boost||padBoost;
      // Only actual controller input claims controller ownership. Keyboard
      // or touch Space previously set gamepadUsedForDriving via the merged
      // "boost" variable, causing a disconnected *unused* gamepad to pause
      // an otherwise keyboard-driven race.
      if(Math.abs(padSteer)>.08 || gas>.08 || braking>.08 || padBoost ||
         pad.buttons[0]?.pressed || pad.buttons[1]?.pressed)
        this.gamepadUsedForDriving=true;
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
  private wallReleaseTime = 0;
  private wrongWaySeconds=0;
  private missedCheckpoint=false;
  private projectionWarningSeconds=0;
  private usedBoostPad = -1;
  private padSurgeSeconds=0;
  get padSurge(){return this.padSurgeSeconds>0;}
  private steering=0;
  // The physical travel direction follows the craft yaw through one bounded
  // grip response. It is not a second movement engine or scoring projector.
  // The craft points where the player steers immediately, while momentum
  // catches up so turns have readable grip rather than instant vector snaps.
  private motionHeading=headingAt(0);
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
    this.motionHeading=this.heading;
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
    this.wallReleaseTime=0;
    this.wrongWaySeconds=0;
    this.missedCheckpoint=false;
    this.projectionWarningSeconds=0;
    this.usedBoostPad = -1;
    this.padSurgeSeconds=0;
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
    this.motionHeading=this.heading;
    this.previousT=t;
    this.progress=t;
    this.checkpoints=gate;
    this.highestScoredCheckpoint=gate;
    this.sectorTimes.length=gate;
    this.lastSectorTime=gate>0?this.sectorTimes[gate-1]??null:null;
    this.lastSector=gate>0?gate:null;
    // Do not advance sectorStartTime here. It is the earned preceding gate's
    // *actual crossing time*, so the time already spent on this incomplete
    // sector AND the +5s recovery penalty belong to that sector. Resetting
    // the origin would incorrectly reduce the split and make its sum differ
    // from the official lap time.
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
    this.wallReleaseTime=0;
    this.wrongWaySeconds=0;
    this.missedCheckpoint=false;
    this.projectionWarningSeconds=0;
    this.recoveryCooldown=8;
    this.usedBoostPad=-1;
    this.padSurgeSeconds=0;
    this.lastBoostPadDistance=(this.lap-1)+t;
    this.recoveryCount++;
    return true;
  }
  start() { this.reset(); this.phase = 'countdown'; }
  restart() { this.start(); }
  pause() {
    if(this.phase==='racing'||this.phase==='countdown'){
      this.phase='paused';
      this.isBoosting=false;
    }else if(this.phase==='paused'){
      // Returning from an interrupted high-speed race should not resume at
      // full velocity before the player can see/reacquire the controls.
      if(this.count<=0)this.count=2.1;
      this.phase='countdown';
    }
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
    this.padSurgeSeconds=Math.max(0,this.padSurgeSeconds-dt);
    this.impact = Math.max(0, this.impact - dt * 2.4);
    this.projectionWarningSeconds=Math.max(0,this.projectionWarningSeconds-dt);

    const throttle=Math.max(0,Math.min(1,controls.throttle));
    const brake=Math.max(0,Math.min(1,controls.brake));
    // Brake wins over simultaneous throttle/boost. A player holding GO and
    // BRAKE (especially while sliding a thumb between pads) must decelerate,
    // not consume boost while pulling against the brakes.
    const driving=throttle>.05 && brake<.3;
    this.isBoosting=controls.boost && driving && this.boost>0;
    if (this.isBoosting) this.boost = Math.max(0, this.boost - dt * 27);
    else if (!controls.boost || !driving)
      // A held, empty boost trigger must not alternate between one free
      // acceleration frame and one regeneration frame. Releasing boost (or
      // throttle) is required before ordinary recharge resumes; real source
      // pads may still refill the pool while the trigger is held.
      this.boost = Math.min(100, this.boost + dt * 7.5);

    // Keep the original m/s speed authority and speed limits (86/112/115).
    // Gently taper thrust at high speed instead of abrupt acceleration, with
    // progressive braking and explicit pedal conflict handling.
    // Only the existing 60 Hz World loop integrates these velocities.
    const acceleration=(this.isBoosting?49:38)*
      (1-.24*Math.min(1,this.speed/115));
    const braking=brake*72;
    const drag=1.15+.00084*this.speed*this.speed;
    const cap=this.isBoosting?115:this.padSurgeSeconds>0?112:86;
    // Pad thrust is a short real surge. Do not snap from 112 straight back
    // to 86 on the following fixed step: smoothly shed overspeed when the
    // pad expires, preserving the original speed limits for sustained drive.
    const overspeedDrag=Math.max(0,this.speed-cap)*3.2;
    const forwardThrust=this.speed>=cap?0:
      throttle*acceleration*Math.max(0,1-brake*2.5);
    this.speed=Math.max(0,Math.min(115,
      this.speed+(forwardThrust-braking-drag-overspeedDrag)*dt));
    if(this.speed>cap && this.isBoosting)this.speed=cap;

    // Time-consistent steering filters work identically on keys, controller
    // and thumb zones; brakes increase slow-corner yaw response without
    // enabling zero-speed pivoting.
    const desiredSteering=Math.max(-1,Math.min(1,controls.steer));
    const filter=1-Math.exp(-dt*(desiredSteering===0?12:10.5));
    this.steering+=(desiredSteering-this.steering)*filter;
    const speedFactor=Math.min(this.speed/77,1);
    // With a chase camera viewing along the craft's +Z, projected screen
    // right is -X in Three's right-handed scene. A *negative* yaw moves
    // toward the player's screen right. The old positive sign flipped both
    // keyboard and touch steering. Brake-turning increases tight-corner
    // authority while holding full throttle is deliberately less twitchy.
    // Steering is velocity-coupled: stationary hovercraft must not spin in
    // place from a held direction input. Preserve enough authority at low
    // speed to escape a wall and enough at high speed to negotiate chicanes.
    // Right input remains negative yaw for the source chase-camera convention.
    const motionAuthority=Math.min(1,this.speed/6);
    const steeringRate=(.63+speedFactor*.96)*
      motionAuthority*(brake>.12?1.31:1);
    this.heading=wrapAngle(this.heading-this.steering*steeringRate*dt);
    const roadBefore=nearestTrack(this.position.x,this.position.z,this.previousT);
    // Gentle tangent alignment only when steering is almost neutral; the
    // player always retains deliberate cornering control.
    const assist=.21+(1-Math.abs(this.steering))*.37;
    this.heading=wrapAngle(this.heading+
      wrapAngle(roadBefore.heading-this.heading)*dt*assist*Math.min(this.speed/38,1));

    // Grip is a first-order, frame-rate-independent response from actual
    // velocity heading to desired craft yaw. At speed it permits a small
    // visible slip angle; hard braking progressively tightens grip.
    const gripRate=12-4*speedFactor+brake*4;
    this.motionHeading=wrapAngle(this.motionHeading+
      wrapAngle(this.heading-this.motionHeading)*(1-Math.exp(-dt*gripRate)));
    this.position.x+=Math.sin(this.motionHeading)*this.speed*dt;
    this.position.z+=Math.cos(this.motionHeading)*this.speed*dt;

    const road=nearestTrack(this.position.x,this.position.z,roadBefore.t);
    // Follow authentic elevation changes without an artificial bobbing
    // oscillation in the race's physical position.
    this.position.y+=(road.y+2.5-this.position.y)*
      (1-Math.exp(-dt*(8+2*speedFactor)));
    // Yaw-right is negative world Y rotation, so the screen-right wing is
    // local -X. Positive roll lowers that wing; V17's negative roll banked
    // *away* from the player's requested right turn.
    const slip=wrapAngle(this.heading-this.motionHeading);
    const bank=this.steering*speedFactor*(brake>.12?.17:.26)+
      Math.max(-.055,Math.min(.055,slip*.34));
    this.roll+=(bank-this.roll)*(1-Math.exp(-dt*8.2));
    const uphill=trackAt((road.t+.006)%1).position;
    const grade=Math.atan2(uphill.y-road.y,
      Math.hypot(uphill.x-road.centerX,uphill.z-road.centerZ)||1);
    const desiredPitch=-Math.min(.15,this.speed/680)+(brake>.12?.07:0)-
      Math.max(-.12,Math.min(.12,grade*.55));
    this.pitch+=(desiredPitch-this.pitch)*(1-Math.exp(-dt*6));

    // Compare the craft *body* with the actual visible rail, not its center.
    // Kestrel's authored wings extend 3.86m either side of center and the
    // visible inner rail begins at ROAD_HALF_WIDTH - .28 (12.72m).
    // The previous 11.5m centerline clamp allowed ~2.64m of wing penetration
    // before applying the collision, making the guardrail appear non-solid.
    // Keep a 0.2m margin; the original centerline projection remains in charge.
    const boundary = ROAD_HALF_WIDTH - 4.15;
    if (Math.abs(road.lateral) > boundary) {
      this.wallReleaseTime=0;
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
      // A tiny detachment caused by projection jitter is still the same
      // guardrail scrape. Require a true separation before another impact.
      this.wallReleaseTime+=dt;
      if(this.wallReleaseTime>.18)this.wallContactSide=0;
    }

    // The road and its collision projector remain the only race source.
    // Reject discontinuous projection jumps (e.g. overlapping spline arms)
    // rather than granting a segment that the craft never physically drove.
    const previousTrackT=this.previousT;
    let travel=road.t-previousTrackT;
    if(travel<-.5)travel+=1;
    if(travel>.5)travel-=1;
    const maximumProgressStep=Math.max(.006,3*this.speed*dt/TRACK_LENGTH);
    const validTravel=Math.abs(travel)<=maximumProgressStep;
    if(!validTravel){
      // An intersecting/nearby spline arm can briefly become the nearest
      // geometric segment. Do not adopt that projection: doing so silently
      // loses the next physical gate and may strand the three-lap race.
      // Restore this frame's known good local projection and slow the craft.
      this.position.x=roadBefore.centerX+
        roadBefore.rightX*Math.max(-boundary,Math.min(boundary,roadBefore.lateral));
      this.position.z=roadBefore.centerZ+
        roadBefore.rightZ*Math.max(-boundary,Math.min(boundary,roadBefore.lateral));
      this.position.y=roadBefore.y+2.5;
      this.heading=roadBefore.heading;
      this.speed=Math.min(this.speed,14);
      this.roll=0;
      this.impact=Math.max(this.impact,.42);
      this.projectionWarningSeconds=2.4;
      return;
    }
    this.previousT=road.t;
    const facing=Math.cos(wrapAngle(this.heading-road.heading));
    this.wrongWaySeconds=facing<-.2 && this.speed>10?
      Math.min(3,this.wrongWaySeconds+dt):Math.max(0,this.wrongWaySeconds-dt*1.8);
    if(validTravel){
      this.progress=Math.max(0,this.progress+travel);
    }

    // Score a quarter-sector at most once in this lap, only when actually
    // crossing it forward and in order; reverse re-crossing is not credit.
    if(travel>0 && this.highestScoredCheckpoint<3){
      const gate=(this.highestScoredCheckpoint+1)*.25;
      const onRoad=Math.abs(road.lateral)<=boundary+.05 &&
        Math.abs(roadBefore.lateral)<=boundary+.05;
      const drivingForwards=Math.cos(wrapAngle(this.heading-road.heading))>.15;
      // Time the exact physical source-spline gate crossing, interpolating
      // within the fixed step instead of quantizing every split to 16.7ms.
      if(previousTrackT<gate && road.t>=gate &&
         validTravel && onRoad && drivingForwards){
        const ratio=Math.max(0,Math.min(1,(gate-previousTrackT)/travel));
        const crossedTime=this.lapTime-dt*(1-ratio);
        const split=Math.max(0,crossedTime-this.sectorStartTime);
        this.sectorTimes[this.highestScoredCheckpoint]=split;
        this.lastSectorTime=split;
        this.lastSector=this.highestScoredCheckpoint+1;
        this.sectorStartTime=crossedTime;
        this.highestScoredCheckpoint++;
        this.missedCheckpoint=false;
      }else if(previousTrackT<gate && road.t>=gate){
        // The player physically passed this required gate without satisfying
        // its forward / on-road rules; keep the credit unavailable and surface
        // a repair action instead of silently blocking all later laps.
        this.missedCheckpoint=true;
      }
      // A future sector marker can only be crossed after its predecessors.
      // Surface the missed gate, never invent credit for it.
      for(let future=this.highestScoredCheckpoint+1;future<=3;future++){
        const futureT=future*.25;
        if(previousTrackT<futureT && road.t>=futureT)
          this.missedCheckpoint=true;
      }
    }
    this.checkpoints=this.highestScoredCheckpoint;

    // Merely accumulating 100% progress cannot finish a lap. The vehicle
    // must cross the physical start/finish seam forward after S1-S3.
    const crossedFinish=validTravel && travel>0 &&
      previousTrackT>.95 && road.t<.05 &&
      Math.abs(road.lateral)<=boundary+.05 &&
      Math.abs(roadBefore.lateral)<=boundary+.05 &&
      Math.cos(wrapAngle(this.heading-road.heading))>.15;
    if(crossedFinish && this.highestScoredCheckpoint<3){
      // Reaching the finish early must not register a lap and must tell
      // players which earned checkpoint is missing.
      this.missedCheckpoint=true;
    }
    if(crossedFinish && this.highestScoredCheckpoint===3){
      // Across the wrapping seam, travel = (1-previousT) + road.t.
      // Keep the fractional remainder of this simulation step for lap 2/3.
      const fraction=Math.max(0,Math.min(1,(1-previousTrackT)/travel));
      const crossedTime=this.lapTime-dt*(1-fraction);
      const completedLap=Math.max(0,crossedTime);
      const finalSector=Math.max(0,completedLap-this.sectorStartTime);
      this.sectorTimes[3]=finalSector;
      this.lastSectorTime=finalSector;
      this.lastSector=4;
      this.lapTimes.push(completedLap);
      if(this.bestLap===null || completedLap<this.bestLap){
        this.bestLap=completedLap;
        saveBestLap(completedLap);
      }
      this.lapTime=Math.max(0,this.lapTime-completedLap);
      this.sectorStartTime=0;
      this.progress=road.t;
      this.highestScoredCheckpoint=0;
      this.checkpoints=0;
      this.missedCheckpoint=false;
      this.projectionWarningSeconds=0;
      this.wrongWaySeconds=0;
      this.sectorTimes=[];
      this.lap++;
      if(this.lap>MAX_LAPS){
        // The official race clock stops at the exact forward finish crossing;
        // do not retain the post-line fraction of the final fixed step.
        this.elapsed=Math.max(0,this.elapsed-dt*(1-fraction));
        this.phase='finished';
        this.reason='complete';
        this.isBoosting=false;
        this.speed=0;
        return;
      }
    }

    // Three physical orange source-pad strips. Earn a reward only when
    // moving across the *center* of one strip forward, not merely entering
    // its generous proximity window or reversing within that window.
    const pads = [0.16, 0.48, 0.80];
    const nearestPad = pads.findIndex(t => Math.abs(road.t - t) < 0.009);
    const crossedPad = travel>0 && validTravel ?
      pads.findIndex(t => previousTrackT<t && road.t>=t) : -1;
    const distance = (this.lap - 1) + this.progress;
    const onPad = crossedPad>=0 &&
      Math.abs(roadBefore.lateral)<8.25 &&
      Math.abs(road.lateral)<8.25 &&
      Math.cos(wrapAngle(this.heading-road.heading))>.15 &&
      this.speed>8;
    // Keep the original anti-farming distance gate and one-use occupancy
    // check. No refund from a small backwards/forwards oscillation.
    if (onPad && this.usedBoostPad !== crossedPad &&
      distance - this.lastBoostPadDistance > .12) {
      this.boost = Math.min(100, this.boost + 24);
      this.speed = Math.min(112, this.speed + 16);
      this.padSurgeSeconds=.9;
      this.usedBoostPad = crossedPad;
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
      distanceToGateM: Math.max(0,Math.round(
        (((this.highestScoredCheckpoint===3?1:(this.highestScoredCheckpoint+1)*.25)
        - this.previousT + 1) % 1) * TRACK_LENGTH)),
      nextGateLabel: this.highestScoredCheckpoint===3?'FINISH':
        'SECTOR '+(this.highestScoredCheckpoint+1),
      // HUD/minimap progress describes physical position within this lap.
      // The separate cumulative progress accumulator stays engine-private
      // for real pad distance/anti-farming and missed-gate recovery rules.
      progress: this.previousT,
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
      padSurge:this.padSurgeSeconds>0,
      trackWarning:this.wrongWaySeconds>.85?'wrong-way':
        this.projectionWarningSeconds>0?'projection-recovered':
        this.missedCheckpoint?'missed-checkpoint':null,
    };
  }
}
