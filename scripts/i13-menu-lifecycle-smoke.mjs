/**
 * ION I13 — test original menu/race lifecycle and genuine React menu source.
 * This is Node-executed engine, SSR and source contract qualification, NOT
 * interactive Chromium, mobile/touch playability, or visual screenshot PASS.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const store=new Map([['ion-i06-nightshift-best-lap','112.5']]);
globalThis.localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>store.set(k,String(v)),
};
const dir=await mkdtemp(path.join(process.cwd(),'.i13-qualification-'));
const pass=(name,detail='')=>console.log('PASS I13 '+name+(detail?' — '+detail:''));
try{
  for(const [entry,out] of [
    ['src/simulation.ts','engine.mjs'],
    ['src/track.ts','track.mjs'],
    ['src/App.tsx','app.mjs']
  ])await build({entryPoints:[entry],outfile:path.join(dir,out),
    bundle:true,platform:'node',format:'esm',target:'node22',
    packages:'external',jsx:'automatic',logLevel:'error'});
  const {RaceEngine,InputController}=await import(pathToFileURL(path.join(dir,'engine.mjs')).href);
  const {trackAt,TRACK_LENGTH}=await import(pathToFileURL(path.join(dir,'track.mjs')).href);
  const {App}=await import(pathToFileURL(path.join(dir,'app.mjs')).href);

  const appHtml=renderToStaticMarkup(React.createElement(App));
  assert.ok(appHtml.includes('START TIME TRIAL'));
  assert.ok(appHtml.includes('CUSTOMIZE HOVERCRAFT'));
  assert.match(appHtml,/CONTROLS (?:&amp;|&) HOW TO PLAY/,
    'actual React HTML should expose the pilot manual navigation');
  assert.ok(appHtml.includes('01 / NIGHTSHIFT I06'));
  assert.ok(appHtml.includes('01:52.500'),
    'menu best lap must reflect actual saved original record');
  pass('original React initial menu renders with actual source best record');

  const input=new InputController();
  assert.equal(input.getStickDeadzone(),.15);
  input.setStickDeadzone(.20);
  assert.equal(store.get('ion-i04-stick-deadzone'),'.2');
  assert.equal(new InputController().getStickDeadzone(),.20);
  input.press('ArrowUp',19);
  input.press('ArrowRight',20);
  assert.equal(input.get().throttle,1);
  assert.equal(input.get().steer,1);
  input.clear();
  assert.equal(input.get().throttle,0);
  assert.equal(input.get().steer,0);
  pass('original controller preference persistence and touch-input clear');

  const game=new RaceEngine();
  game.start();
  for(let i=0;i<300&&game.phase==='countdown';i++)
    game.update(1/60,{throttle:0,brake:0,steer:0,boost:false});
  assert.equal(game.phase,'racing');
  const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let steps=0;
  while(game.checkpoints===0&&steps++<60*90&&game.phase==='racing'){
    const ahead=trackAt((game.previousT+Math.max(19,Math.min(30,17+game.speed*.5))/TRACK_LENGTH)%1).position;
    const yaw=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    game.update(1/60,{
      throttle:game.speed<16.5?.62:0,
      brake:game.speed>18.5?.22:0,
      steer:clamp(-wrap(yaw-game.heading)*2.4,-1,1),
      boost:false,
    });
  }
  assert.equal(game.checkpoints,1,'must earn physical S1 before lifecycle test');
  const before=game.snapshot();
  game.pause();
  assert.equal(game.phase,'paused');
  assert.equal(game.snapshot().checkpoints,undefined,
    'only public original snapshot fields may be inspected');
  assert.equal(game.snapshot().nextGate,2);
  assert.equal(game.snapshot().elapsed,before.elapsed);
  assert.equal(game.snapshot().lapTime,before.lapTime);
  assert.equal(game.snapshot().bestLap,112.5);
  pass('original pause preserves earned S1, active lap and record',
    'S1 physically earned in '+steps+' engine steps');

  assert.equal(game.recover(),true);
  assert.equal(game.snapshot().nextGate,2);
  assert.equal(game.snapshot().elapsed,before.elapsed+5);
  assert.equal(game.snapshot().recoveryCount,1);
  assert.equal(game.snapshot().currentLapClean,false);
  assert.equal(game.phase,'paused','recovery must not secretly resume');
  pass('legal paused checkpoint recovery retains authoritative penalty');

  game.pause();
  assert.equal(game.phase,'countdown','resume must use native safe re-countdown');
  const resumed=game.snapshot();
  assert.equal(resumed.nextGate,2);
  assert.equal(resumed.recoveryCount,1);
  game.restart();
  assert.equal(game.phase,'countdown');
  assert.equal(game.snapshot().nextGate,1);
  assert.equal(game.snapshot().recoveryCount,0);
  assert.equal(game.snapshot().bestLap,112.5);
  game.menu();
  assert.equal(game.phase,'menu');
  assert.equal(game.snapshot().bestLap,112.5);
  pass('resume, restart and menu leave actual saved PB untouched');

  const app=readFileSync('src/App.tsx','utf8');
  const css=readFileSync('src/styles.css','utf8');
  const required=[
    "requestRaceAction('restart')","requestRaceAction('menu')",
    "setPendingRaceAction(action)","if(game.phase==='racing'||game.phase==='countdown')game.pause()",
    "pendingRaceAction==='restart'?'CONFIRM RESTART':'CONFIRM RETURN TO MENU'",
    'KEEP PAUSED RUN','ref={confirmButtonRef}','ref={resumeButtonRef}',
    "setTouchResetSerial(n=>n+1)", "if(help)return",
    'ion-garage-stick-deadzone','ion-pause-stick-deadzone',
    'ion-manual-stick-deadzone','ELAPSED BEFORE FAILURE',
    'LAST COMPLETED GATE','LAST ATTEMPT'
  ];
  for(const fragment of required)
    assert.ok(app.includes(fragment),'missing original UI behavior '+fragment);
  assert.ok(!app.includes('onClick={start}>RESTART FROM GRID'),
    'active pause-screen restart must not discard race immediately');
  assert.ok(!app.includes('onClick={mainMenu}>RETURN TO MENU'),
    'active pause-screen menu must not discard race immediately');
  assert.ok(css.includes('.race-exit-confirm'));
  assert.ok(css.includes('min-height:44px'));
  assert.ok(css.includes('(orientation:landscape) and (max-height:540px)'));
  pass('original app confirmation, accessible focus, settings and failed-run source contracts');
}finally{
  await rm(dir,{recursive:true,force:true});
  delete globalThis.localStorage;
}
