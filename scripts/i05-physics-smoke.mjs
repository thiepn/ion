/**
 * ION I05 focused original-engine physics smoke checks.
 * Uses esbuild already supplied by Vite; no external runner/test service.
 * Runs the real src/simulation.ts and src/track.ts, not copied equations.
 * This does NOT replace an actual Chromium three-lap playthrough.
 */
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const home=await mkdtemp(path.join(tmpdir(),'ion-i05-'));
const bundle=path.join(home,'engine.mjs');
const neutral={throttle:0,brake:0,steer:0,boost:false};
const right={...neutral,steer:1};
const left={...neutral,steer:-1};
const forward={...neutral,throttle:1};
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
try {
  await build({
    entryPoints:['src/simulation.ts'],
    outfile:bundle,
    bundle:true,
    platform:'node',
    format:'esm',
    target:'node22',
    logLevel:'error',
  });
  const {RaceEngine}=await import(pathToFileURL(bundle).href);
  const test=(name,run)=>{run();console.log('PASS '+name);};

  test('stationary steering cannot rotate a hovercraft',()=>{
    const game=new RaceEngine();
    game.phase='racing';
    const start=game.heading;
    for(let i=0;i<60;i++)game.update(1/60,right);
    assert.equal(game.speed,0);
    assert.ok(Math.abs(angleDifference(game.heading,start))<1e-6);
  });

  test('positive steering turns opposite the negative steering yaw',()=>{
    const toRight=new RaceEngine();
    const toLeft=new RaceEngine();
    for(const game of [toRight,toLeft]){
      game.phase='racing';
      game.speed=18;
    }
    const neutralGame=new RaceEngine();
    neutralGame.phase='racing';
    neutralGame.speed=18;
    for(let i=0;i<8;i++){
      toRight.update(1/60,right);
      toLeft.update(1/60,left);
      neutralGame.update(1/60,neutral);
    }
    // Comparing against the neutral craft isolates player steering from
    // natural road curvature and the genuine on-track steering assist.
    assert.ok(angleDifference(toRight.heading,neutralGame.heading)<0);
    assert.ok(angleDifference(toLeft.heading,neutralGame.heading)>0);
    assert.ok(angleDifference(toRight.heading,toLeft.heading)<0);
  });

  test('throttle accelerates and braking beats simultaneous boost',()=>{
    const game=new RaceEngine();
    game.phase='racing';
    for(let i=0;i<45;i++)game.update(1/60,forward);
    assert.ok(game.speed>5,'throttle must move the real craft');
    const beforeSpeed=game.speed;
    const beforeBoost=game.boost;
    game.update(1/60,{throttle:1,brake:1,steer:0,boost:true});
    assert.ok(game.speed<beforeSpeed,'brake must decelerate');
    assert.equal(game.isBoosting,false);
    assert.ok(game.boost>=beforeBoost,'brake must not consume boost');
  });

  test('turning motion has bounded but nonzero grip response',()=>{
    const game=new RaceEngine();
    game.phase='racing';
    game.speed=23;
    for(let i=0;i<8;i++)game.update(1/60,{...right,throttle:1});
    const lag=Math.abs(angleDifference(game.heading,game.motionHeading));
    assert.ok(lag>.004 && lag<.5,'craft must not instant-snap or drift excessively');
  });

  test('recovery preserves last earned-gate authority',()=>{
    const game=new RaceEngine();
    game.phase='racing';
    game.speed=23;
    game.update(1/60,forward);
    const before=game.elapsed;
    assert.equal(game.checkpoints,0);
    assert.equal(game.recover(),true);
    assert.equal(game.checkpoints,0);
    assert.equal(game.speed,0);
    assert.ok(game.elapsed>=before+5);
    assert.equal(game.recoveryCount,1);
    assert.equal(game.recover(),false,'recovery cooldown must prevent farming');
  });

  test('restart resets speed, yaw grip and stale timing',()=>{
    const game=new RaceEngine();
    game.phase='racing';
    game.speed=30;
    for(let i=0;i<10;i++)game.update(1/60,right);
    game.restart();
    assert.equal(game.phase,'countdown');
    assert.equal(game.speed,0);
    assert.equal(game.elapsed,0);
    assert.equal(game.lap,1);
    assert.equal(game.checkpoints,0);
    assert.ok(Math.abs(angleDifference(game.heading,game.motionHeading))<1e-6);
  });
} finally {
  await rm(home,{recursive:true,force:true});
}
