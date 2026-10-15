/**
 * ION I16 — actual RaceAudio in-memory WebAudio graph + original 60Hz
 * RaceEngine three-lap source drive. Fake browser AUDIO DEVICES ONLY:
 * no mock race outcomes, source event credits or alternate scoring.
 * These checks do NOT establish perceived audio quality or mobile browser PASS.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

class Param{
  value=0;history=[];
  setTargetAtTime(v){this.value=v;this.history.push(v);}
  setValueAtTime(v){this.value=v;this.history.push(v);}
  exponentialRampToValueAtTime(v){this.value=v;this.history.push(v);}
}
class Node{
  constructor(ctx,kind){this.ctx=ctx;this.kind=kind;this.connections=[];this.frequency=new Param();this.gain=new Param();}
  connect(n){this.connections.push(n);return n;}
  disconnect(){this.connections=[];}
  start(){this.ctx.started.push(this);}
  stop(){this.ctx.stopped.push(this);this.onended?.();}
}
class FakeAudioContext{
  static last=null;
  constructor(){
    FakeAudioContext.last=this;
    this.state='suspended';this.currentTime=0;this.sampleRate=8000;
    this.nodes=[];this.started=[];this.stopped=[];
    this.resumeCalls=0;this.suspendCalls=0;this.closeCalls=0;
    this.destination={kind:'destination'};
  }
  createGain(){const n=new Node(this,'gain');this.nodes.push(n);return n;}
  createBiquadFilter(){const n=new Node(this,'filter');n.Q=new Param();this.nodes.push(n);return n;}
  createOscillator(){const n=new Node(this,'oscillator');this.nodes.push(n);return n;}
  createBuffer(channels,frames){assert.equal(channels,1);
    return {getChannelData(){return new Float32Array(frames)}};
  }
  createBufferSource(){const n=new Node(this,'buffer');this.nodes.push(n);return n;}
  async resume(){this.resumeCalls++;this.state='running';}
  async suspend(){this.suspendCalls++;this.state='suspended';}
  async close(){this.closeCalls++;this.state='closed';}
}
const dir=await mkdtemp(path.join(process.cwd(),'.i16-audio-'));
const store=new Map([['ion-i06-nightshift-best-lap','240']]);
const pass=(label,detail='')=>console.log('PASS I16 '+label+(detail?' — '+detail:''));
globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
};
globalThis.AudioContext=FakeAudioContext;
try{
  for(const [input,output] of [
    ['src/audio.ts','audio.mjs'],['src/simulation.ts','engine.mjs'],
    ['src/track.ts','track.mjs']
  ])await build({entryPoints:[input],outfile:path.join(dir,output),
    bundle:true,platform:'node',format:'esm',target:'node22',
    packages:'external',logLevel:'error'});
  const {RaceAudio}=await import(pathToFileURL(path.join(dir,'audio.mjs')).href);
  const {RaceEngine}=await import(pathToFileURL(path.join(dir,'engine.mjs')).href);
  const {trackAt,headingAt,RAIL_INNER_OFFSET,TRACK_LENGTH}=
    await import(pathToFileURL(path.join(dir,'track.mjs')).href);

  const audio=new RaceAudio();
  const game=new RaceEngine();
  assert.equal(audio.enabled,false);
  assert.equal(audio.volumeLevel,.5);
  audio.update(game.snapshot());
  assert.equal(FakeAudioContext.last,null,
    'no AudioContext before actual pilot gesture');
  audio.setVolume(.75);
  assert.equal(Number(store.get('ion-i16-audio-volume')),.75);
  assert.equal(audio.volumeLevel,.75);
  assert.equal(await audio.enable(),true);
  const ctx=FakeAudioContext.last;
  assert.equal(ctx.state,'running');
  assert.equal(ctx.nodes.filter(n=>n.kind==='buffer').length,1);
  assert.equal(ctx.started.filter(n=>n.kind==='buffer').length,1);
  assert.equal(ctx.started.filter(n=>n.kind==='oscillator').length,2);
  const master=ctx.nodes.find(n=>n.kind==='gain'&&
    n.connections.some(child=>child.kind==='destination'));
  assert.ok(master);
  assert.equal(master.gain.value,.75);
  pass('explicit opt-in, one deterministic synthesized airflow graph and device-local master volume');

  const controls={throttle:1,brake:0,steer:0,boost:false};
  game.start();
  const baselineOscillators=ctx.started.filter(n=>n.kind==='oscillator').length;
  for(let i=0;i<300 && game.phase==='countdown';i++){
    game.update(1/60,{throttle:0,brake:0,steer:0,boost:false});
    if(i%5===0)audio.update(game.snapshot());
  }
  assert.equal(game.phase,'racing');
  audio.update(game.snapshot(),controls);
  const motor=ctx.started.find(n=>n.kind==='oscillator'&&n.type==='sawtooth');
  assert.ok(motor);
  const throttlePitch=motor.frequency.value;
  audio.update(game.snapshot(),{throttle:0,brake:1,steer:0,boost:false});
  assert.ok(motor.frequency.value<throttlePitch,
    'braking must reduce actual engine pitch');
  assert.ok(ctx.nodes.some(n=>n.kind==='filter'&&n.type==='lowpass'));
  pass('native throttle vs braking motor response and wind filter');

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
  const padEvents=new Set();
  const sectorEvents=new Set();
  const completed=[];
  let lastSerial=0,steps=0;
  const maxSteps=60*440;
  while(game.phase==='racing'&&steps++<maxSteps){
    const ahead=trackAt((game.previousT+
      clamp(17+game.speed*.5,19,30)/TRACK_LENGTH)%1).position;
    const target=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    const inputs={
      throttle:game.speed<16.5?.62:0,
      brake:game.speed>18.5?.22:0,
      steer:clamp(-wrap(target-game.heading)*2.4,-1,1),boost:false,
    };
    game.update(1/60,inputs);
    if(steps%4!==0 && game.phase==='racing')continue;
    ctx.currentTime+=4/60;
    const snap=game.snapshot();
    audio.update(snap,inputs);
    if(snap.currentLapPads>0)padEvents.add(snap.lap+':'+snap.currentLapPads);
    if(snap.raceEvent && snap.raceEvent.serial>lastSerial){
      lastSerial=snap.raceEvent.serial;
      if(snap.raceEvent.kind==='sector')
        sectorEvents.add(snap.raceEvent.lap+':'+snap.raceEvent.sector);
      if(snap.raceEvent.kind==='lap')completed.push(snap.raceEvent.lap);
    }
  }
  assert.equal(game.reason,'complete',
    'source physical three-lap qualification must finish normally');
  assert.equal(game.lapTimes.length,3);
  assert.equal(completed.length,3);
  assert.ok(padEvents.size>=8,
    'source-earned pads must create authentic count transitions');
  assert.ok(sectorEvents.size>=8,
    'source quarter gates must create authentic sector transitions');
  const cueOscillators=ctx.started.filter(n=>n.kind==='oscillator').length-baselineOscillators;
  assert.ok(cueOscillators>=15,'earned milestones, pads and finish must synthesize real cues');
  assert.ok(cueOscillators<80,'rate-limited engine-owned cues must not explode');
  pass('real 3-lap sector, pad and finish cues without synthetic scores',
    steps+' steps, '+completed.length+' laps, '+padEvents.size+
    ' earned pad states, '+cueOscillators+' one-shot cues');

  // Reuse the exact source setup qualified by I07 collision fairness:
  // an angled Kestrel contacts the real rail and the original engine
  // subtracts shield. The audio can cue ONLY that observed physical hit.
  const contact=new RaceEngine();
  const site=trackAt(.055);
  contact.phase='racing';
  contact.position.copy(site.position);
  contact.position.addScaledVector(site.right,RAIL_INNER_OFFSET-2.6);
  contact.position.y+=2.5;
  contact.heading=headingAt(.055)+Math.PI/4;
  contact.motionHeading=contact.heading;
  contact.previousT=.055;
  contact.progress=.055;
  contact.speed=42;
  audio.update(contact.snapshot(),{throttle:0,brake:0,steer:0,boost:false});
  const priorShield=contact.shield;
  const priorSounds=ctx.started.length;
  contact.update(1/60,{throttle:0,brake:0,steer:0,boost:false});
  assert.ok(contact.shield<priorShield,
    'the original rail collision, not a fabricated impact, must remove shield');
  audio.update(contact.snapshot());
  assert.ok(ctx.started.length>priorSounds,
    'a real rising shield-damaging rail impact must create one cue');
  pass('source-earned fast wall contact synthesizes bounded impact feedback');

  const before=ctx.started.length;
  audio.disable();
  await Promise.resolve();
  assert.equal(audio.enabled,false);
  assert.equal(ctx.state,'suspended');
  assert.equal(master.gain.value,0);
  audio.update(game.snapshot());
  assert.equal(ctx.started.length,before,'muted audio never generates cues');
  const recent=game.snapshot();
  const stale={...recent,phase:'racing',
    raceEvent:{kind:'sector',lap:3,sector:2,time:42,elapsed:0,
      personalBest:false,serial:lastSerial+90}};
  audio.update(stale);
  assert.equal(await audio.enable(),true);
  audio.update(stale);
  assert.equal(ctx.started.length,before,
    'sound reactivation must not replay old events from mute period');
  pass('mute suspends graph and consumes stale source events before unmute');

  audio.setBackgroundSuspended(true);
  await Promise.resolve();
  assert.equal(ctx.state,'suspended');
  assert.equal(master.gain.value,0);
  const hiddenCount=ctx.started.length;
  audio.update(stale);
  assert.equal(ctx.started.length,hiddenCount);
  audio.setBackgroundSuspended(false);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(ctx.state,'running');
  assert.equal(master.gain.value,.75);
  pass('hidden tab suspension and opt-in foreground resumption');
  // Browser AudioContext resume can resolve after a later mute request.
  const rapid=new RaceAudio();
  const pending=rapid.enable();
  rapid.disable();
  assert.equal(await pending,false,'an obsolete enable request cannot win');
  assert.equal(rapid.enabled,false);
  assert.equal(await rapid.enable(),true,
    'subsequent explicit on gesture may unlock the same safe graph');
  rapid.dispose();
  pass('rapid ON/OFF/ON ignores stale async audio activation');

  audio.dispose();
  assert.equal(ctx.state,'closed');
  assert.ok(ctx.stopped.length>=3);
  assert.equal(audio.enabled,false);
  audio.reopen();
  assert.equal(await audio.enable(),true);
  assert.notEqual(FakeAudioContext.last,ctx);
  audio.dispose();
  pass('cleanup and StrictMode remount without residual audio graph');

  const app=readFileSync('src/App.tsx','utf8');
  const world=readFileSync('src/World.tsx','utf8');
  const wake=readFileSync('src/visuals/SpeedWake.tsx','utf8');
  const css=readFileSync('src/styles.css','utf8');
  assert.ok(app.includes("controlId=\"ion-pause-audio-volume\""));
  assert.ok(app.includes("controlId=\"ion-manual-audio-volume\""));
  assert.ok(app.includes("audio.setBackgroundSuspended(document.hidden)"));
  assert.ok(app.includes("audio.update(next,next.phase==='racing'?input.get():undefined)"));
  assert.ok(world.includes('reducedMotion={prefersReducedMotion}'));
  assert.ok(wake.includes("!reducedMotion&&game.phase==='racing'"));
  assert.ok(wake.includes('game.isBoosting||game.padSurge'));
  assert.ok(css.includes('.audio-mix-setting select:focus-visible'));
  pass('single original UI audio controls and reduced-motion native speed feedback');
}finally{
  await rm(dir,{recursive:true,force:true});
  delete globalThis.AudioContext;
  delete globalThis.localStorage;
}
