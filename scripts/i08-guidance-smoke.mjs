/**
 * ION I08 — executable guidance validation using the real source geometry
 * and original RaceEngine. Never writes engine checkpoint, lap or score state.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const dir=await mkdtemp(path.join(tmpdir(),'ion-i08-'));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const idle={throttle:0,brake:0,steer:0,boost:false};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const pass=(label,info='')=>console.log('PASS I08 '+label+(info?' — '+info:''));
try{
  const trackPath=path.join(dir,'track.mjs');
  const simPath=path.join(dir,'simulation.mjs');
  for(const [entryPoints,outfile] of [
    [['src/track.ts'],trackPath],[['src/simulation.ts'],simPath]
  ])await build({entryPoints,outfile,bundle:true,platform:'node',
    format:'esm',target:'node22',logLevel:'error'});
  const {
    requiredBeaconIndex,upcomingApproach,headingAt,trackAt,TRACK_LENGTH
  }=await import(pathToFileURL(trackPath).href);
  const {RaceEngine}=await import(pathToFileURL(simPath).href);

  const sequence=[1,2,3,0];
  for(let gate=0;gate<=3;gate++)
    assert.equal(requiredBeaconIndex(gate),sequence[gate]);
  pass('source beacon target mapping','grid→S1→S2→S3→finish');

  let found=0,braking=0,left=0,right=0;
  const aheadHeading=(t,distance,shift)=>{
    return headingAt(((t+(distance+shift)/TRACK_LENGTH)%1+1)%1);
  };
  for(let i=0;i<360;i++){
    const t=i/360;
    const advice=upcomingApproach(t,190);
    if(!advice)continue;
    found++;
    if(advice.brakeNow)braking++;
    if(advice.direction==='LEFT')left++; else right++;
    assert.ok(advice.distanceM>=24&&advice.distanceM<=440);
    assert.ok(advice.suggestedKmh>=75&&advice.suggestedKmh<=155);
    const before=aheadHeading(t,advice.distanceM,-14);
    const after=aheadHeading(t,advice.distanceM,14);
    const turn=wrap(after-before);
    assert.equal(advice.direction,turn>0?'LEFT':'RIGHT',
      'label must follow actual 3D spline yaw, not decorative board side');
    assert.ok(Math.abs(turn)>28/115-.015,
      'advisory should only reference a genuine strong bend');
    const slow=upcomingApproach(t,0);
    if(slow)assert.equal(slow.brakeNow,false,
      'never show BRAKE advice to a stationary vehicle');
  }
  assert.ok(found>30,'real circuit must provide useful corner approaches');
  assert.ok(braking>10,'fast race must generate some meaningful early braking instructions');
  pass('source-derived bend direction and early braking',
    'visible samples='+found+'; braking samples='+braking+
    '; left='+left+'; right='+right);

  assert.deepEqual(upcomingApproach(.98,190),upcomingApproach(-.02,190),
    'closed spline seam must show consistent guidance');
  assert.equal(upcomingApproach(Number.NaN,190),null);
  assert.equal(upcomingApproach(.1,Number.POSITIVE_INFINITY),null);
  pass('guidance wraparound and invalid input safety');

  // Normal RaceEngine input physically earns its first quarter gate.
  // No direct update of the game.checkpoints field is allowed.
  const game=new RaceEngine();
  game.start();
  for(let i=0;i<300&&game.phase==='countdown';i++)
    game.update(1/60,idle);
  assert.equal(game.phase,'racing');
  let steps=0;
  while(game.checkpoints<1&&steps++<60*90&&game.phase==='racing'){
    const look=clamp(17+game.speed*.5,19,30);
    const ahead=trackAt((game.previousT+look/TRACK_LENGTH)%1).position;
    const yaw=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    const steer=clamp(-wrap(yaw-game.heading)*2.4,-1,1);
    game.update(1/60,{
      throttle:game.speed<16.5?.62:0,
      brake:game.speed>18.5?.22:0,
      steer,boost:false,
    });
  }
  assert.equal(game.checkpoints,1,'must earn S1 through real forward driving');
  const snapshot=game.snapshot();
  assert.equal(snapshot.nextGate,2);
  assert.equal(snapshot.nextGateLabel,'SECTOR 2');
  assert.equal(requiredBeaconIndex(game.checkpoints),2);
  assert.ok(snapshot.distanceToGateM>0);
  pass('native scored S1 and next visible target S2',
    'earned in '+steps+' fixed-step updates');
} finally {
  await rm(dir,{recursive:true,force:true});
}
