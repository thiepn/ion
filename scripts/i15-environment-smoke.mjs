/**
 * ION I15 — original Nightshift visual-geometry and asset qualification.
 * Native track.ts and read-only sectionPalette.ts, bundled with installed
 * Three.js; the original scoring/collision engine is neither rewritten nor
 * mocked. This does NOT assert rendered Chromium appearance or actual FPS.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Color} from 'three';

const dir=await mkdtemp(path.join(process.cwd(),'.i15-environment-'));
const pass=(label,detail='')=>console.log('PASS I15 '+label+(detail?' — '+detail:''));
try{
  const out=path.join(dir,'environment.mjs');
  await build({entryPoints:['src/visuals/sectionPalette.ts'],outfile:out,
    bundle:true,format:'esm',platform:'node',target:'node22',
    packages:'external',logLevel:'error'});
  const {
    sectionVisualAt,SECTION_PALETTE,boostApproachT,
  }=await import(pathToFileURL(out).href);
  const trackOut=path.join(dir,'track.mjs');
  await build({entryPoints:['src/track.ts'],outfile:trackOut,
    bundle:true,format:'esm',platform:'node',target:'node22',
    packages:'external',logLevel:'error'});
  const {
    trackAt,CIRCUIT_SECTIONS,BOOST_PAD_T,TRACK_LENGTH,
    ROAD_HALF_WIDTH,RAIL_INNER_OFFSET,RAIL_TOP_RISE,
  }=await import(pathToFileURL(trackOut).href);

  assert.equal(CIRCUIT_SECTIONS.length,5);
  assert.deepEqual(CIRCUIT_SECTIONS.map(s=>s.name),
    ['LAUNCH','SWITCHBACK','NORTH CREST','DESCENT','HOMECOMING']);
  const unique=new Set();
  for(const section of CIRCUIT_SECTIONS){
    const visual=sectionVisualAt(section.t);
    assert.equal(visual.name,section.name);
    assert.equal(visual.t,section.t);
    for(const part of ['edge','accent','structure','beacon']){
      assert.match(visual[part],/^#[a-fA-F0-9]{6}$/);
      const color=new Color(visual[part]);
      assert.ok(color.r>=0&&color.g>=0&&color.b>=0);
    }
    unique.add(visual.accent);
    assert.ok(SECTION_PALETTE[section.name]);
  }
  assert.equal(unique.size,5);
  assert.equal(sectionVisualAt(0).name,'LAUNCH');
  assert.equal(sectionVisualAt(1.0000001).name,'LAUNCH');
  pass('five original sections retain unique valid industrial illumination palettes');

  const transitions=[];
  let previous=sectionVisualAt(0).name;
  for(let i=1;i<=2000;i++){
    const t=i/2000;
    const visual=sectionVisualAt(t);
    assert.ok(visual.name);
    if(visual.name!==previous){
      transitions.push(visual.name);previous=visual.name;
    }
    assert.equal(sectionVisualAt(t+1).name,visual.name,
      'same physical closed course at wrapped fractions');
  }
  assert.deepEqual(transitions,
    ['SWITCHBACK','NORTH CREST','DESCENT','HOMECOMING','LAUNCH']);
  pass('source spline section identities transition once in proper forward order',
    transitions.join(' → '));

  assert.equal(BOOST_PAD_T.length,3);
  let minPadClearance=Infinity;
  for(const t of BOOST_PAD_T){
    for(const distance of [48,30,14]){
      const start=boostApproachT(t,distance);
      assert.ok(start>=0&&start<1);
      const forward=((t-start+1)%1)*TRACK_LENGTH;
      assert.ok(Math.abs(forward-distance)<.001,
        'pad approach cue must lie physically '+distance+'m BEFORE canonical boost');
      const point=trackAt(start);
      const near=trackAt(start-.0003);
      assert.ok(point.position.distanceTo(near.position)<5,
        'advance cue must use continuous canonical spline');
      assert.ok(Number.isFinite(point.position.y));
    }
    const center=trackAt(t);
    assert.ok(Number.isFinite(center.position.y));
    // Three physical rendering lanes, +/-7 m, half-width 1.1 m. The
    // canonical rail physical inner face must remain outside every strip.
    for(const lane of [-7,0,7]){
      const clearance=RAIL_INNER_OFFSET-Math.abs(lane)-1.1;
      minPadClearance=Math.min(minPadClearance,clearance);
      assert.ok(clearance>3.5,'original collision face has generous open lane clearance');
    }
  }
  assert.ok(ROAD_HALF_WIDTH+1.35-.30>RAIL_INNER_OFFSET,
    'pad outboard light support stays outside original collision wall');
  assert.ok(RAIL_TOP_RISE>3);
  pass('real three boost-pad approaches at 48/30/14m, safe lanes and external marker supports',
    'minimum lateral clearance '+minPadClearance.toFixed(2)+'m');

  const kenney=readFileSync('src/visuals/KenneyAssets.tsx','utf8');
  const skyline=readFileSync('src/visuals/IndustrialHorizon.tsx','utf8');
  const district=readFileSync('src/visuals/CircuitDressing.tsx','utf8');
  const guides=readFileSync('src/visuals/TrackInfrastructure.tsx','utf8');
  const world=readFileSync('src/World.tsx','utf8');
  const road=readFileSync('src/visuals/Rendering.tsx','utf8');
  assert.ok(district.includes('sectionVisualAt(t)'));
  assert.ok(district.includes('panelTexture(name,hint,visual.accent)'));
  assert.ok(district.includes("quality==='QUALITY' && ("));
  assert.ok(district.includes('section={section} quality={quality}'));
  assert.ok(guides.includes('stripColors.push(section.edge)'));
  assert.ok(guides.includes('directionalColors.push(section.accent)'));
  assert.ok(guides.includes('lampColors.push(section.edge)'));
  assert.ok(guides.includes('mesh.current!.setColorAt(i,new Color(colors[i]))'));
  assert.ok(world.includes('BOOST_PAD_T.map(t=><BoostPadLighting'));
  assert.ok(world.includes('boostApproachT(t,meters)'));
  assert.ok(world.includes('color="#4e95a5"'));
  assert.ok(road.includes('original-service-deck joints'));
  pass('single existing renderer, correctly tinted instanced lights, honest native bridge signs and road materials');

  assert.ok(skyline.includes('CIRCUIT_SECTIONS.map((section,i)=>'));
  assert.ok(skyline.includes('sectionVisualAt(section.t).beacon'));
  assert.ok(skyline.includes("quality==='QUALITY'?54:20"));
  for(const section of CIRCUIT_SECTIONS){
    const f=trackAt(section.t);
    const x=f.position.x+f.right.x*(ROAD_HALF_WIDTH+125);
    const z=f.position.z+f.right.z*(ROAD_HALF_WIDTH+125);
    assert.ok(Math.hypot(x-f.position.x,z-f.position.z)>ROAD_HALF_WIDTH+100,
      'skyline identity cannot intrude into canonical guardrail');
  }
  pass('five skyline identities outside circuit rails, bounded instancing for both presets');

  assert.ok(kenney.includes('heroIndices=[0,6,11,15,20]'));
  assert.ok(kenney.includes('quality===\'QUALITY\'||heroIndices.some'));
  for(const [t,name] of [
    [.04,'LAUNCH'],[.29,'SWITCHBACK'],[.525,'NORTH CREST'],
    [.715,'DESCENT'],[.95,'HOMECOMING'],
  ])assert.equal(sectionVisualAt(t).name,name);
  assert.ok(kenney.includes('<KenneyModel asset={item.asset} width={item.width}'));
  assert.ok(kenney.includes('visual.structure'));
  assert.ok(kenney.includes('visual.beacon'));
  pass('both quality modes preserve genuine Kenney landmarks spanning five sections');

  const manifest=JSON.parse(readFileSync('scripts/cc0-space-kit.json','utf8'));
  assert.equal(manifest.license,'CC0-1.0');
  assert.equal(manifest.assets.length,14);
  assert.equal(manifest.source_commit,'2c8950b716e6765930b2b51409c59adf3d66fd5c');
  assert.equal(new Set(manifest.assets.map(a=>a.id)).size,14);
  assert.ok(manifest.assets.every(asset=>
    /^[0-9a-f]{40}$/.test(asset.git_blob_sha1)&&asset.bytes>2000));
  pass('unchanged 14 verified CC0 original assets and immutable source revision');
}finally{
  await rm(dir,{recursive:true,force:true});
}
