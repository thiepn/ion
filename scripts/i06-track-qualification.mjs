/**
 * ION I06 — execute geometry checks against the authored, actual Three.js
 * CatmullRomCurve3, trackAt and nearestTrack (not hand-recreated geometry).
 *
 * A source geometry qualification is NOT an actual three-lap Chromium drive.
 * No checkpoint, lap or score state is fabricated in this script.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const home=await mkdtemp(path.join(tmpdir(),'ion-i06-'));
const outfile=path.join(home,'track.mjs');
const pass=(label,detail)=>console.log('PASS '+label+(detail?' — '+detail:''));
const wrap=t=>(t%1+1)%1;
const deltaAngle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const distance2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const orient=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const intersect=(a,b,c,d)=>{
  const e=.00001;
  const x1=orient(a,b,c),x2=orient(a,b,d);
  const x3=orient(c,d,a),x4=orient(c,d,b);
  return x1*x2<-e&&x3*x4<-e;
};
try {
  await build({
    entryPoints:['src/track.ts'],outfile,bundle:true,platform:'node',
    format:'esm',target:'node22',logLevel:'error',
  });
  const {
    TRACK_CURVE,TRACK_LENGTH,TRACK_SAMPLES,SEGMENTS,ROAD_HALF_WIDTH,
    BOOST_PAD_T,CIRCUIT_SECTIONS,trackAt,nearestTrack,headingAt,
  }=await import(pathToFileURL(outfile).href);

  assert.ok(TRACK_LENGTH>1650&&TRACK_LENGTH<2100,
    'new Nightshift must have a substantial 1.65–2.1 km authored circuit');
  assert.equal(TRACK_SAMPLES.length,SEGMENTS+1);
  assert.ok(TRACK_SAMPLES[0].distanceTo(TRACK_SAMPLES[SEGMENTS])<.0001,
    'closed course must seal the finish seam');
  pass('canonical closed Three.js circuit',TRACK_LENGTH.toFixed(1)+'m');

  let crossings=0;
  for(let i=0;i<SEGMENTS;i++){
    for(let j=i+2;j<SEGMENTS;j++){
      if(i===0&&j===SEGMENTS-1)continue;
      if(intersect(TRACK_SAMPLES[i],TRACK_SAMPLES[i+1],
                   TRACK_SAMPLES[j],TRACK_SAMPLES[j+1]))crossings++;
    }
  }
  assert.equal(crossings,0,'racing deck must not self-intersect in plan');
  pass('no intersecting road arms',String(crossings));

  let closestNonlocal=Infinity,maxGrade=0;
  for(let i=0;i<SEGMENTS;i++){
    const a=TRACK_SAMPLES[i],b=TRACK_SAMPLES[i+1];
    const ds=distance2(a,b);
    assert.ok(ds>.01,'road sample must not collapse');
    maxGrade=Math.max(maxGrade,Math.abs(b.y-a.y)/ds);
    for(let j=i+1;j<SEGMENTS;j++){
      const separation=Math.min(j-i,SEGMENTS-(j-i))/SEGMENTS*TRACK_LENGTH;
      if(separation<90)continue;
      closestNonlocal=Math.min(closestNonlocal,distance2(a,TRACK_SAMPLES[j]));
    }
  }
  assert.ok(closestNonlocal>2*ROAD_HALF_WIDTH+8,
    'distinct arms must leave >=8m of gap between 26m road decks');
  assert.ok(maxGrade<.14,'crest/descents must stay below a 14% sample grade');
  pass('deck separation and gradients',
    'nonlocal minimum '+closestNonlocal.toFixed(1)+'m; max grade '+
    (maxGrade*100).toFixed(1)+'%');

  let minRadius=Infinity;
  const radiusAt=t=>{
    const h=.002;
    const before=trackAt(t-h),current=trackAt(t),after=trackAt(t+h);
    const h1=headingAt(t-h),h2=headingAt(t+h);
    const bend=Math.abs(deltaAngle(h2,h1));
    const distance=distance2(before.position,current.position)+
      distance2(current.position,after.position);
    return bend<.000001?Infinity:distance/bend;
  };
  for(let i=0;i<2048;i++){
    const r=radiusAt((i+.5)/2048);
    minRadius=Math.min(minRadius,r);
  }
  assert.ok(minRadius>22,
    'worst corner must remain negotiable at reduced speed; radius >22m');
  pass('corner radius envelope','sample minimum '+minRadius.toFixed(1)+'m');

  for(let i=0;i<SEGMENTS;i+=9){
    const t=i/SEGMENTS;
    const {position,tangent,right}=trackAt(t);
    assert.ok(Math.abs(right.x*tangent.x+right.z*tangent.z)<.0001,
      'road shoulder direction must be orthogonal');
    for(const side of [-1,0,1]){
      const atX=position.x+right.x*side*7;
      const atZ=position.z+right.z*side*7;
      const nearest=nearestTrack(atX,atZ,t);
      const diff=Math.min(Math.abs(nearest.t-t),
        1-Math.abs(nearest.t-t));
      assert.ok(diff<.012,'hint projection must remain on this road arm');
      assert.ok(Math.abs(nearest.lateral)<=7.4,
        '7m driving offsets must remain inside original physics lane');
    }
  }
  pass('collision-source projection and navigable lane',
    '53 sampled sections, center and +/-7m');

  assert.equal(BOOST_PAD_T.length,3);
  for(const t of BOOST_PAD_T){
    assert.ok(t>0&&t<1);
    const r=radiusAt(t);
    assert.ok(r>75,'pads must sit on readable fast approaches, not hairpins');
    const toGate=Math.min(...[0,.25,.5,.75,1].map(g=>Math.abs(g-t)));
    assert.ok(toGate*TRACK_LENGTH>65,'pads must not obscure physical quarter gates');
  }
  pass('pad placement','3 source-shared high-radius strips, clear of gates');

  assert.equal(CIRCUIT_SECTIONS.length,5);
  assert.equal(new Set(CIRCUIT_SECTIONS.map(s=>s.name)).size,5);
  for(let i=0;i<CIRCUIT_SECTIONS.length;i++){
    const section=CIRCUIT_SECTIONS[i];
    assert.ok(section.t>0&&section.t<1);
    if(i>0)assert.ok(section.t>CIRCUIT_SECTIONS[i-1].t);
    const {position}=trackAt(section.t);
    assert.ok(Number.isFinite(position.x+position.y+position.z));
  }
  pass('sector wayfinding','5 distinct authored sections on actual spline');
} finally {
  await rm(home,{recursive:true,force:true});
}
