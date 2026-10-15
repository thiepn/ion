/**
 * ION I09 original RaceEngine three-lap/result qualification.
 *
 * RaceEngine itself earns every gate, lap, split and persisted best.
 * This only sends normal 60Hz controls. A read-only snapshot is observed
 * for the 12 physically earned sector/lap acknowledgements.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const files=new Map();
globalThis.localStorage={
  getItem:key=>files.has(key)?files.get(key):null,
  setItem:(key,value)=>files.set(key,String(value)),
};
const dir=await mkdtemp(path.join(tmpdir(),'ion-i09-'));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const controls={throttle:0,brake:0,steer:0,boost:false};
const pass=(label,extra='')=>console.log('PASS I09 '+label+(extra?' — '+extra:''));
try {
  const bundle=path.join(dir,'sim.mjs');
  const track=path.join(dir,'track.mjs');
  for(const [entryPoints,outfile] of [
    [['src/simulation.ts'],bundle],
    [['src/track.ts'],track]
  ])await build({entryPoints,outfile,bundle:true,platform:'node',
    format:'esm',target:'node22',logLevel:'error'});
  const {RaceEngine}=await import(pathToFileURL(bundle).href);
  const {trackAt,TRACK_LENGTH}=await import(pathToFileURL(track).href);
  const game=new RaceEngine();
  assert.equal(game.bestLap,null);
  game.start();
  for(let i=0;i<300&&game.phase==='countdown';i++)
    game.update(1/60,controls);
  assert.equal(game.phase,'racing');
  assert.equal(game.snapshot().count,0);
  pass('original grid countdown transitions to racing');

  let previousSerial=0,steps=0;
  const events=[];
  let maxSectorDeviation=0;
  while(game.phase==='racing' && steps++<60*500){
    const look=clamp(17+game.speed*.5,19,30);
    const ahead=trackAt((game.previousT+look/TRACK_LENGTH)%1).position;
    const angle=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    game.update(1/60,{
      throttle:game.speed<16.5?.62:0,
      brake:game.speed>18.5?.22:0,
      steer:clamp(-wrap(angle-game.heading)*2.4,-1,1),
      boost:false,
    });
    const snapshot=game.snapshot();
    if(snapshot.raceEvent && snapshot.raceEvent.serial!==previousSerial){
      const ev=snapshot.raceEvent;
      assert.ok(ev.serial>previousSerial,'event serial must strictly increase');
      previousSerial=ev.serial;
      events.push({...ev});
      if(ev.kind==='sector'){
        assert.equal(snapshot.lastSector,ev.sector);
        assert.ok(Math.abs(snapshot.lastSectorTime-ev.time)<.000001);
        assert.equal(snapshot.nextGate,ev.sector+1);
      }
      if(ev.kind==='lap'){
        assert.ok(Math.abs(snapshot.lapTimes.at(-1)-ev.time)<.000001);
        assert.equal(snapshot.completedSectorTimes.length,ev.lap);
      }
    }
  }
  assert.equal(game.reason,'complete','real three-lap journey must finish');
  const finished=game.snapshot();
  assert.equal(finished.phase,'finished');
  assert.equal(finished.lapTimes.length,3);
  assert.equal(finished.completedSectorTimes.length,3);
  assert.equal(events.length,12,'three laps must emit exactly 9 sectors and 3 laps');
  for(let lap=1;lap<=3;lap++){
    const within=events.filter(ev=>ev.lap===lap);
    assert.deepEqual(within.map(ev=>ev.kind==='lap'?'LAP':'S'+ev.sector),
      ['S1','S2','S3','LAP']);
    const splits=finished.completedSectorTimes[lap-1];
    assert.equal(splits.length,4);
    assert.ok(splits.every(v=>v>0&&Number.isFinite(v)));
    const sum=splits.reduce((a,b)=>a+b,0);
    const target=finished.lapTimes[lap-1];
    maxSectorDeviation=Math.max(maxSectorDeviation,Math.abs(sum-target));
    assert.ok(Math.abs(sum-target)<.00001,
      'actual sector timings must add to official lap time');
  }
  pass('physically earned event order',
    'S1/S2/S3/LAP x3 in '+steps+' updates');
  pass('four exact scored splits per lap',
    'max error '+maxSectorDeviation.toExponential(2)+'s');

  assert.equal(finished.newRecordThisRun,true);
  const fastest=Math.min(...finished.lapTimes);
  assert.ok(Math.abs(finished.bestLap-fastest)<.000001);
  assert.ok(Math.abs(Number(files.get('ion-i06-nightshift-best-lap'))-fastest)<.000001);
  assert.equal(finished.recoveryCount,0);
  pass('real personal-best persistence and truthful clean-race results',
    'best '+fastest.toFixed(3)+'s');

  const old=finished.completedSectorTimes[0][0];
  finished.completedSectorTimes[0][0]=99999;
  assert.ok(Math.abs(game.snapshot().completedSectorTimes[0][0]-old)<.000001,
    'snapshot history must not expose original mutable engine arrays');
  pass('snapshot does not expose mutable source result history');

  game.restart();
  const restarted=game.snapshot();
  assert.equal(restarted.phase,'countdown');
  assert.equal(restarted.lapTimes.length,0);
  assert.equal(restarted.completedSectorTimes.length,0);
  assert.equal(restarted.raceEvent,null);
  assert.equal(restarted.newRecordThisRun,false);
  assert.equal(restarted.bestLap,fastest,
    'restart must retain legitimate saved personal best');
  pass('restart resets session events, split history and PB announcement',
    'retains persisted real best');
}finally{
  await rm(dir,{recursive:true,force:true});
  delete globalThis.localStorage;
}
