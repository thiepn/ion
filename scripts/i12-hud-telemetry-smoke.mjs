/**
 * ION I12 — source-owned telemetry and minimap acceptance.
 * Drive the original RaceEngine through three legitimate 60 Hz laps and
 * verify the minimap gate/finish statuses follow its checkpoints.
 * This is executable engine/source verification, NOT Chromium visual QA.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const temp=await mkdtemp(path.join(tmpdir(),'ion-i12-'));
const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const done=(name,detail='')=>console.log('PASS I12 '+name+(detail?' — '+detail:''));
try {
  const paths=[
    ['src/Minimap.tsx','map.mjs'],
    ['src/simulation.ts','engine.mjs'],
    ['src/track.ts','track.mjs'],
  ];
  for(const [entry,out] of paths){
    await build({entryPoints:[entry],outfile:path.join(temp,out),
      format:'esm',platform:'node',target:'node22',bundle:true,logLevel:'error'});
  }
  const {gateMarkerStatus}=await import(pathToFileURL(path.join(temp,'map.mjs')).href);
  const {RaceEngine}=await import(pathToFileURL(path.join(temp,'engine.mjs')).href);
  const {trackAt,TRACK_LENGTH}=await import(pathToFileURL(path.join(temp,'track.mjs')).href);
  const expected=[
    ['pending','next','pending','pending'],
    ['pending','earned','next','pending'],
    ['pending','earned','earned','next'],
    ['next','earned','earned','earned'],
  ];
  for(let g=1;g<=4;g++){
    assert.deepEqual([0,1,2,3].map(i=>gateMarkerStatus(i,g)),expected[g-1],
      'map marker must track exact original nextGate '+g);
  }
  done('source gate colors S1→S2→S3→FINISH',
    'finish never falsely credited on grid');

  const game=new RaceEngine();
  game.start();
  for(let i=0;i<300&&game.phase==='countdown';i++)
    game.update(1/60,{throttle:0,brake:0,steer:0,boost:false});
  assert.equal(game.phase,'racing');
  const events=[];
  let lastNext=game.snapshot().nextGate,steps=0,oneLapChanges=[];
  assert.equal(lastNext,1);
  while(game.phase==='racing' && steps++<60*540){
    const speed=game.speed;
    const look=clamp(17+speed*.5,19,30);
    const ahead=trackAt((game.previousT+look/TRACK_LENGTH)%1).position;
    const desired=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    game.update(1/60,{
      throttle:speed<16.5?.62:0,
      brake:speed>18.5?.22:0,
      steer:clamp(-wrap(desired-game.heading)*2.4,-1,1),
      boost:false,
    });
    const snapshot=game.snapshot();
    assert.ok(snapshot.nextGate>=1 && snapshot.nextGate<=4);
    assert.ok(snapshot.progress>=0 && snapshot.progress<=1);
    assert.ok(snapshot.distanceToGateM>=0);
    if(snapshot.nextGate!==lastNext){
      // 4->1 occurs only at the official seam after forward S1/S2/S3.
      if(lastNext===4 && snapshot.nextGate===1){
        assert.ok(game.lapTimes.length>0,'new lap only after scored finish');
        oneLapChanges.push('FINISH');
      }else{
        assert.equal(snapshot.nextGate,lastNext+1,
          'true checkpoint must advance only to the next gate');
        oneLapChanges.push('S'+lastNext);
      }
      events.push({next:snapshot.nextGate,label:snapshot.nextGateLabel,
        lap:snapshot.lap,progress:snapshot.progress});
      lastNext=snapshot.nextGate;
    }
  }
  assert.equal(game.reason,'complete','three native three-lap finishes required');
  assert.deepEqual(oneLapChanges,
    ['S1','S2','S3','FINISH','S1','S2','S3','FINISH',
     'S1','S2','S3','FINISH']);
  assert.equal(game.lapTimes.length,3);
  done('physically earned gates and finish seam',
    '12 changes across 3 completed laps, '+steps+' native updates');

  const css=readFileSync('src/styles.css','utf8');
  const mobile=readFileSync('src/v17.css','utf8');
  const app=readFileSync('src/App.tsx','utf8');
  const map=readFileSync('src/Minimap.tsx','utf8');
  assert.ok(map.includes('data-status={status}'));
  assert.ok(map.includes('race.nextGateLabel'));
  assert.ok(map.includes('aria-valuenow={progressPercent}'));
  assert.ok(map.includes('role="progressbar"'));
  assert.ok(app.includes('className="hud-gates"'));
  assert.ok(app.includes('data.nextGateLabel'));
  assert.ok(app.includes('data.lastSectorTime'));
  assert.ok(app.includes('role="meter"'));
  assert.ok(app.includes('aria-valuenow={level}'));
  assert.ok(css.includes('.hud-gate.earned') && css.includes('.hud-gate.next'));
  assert.ok(css.includes('.minimap-progress'));
  assert.ok(css.includes('(max-width:680px) and (orientation:portrait)'));
  assert.ok(css.includes('(orientation:landscape) and (max-height:540px)'));
  assert.ok(css.includes('.minimap svg {display:none}'));
  assert.ok(!mobile.includes('.minimap { display:none; }'));
  assert.ok(mobile.includes('env(safe-area-inset-bottom)'));
  assert.ok(mobile.includes('.touch-zone .touch-control.is-held'));
  done('native accessible HUD and 320px/short-landscape compact map source',
    'real scored telemetry, no copied progress state');
} finally {
  await rm(temp,{recursive:true,force:true});
}
