/**
 * ION I06 — deterministic low-speed 3-lap qualification.
 *
 * This drives the ORIGINAL RaceEngine through actual 60Hz physics updates
 * against the exact original track.ts curve. The pilot supplies only normal
 * Controls (throttle/brake/steer), reads only source snapshot/position.
 * It cannot grant sectors, invent a lap, mutate scoring or teleport the car.
 *
 * PASS is an engine-level scripted race, NOT mobile/Chromium/human playability.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const home=await mkdtemp(path.join(tmpdir(),'ion-i06-laps-'));
const engineFile=path.join(home,'engine.mjs');
const trackFile=path.join(home,'track.mjs');
const neutral={throttle:0,brake:0,steer:0,boost:false};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
try {
  for(const [entryPoints,outfile] of [
    [['src/simulation.ts'],engineFile],
    [['src/track.ts'],trackFile],
  ]) {
    await build({entryPoints,outfile,bundle:true,platform:'node',
      format:'esm',target:'node22',logLevel:'error'});
  }
  const {RaceEngine}=await import(pathToFileURL(engineFile).href);
  const {TRACK_LENGTH,trackAt,nearestTrack}=await import(pathToFileURL(trackFile).href);
  const game=new RaceEngine();
  game.start();
  // The normal on-grid countdown remains authoritative.
  for(let i=0;i<300&&game.phase==='countdown';i++){
    game.update(1/60,neutral);
  }
  assert.equal(game.phase,'racing');

  let frames=0,maxLateral=0,wallEvents=0,lastLap=1;
  const limit=60*520; // 520 seconds at 60Hz is ample for 3 legitimate laps
  while(frames++<limit && game.phase==='racing'){
    const lookDistance=clamp(17+game.speed*.5,19,30);
    const aheadT=(game.previousT+lookDistance/TRACK_LENGTH)%1;
    const ahead=trackAt(aheadT).position;
    const desiredYaw=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    const error=wrap(desiredYaw-game.heading);
    // Positive steering is the canonical *negative* vehicle yaw.
    const steer=clamp(-error*2.4,-1,1);
    const cruise=16.5;
    const throttle=game.speed<cruise?.62:0;
    const brake=game.speed>cruise+2?.22:0;
    game.update(1/60,{throttle,brake,steer,boost:false});

    const nearest=nearestTrack(game.position.x,game.position.z,game.previousT);
    maxLateral=Math.max(maxLateral,Math.abs(nearest.lateral));
    if(game.impact>.9)wallEvents++;
    if(game.lap!==lastLap){
      console.log('LAP '+lastLap+' scored in '+game.lapTimes.at(-1)+
        's, sectors='+game.lastSector+
        ', checkpoints='+game.checkpoints);
      lastLap=game.lap;
    }
    if(game.phase==='finished' && game.reason==='destroyed')break;
  }

  assert.equal(game.reason,'complete',
    'scripted forward pilot must physically complete 3 genuine source-engine laps');
  assert.equal(game.lapTimes.length,3);
  assert.ok(game.lapTimes.every(t=>t>30&&Number.isFinite(t)));
  assert.ok(game.bestLap>0);
  assert.equal(game.recoveryCount,0,
    'pilot does not invoke recovery, teleport or bypass the authored path');
  assert.equal(game.checkpoints,0,'sector authority resets at real final finish');
  assert.ok(game.shield>0,'pilot must remain in the race');
  console.log('PASS authentic RaceEngine three-lap scripted steering'+
    ' — frames='+frames+', max lateral='+maxLateral.toFixed(2)+
    'm, impacts~'+wallEvents+', times='+game.lapTimes.map(t=>t.toFixed(2)).join('/'));
} finally {
  await rm(home,{recursive:true,force:true});
}
