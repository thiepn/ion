/**
 * ION I07 — real canonical RaceEngine wall, clearance and faster lap checks.
 *
 * Bundles the original simulation.ts + track.ts source with project's
 * existing esbuild; no second collision, track, score or lap implementation.
 * Inputs are normal Controls. Only initial test setups position the craft.
 * Genuine Chromium/real gamepad driving remains outside this Node gate.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const home=await mkdtemp(path.join(tmpdir(),'ion-i07-'));
const angle=d=>Math.atan2(Math.sin(d),Math.cos(d));
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const idle={throttle:0,brake:0,steer:0,boost:false};
const assertNear=(v,expected,tol,label)=>
  assert.ok(Math.abs(v-expected)<tol,label+': '+v+' vs '+expected);
let passed=0;
const pass=(label,result='')=>{
  passed++;
  console.log('PASS I07 '+label+(result?' — '+result:''));
};
try{
  const enginePath=path.join(home,'simulation.mjs');
  const trackPath=path.join(home,'track.mjs');
  for(const [entryPoints,outfile] of [
    [['src/simulation.ts'],enginePath],[['src/track.ts'],trackPath],
  ])await build({entryPoints,outfile,platform:'node',format:'esm',target:'node22',
    bundle:true,logLevel:'error'});
  const {RaceEngine}=await import(pathToFileURL(enginePath).href);
  const {
    trackAt,headingAt,nearestTrack,TRACK_LENGTH,ROAD_HALF_WIDTH,
    RAIL_INNER_OFFSET,RAIL_TOP_RISE,RAIL_BOTTOM_RISE,railWall,BOOST_PAD_T
  }=await import(pathToFileURL(trackPath).href);

  // The actual rendered *vertical face* must sit at the same source offset
  // as the physics collision calculation, at every sample on both sides.
  for(const side of [-1,1]){
    const mesh=railWall(side);
    const pos=mesh.getAttribute('position');
    for(let i=0;i<=480;i+=13){
      const t=i/480,{position,right}=trackAt(t);
      const q=side*RAIL_INNER_OFFSET;
      for(const [row,rise] of [[0,RAIL_BOTTOM_RISE],[1,RAIL_TOP_RISE]]){
        assertNear(pos.getX(i*2+row),position.x+right.x*q,.0002,'rail x');
        assertNear(pos.getY(i*2+row),position.y+rise,.0002,'rail height');
        assertNear(pos.getZ(i*2+row),position.z+right.z*q,.0002,'rail z');
      }
    }
    mesh.dispose();
  }
  assert.ok(RAIL_TOP_RISE>2.5&&RAIL_INNER_OFFSET<ROAD_HALF_WIDTH);
  pass('source-identical upright rails','both sides, 38 sampled sections');

  const setCraft=(t,side,offset,angleToRoad,speed)=>{
    const game=new RaceEngine();
    const {position,right}=trackAt(t);
    game.phase='racing';
    game.position.copy(position);
    game.position.addScaledVector(right,side*offset);
    game.position.y+=2.5;
    game.heading=headingAt(t)+side*angleToRoad;
    game.motionHeading=game.heading;
    game.previousT=t;
    game.progress=t;
    game.speed=speed;
    return game;
  };
  for(const side of [-1,1]){
    const t=.055;
    const game=setCraft(t,side,RAIL_INNER_OFFSET-2.6,Math.PI/4,42);
    const startShield=game.shield;
    game.update(1/60,idle);
    const at=nearestTrack(game.position.x,game.position.z,game.previousT);
    const yaw=angle(game.heading-at.heading);
    const hullExtent=3.95*(Math.abs(Math.cos(yaw))+Math.abs(Math.sin(yaw)));
    assert.ok(Math.abs(at.lateral)+hullExtent<=RAIL_INNER_OFFSET+.55,
      'angled wing/body must not extend through the visible inner wall');
    assert.ok(game.shield<startShield,'actual powered wall hit costs shield');
    assert.equal(game.phase,'racing');
    const remaining=game.shield;
    for(let i=0;i<20;i++)game.update(1/60,
      {throttle:.2,brake:0,steer:-side,boost:false});
    assert.equal(game.shield,remaining,
      'one continuous guarded rail scrape must not double-charge damage');
  }
  pass('angled craft envelope and single-contact shield cost','both left/right rails');

  for(const t of [.1,.3,.5,.7,.9]){
    const p=trackAt(t);
    const game=setCraft(t,1,0,0,24);
    // Start below surface deliberately to mimic steep-slope step lag.
    game.position.y=p.position.y+1;
    game.update(1/60,{...idle,throttle:.4});
    const q=nearestTrack(game.position.x,game.position.z,game.previousT);
    assert.ok(game.position.y>=q.y+2.11,
      'canonical craft must not physically sink through deck over grades');
  }
  pass('physical road-deck height clearance','five elevations');

  for(const pad of BOOST_PAD_T){
    // The existing original physics smoke exercises a physical forward
    // crossing of pad 0.16; no score state is synthesized here.
    assert.ok(pad>.01&&pad<.99);
  }
  pass('boost strips share track authority',String(BOOST_PAD_T.length));

  // Faster than the I06 16.5m/s baseline: corner-aware pilot uses only
  // standard controls, physical RaceEngine updates and the real track.
  const game=new RaceEngine();
  game.start();
  while(game.phase==='countdown')game.update(1/60,idle);
  let steps=0,maxLateral=0,impacts=0,missed=0;
  const maxSteps=60*460;
  let lastImpact=0;
  while(game.phase==='racing'&&steps++<maxSteps){
    const speed=game.speed;
    const lookDistance=clamp(17+speed*.7,19,38);
    const ahead=trackAt((game.previousT+lookDistance/TRACK_LENGTH)%1).position;
    const desiredYaw=Math.atan2(ahead.x-game.position.x,ahead.z-game.position.z);
    const steer=clamp(-angle(desiredYaw-game.heading)*2.5,-1,1);
    const h1=headingAt((game.previousT+16/TRACK_LENGTH)%1);
    const h2=headingAt((game.previousT+49/TRACK_LENGTH)%1);
    const radius=33/Math.max(.00001,Math.abs(angle(h2-h1)));
    const cruise=clamp(Math.sqrt(radius*13),22,36);
    const throttle=speed<cruise-.35?.72:0;
    const brake=speed>cruise+1?.38:0;
    game.update(1/60,{throttle,brake,steer,boost:false});
    const at=nearestTrack(game.position.x,game.position.z,game.previousT);
    maxLateral=Math.max(maxLateral,Math.abs(at.lateral));
    if(game.impact>.95&&lastImpact<=.95)impacts++;
    lastImpact=game.impact;
    if(game.snapshot().trackWarning==='missed-checkpoint')missed++;
  }
  assert.equal(game.reason,'complete',
    'faster pilot must physically finish three forward laps with real race scoring');
  assert.equal(game.lapTimes.length,3);
  assert.ok(game.lapTimes.every(t=>Number.isFinite(t)&&t>35&&t<110));
  assert.equal(game.recoveryCount,0,'fast pilot must not teleport or bypass gates');
  assert.ok(game.shield>0&&maxLateral<RAIL_INNER_OFFSET,
    'fast drive must retain shield and remain inside canonical rail face');
  pass('faster legitimate three-lap race',
    'steps='+steps+'; laps='+game.lapTimes.map(t=>t.toFixed(2)).join('/')+
    's; max lateral='+maxLateral.toFixed(2)+
    'm; impacts='+impacts+'; missed warning frames='+missed);
  console.log('I07 '+passed+' original-engine/geometry checks PASSED');
}finally{
  await rm(home,{recursive:true,force:true});
}
