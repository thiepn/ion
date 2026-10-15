/**
 * ION I10 — proof of honest source-earned replay challenges, clean laps,
 * real pad credits, strict personal-best events, and no fictional ghost.
 *
 * Exercises the original RaceEngine and Nightshift track through 60Hz
 * driving inputs. One deliberately earned S1 recovery is invoked via the
 * EXISTING recover() authority; lap/score/checkpoint state is never set.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const store=new Map([['ion-i06-nightshift-best-lap','240']]);
globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
};
const dir=await mkdtemp(path.join(tmpdir(),'ion-i10-'));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const neutral={throttle:0,brake:0,steer:0,boost:false};
const check=(label,detail='')=>console.log('PASS I10 '+label+(detail?' — '+detail:''));
try{
  const enginePath=path.join(dir,'engine.mjs'),trackPath=path.join(dir,'track.mjs');
  for(const [entryPoints,outfile] of [
    [['src/simulation.ts'],enginePath],[['src/track.ts'],trackPath]
  ])await build({entryPoints,outfile,bundle:true,format:'esm',platform:'node',
    target:'node22',logLevel:'error'});
  const {RaceEngine}=await import(pathToFileURL(enginePath).href);
  const {trackAt,TRACK_LENGTH}=await import(pathToFileURL(trackPath).href);
  const game=new RaceEngine();
  assert.equal(game.bestLap,240);
  game.start();
  assert.equal(game.snapshot().recordToBeat,240);
  for(let i=0;i<300&&game.phase==='countdown';i++)game.update(1/60,neutral);
  assert.equal(game.phase,'racing');

  let steps=0,previousSerial=0,previousOfficialBest=240,recovered=false;
  let personalBestEvents=0;
  const lapEvents=[];
  const maxSteps=60*590;
  while(game.phase==='racing'&&steps++<maxSteps){
    // Keep the second lap slower than the first. All real event PB labels
    // must compare with CURRENT saved best, not the pre-run 240s record.
    const targetSpeed=game.lap===2?13.5:16.5;
    const look=clamp(17+game.speed*.5,19,30);
    const ahead=trackAt((game.previousT+look/TRACK_LENGTH)%1).position;
    const yaw=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    game.update(1/60,{
      throttle:game.speed<targetSpeed?.62:0,
      brake:game.speed>targetSpeed+2?.22:0,
      steer:clamp(-wrap(yaw-game.heading)*2.4,-1,1),
      boost:false,
    });
    // Wait for REAL physical S1 credit, then the same authorized recover()
    // the player uses. No fake impact or fake recovery flag.
    if(!recovered && game.lap===1 && game.checkpoints>=1){
      assert.equal(game.recover(),true,'earned recovery must succeed');
      recovered=true;
    }
    const ev=game.snapshot().raceEvent;
    if(!ev||ev.serial===previousSerial)continue;
    assert.ok(ev.serial>previousSerial);
    previousSerial=ev.serial;
    if(ev.kind!=='lap')continue;
    assert.equal(ev.personalBest,ev.time<previousOfficialBest,
      'only a new official best can claim a personal-best event');
    if(ev.personalBest)personalBestEvents++;
    previousOfficialBest=Math.min(previousOfficialBest,ev.time);
    lapEvents.push(ev);
  }

  assert.equal(game.reason,'complete','legitimate source-scored three laps required');
  assert.equal(lapEvents.length,3);
  assert.equal(recovered,true);
  const result=game.snapshot();
  assert.equal(result.completedLapChallenges.length,3);
  assert.equal(result.completedSectorTimes.length,3);
  assert.equal(result.recordToBeat,240);
  assert.equal(result.recoveryCount,1);
  assert.equal(result.completedLapChallenges[0].clean,false,
    'earned recovery makes only that lap unclean');
  assert.equal(result.completedLapChallenges[1].clean,true);
  assert.equal(result.completedLapChallenges[2].clean,true);
  check('actual recovery changes only the affected lap cleanliness');

  for(let i=0;i<3;i++){
    const challenge=result.completedLapChallenges[i];
    assert.ok(challenge.pads>=0&&challenge.pads<=3);
    assert.equal(challenge.differenceFromStartingBest,
      result.lapTimes[i]-240);
    assert.equal(result.completedSectorTimes[i].length,4);
    assert.ok(Math.abs(result.completedSectorTimes[i].reduce((a,b)=>a+b,0)
      -result.lapTimes[i])<1e-5);
  }
  assert.ok(result.completedLapChallenges.reduce((a,l)=>a+l.pads,0)>=7,
    'physical pad crossings should produce earned pad credits');
  check('original physically earned boost strips and exact lap comparisons',
    'pads='+result.completedLapChallenges.map(l=>l.pads).join('/')+
    ', laps='+result.lapTimes.map(x=>x.toFixed(2)).join('/'));

  assert.ok(result.lapTimes[1]>result.lapTimes[0],
    'second lap must truly be slower for false-PB regression');
  assert.equal(lapEvents[1].personalBest,false,
    'slower lap 2 must not claim a PB despite beating 240s old record');
  assert.equal(result.newRecordThisRun,true);
  assert.equal(Number(store.get('ion-i06-nightshift-best-lap')),
    Math.min(...result.lapTimes));
  check('strict PB event against current saved best, not starting best',
    'true events='+personalBestEvents);

  const oldClean=result.completedLapChallenges[0].clean;
  result.completedLapChallenges[0].clean=true;
  assert.equal(game.snapshot().completedLapChallenges[0].clean,oldClean,
    'snapshot cannot mutate original challenge evidence');
  check('readonly source snapshot is copied');

  game.restart();
  const fresh=game.snapshot();
  assert.equal(fresh.phase,'countdown');
  assert.deepEqual(fresh.completedLapChallenges,[]);
  assert.equal(fresh.currentLapClean,true);
  assert.equal(fresh.currentLapPads,0);
  assert.equal(fresh.recordToBeat,Math.min(...result.lapTimes));
  assert.equal(fresh.bestLap,Math.min(...result.lapTimes));
  check('restart clears run-local challenges without erasing saved PB',
    'updates='+steps);
}finally{
  await rm(dir,{recursive:true,force:true});
  delete globalThis.localStorage;
}
