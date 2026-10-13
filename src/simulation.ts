import { headingAt, nearestTrack, ROAD_HALF_WIDTH, trackAt } from './track';

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
  private attached = false;
  onKeyAction?: (action: 'pause' | 'reset' | 'camera') => void;

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
    if (!e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (code === 'Escape' || code === 'KeyP') this.onKeyAction?.('pause');
      if (code === 'KeyR') this.onKeyAction?.('reset');
      if (code === 'KeyV') this.onKeyAction?.('camera');
    }
    this.held.add(code);
  };
  private onKeyUp = (e: KeyboardEvent) => this.held.delete(e.code);
  private onBlur = () => this.held.clear();
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
    this.held.clear();
  }
  press(code: string) { this.held.add(code); }
  release(code: string) { this.held.delete(code); }
  get(): Controls {
    const keys = this.held;
    let steer = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let throttle = Number(keys.has('KeyW') || keys.has('ArrowUp'));
    let brake = Number(keys.has('KeyS') || keys.has('ArrowDown'));
    let boost = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight');
    if (typeof navigator.getGamepads === 'function') {
      const pad = Array.from(navigator.getGamepads()).find(Boolean);
      if (pad) {
        const axis = Math.abs(pad.axes[0] || 0) > 0.15 ? pad.axes[0] : 0;
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
  private usedBoostPad = -1;

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
    this.usedBoostPad = -1;
    this.impact = 0;
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
    this.impact = Math.max(0, this.impact - dt * 2.4);

    const driving = controls.throttle > 0;
    this.isBoosting = controls.boost && driving && this.boost > 0;
    if (this.isBoosting) this.boost = Math.max(0, this.boost - dt * 27);
    else this.boost = Math.min(100, this.boost + dt * 7.5);

    const acceleration = this.isBoosting ? 46 : 32;
    this.speed += controls.throttle * acceleration * dt;
    this.speed -= controls.brake * 52 * dt;
    this.speed -= (2.0 + this.speed * 0.05) * dt;
    this.speed = Math.min(this.isBoosting ? 115 : 86, Math.max(0, this.speed));

    const steeringRate = 1.8 * (0.3 + Math.min(this.speed / 85, 1) * 0.65);
    this.heading = wrapAngle(this.heading + controls.steer * steeringRate * dt);
    // Mild built-in heading assist helps keyboard racers without steering for them.
    const roadBefore = nearestTrack(this.position.x, this.position.z);
    this.heading = wrapAngle(this.heading +
      wrapAngle(roadBefore.heading - this.heading) * dt * 0.26 * Math.min(this.speed / 45, 1));

    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    const road = nearestTrack(this.position.x, this.position.z);
    this.position.y += (road.y + 2.5 - this.position.y) * Math.min(1, dt * 7);
    this.roll += ((-controls.steer * Math.min(this.speed / 85, 1) * 0.22) - this.roll) * Math.min(1, dt * 8);
    this.pitch += ((-this.speed / 600) - this.pitch) * Math.min(1, dt * 5);

    const boundary = ROAD_HALF_WIDTH - 1.5;
    if (Math.abs(road.lateral) > boundary) {
      const side = Math.sign(road.lateral);
      this.position.x = road.centerX + road.rightX * boundary * side;
      this.position.z = road.centerZ + road.rightZ * boundary * side;
      if (this.wallCooldown <= 0 && this.speed > 12) {
        this.speed *= 0.63;
        this.shield = Math.max(0, this.shield - 13);
        this.wallCooldown = 0.58;
        this.impact = 1;
      }
      this.heading = wrapAngle(this.heading + wrapAngle(road.heading - this.heading) * Math.min(1, dt * 5));
      if (this.shield <= 0) {
        this.phase = 'finished';
        this.reason = 'destroyed';
        this.isBoosting = false;
        return;
      }
    }

    // Race progress is projected onto the same sampled spline as the road mesh.
    let travel = road.t - this.previousT;
    if (travel < -0.5) travel += 1;
    if (travel > 0.5) travel -= 1;
    this.previousT = road.t;
    // Use signed progress, not the sum of forward movements. Reversing and
    // re-crossing a checkpoint must never award a second segment.
    if (Math.abs(travel) < 0.035) {
      this.progress = Math.max(0, this.progress + travel);
    }
    this.checkpoints = [0.25, 0.5, 0.75].filter(gate => this.progress >= gate).length;
    if (this.progress >= 1 && this.checkpoints === 3) {
      this.lapTimes.push(this.lapTime);
      if (this.bestLap === null || this.lapTime < this.bestLap) {
        this.bestLap = this.lapTime;
        saveBestLap(this.lapTime);
      }
      this.lapTime = 0;
      this.progress -= 1;
      this.checkpoints = 0;
      this.lap += 1;
      if (this.lap > MAX_LAPS) {
        this.phase = 'finished';
        this.reason = 'complete';
        this.isBoosting = false;
      }
    }

    // Three track boost pads. Each is triggered once per crossing.
    const pads = [0.16, 0.48, 0.80];
    const nearestPad = pads.findIndex(t => Math.abs(road.t - t) < 0.009);
    if (nearestPad >= 0 && this.usedBoostPad !== nearestPad) {
      this.boost = Math.min(100, this.boost + 24);
      this.speed = Math.min(112, this.speed + 16);
      this.usedBoostPad = nearestPad;
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
    };
  }
}
