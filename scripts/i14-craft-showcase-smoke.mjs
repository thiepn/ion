/**
 * ION I14 — actual source material, camera, licensed-asset and garage checks.
 * This is executable original Three.js code and source qualification, NOT
 * rendered Chromium, GPU frame-time or physically visible model approval.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Color,MeshStandardMaterial,PerspectiveCamera,Texture,Vector3} from 'three';

const tmp=await mkdtemp(path.join(process.cwd(),'.i14-qualification-'));
const pass=(label,info='')=>console.log('PASS I14 '+label+(info?' — '+info:''));
try{
  for(const [entry,out] of [
    ['src/visuals/craftPaint.ts','paint.mjs'],
    ['src/visuals/ChaseRig.ts','camera.mjs'],
    ['src/simulation.ts','engine.mjs'],
  ])await build({entryPoints:[entry],outfile:path.join(tmp,out),
    platform:'node',format:'esm',target:'node22',bundle:true,
    packages:'external',logLevel:'error'});

  const {repaintLicensedMaterial}=await import(pathToFileURL(path.join(tmp,'paint.mjs')).href);
  const {ChaseRig}=await import(pathToFileURL(path.join(tmp,'camera.mjs')).href);
  const {RaceEngine}=await import(pathToFileURL(path.join(tmp,'engine.mjs')).href);

  const gray=new MeshStandardMaterial({color:'#d5d5d5',roughness:.48,metalness:.35});
  const old=gray.color.clone();
  const target=new Color('#f08958');
  const painted=repaintLicensedMaterial(gray,'#f08958');
  assert.notEqual(painted,gray,'always clone shared Kenney material');
  assert.equal(gray.color.getHexString(),old.getHexString(),
    'pinned original GLB material must not be mutated');
  const rgbDistance=(a,b)=>Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b);
  assert.ok(rgbDistance(painted.color,target)<rgbDistance(gray.color,target),
    'actual visible light paint must move toward selected swatch');
  assert.equal(painted.metalness,gray.metalness);
  assert.equal(painted.roughness,gray.roughness);
  pass('painted source GLB clone with original PBR properties',painted.color.getHexString());

  const dark=new MeshStandardMaterial({color:'#050708'});
  const paintedDark=repaintLicensedMaterial(dark,'#b8d66c');
  assert.equal(paintedDark.color.getHexString(),dark.color.getHexString(),
    'dark mechanical cavities must retain source detail');
  const glass=new MeshStandardMaterial({color:'#e2f0ed',transparent:true,opacity:.7});
  const paintedGlass=repaintLicensedMaterial(glass,'#f08958');
  assert.equal(paintedGlass.color.getHexString(),glass.color.getHexString(),
    'licensed window/translucent surfaces must retain original identity');
  const textured=new MeshStandardMaterial({color:'#cccccc',map:new Texture()});
  const paintedTextured=repaintLicensedMaterial(textured,'#f08958');
  assert.equal(paintedTextured.color.getHexString(),textured.color.getHexString(),
    'licensed authored texture must not be replaced or repainted');
  pass('dark, transparent and textured Kenney source surfaces preserved');

  const game=new RaceEngine();
  game.menu();
  const positions=[];
  for(const view of ['THREE_QUARTER','SIDE','REAR']){
    const rig=new ChaseRig(),camera=new PerspectiveCamera(65,16/9,.12,1400);
    rig.update(camera,game,1/60,'CHASE',true,4,true,view);
    camera.updateMatrixWorld();
    const projected=game.position.clone().project(camera);
    assert.ok(projected.x>0.04 && projected.x<.85,
      'wide garage vehicle should be framed to the right of menu, '+view);
    assert.ok(Math.abs(projected.y)<.7,'garage craft must stay vertically visible');
    positions.push(camera.position.clone());
  }
  for(let i=0;i<positions.length;i++)
    for(let j=i+1;j<positions.length;j++)
      assert.ok(positions[i].distanceTo(positions[j])>3.2,
        'each original garage view must give a meaningfully distinct angle');
  const stillCamera=new PerspectiveCamera(65,16/9,.12,1400);
  new ChaseRig().update(stillCamera,game,1/60,'CHASE',true,500,true,'SIDE');
  assert.ok(stillCamera.position.distanceTo(positions[1])<.0001,
    'reduced-motion showroom view should not spin with clock time');
  pass('original ChaseRig stable right-framed 3-angle garage camera');

  const manifest=JSON.parse(readFileSync('scripts/cc0-space-kit.json','utf8'));
  assert.equal(manifest.original_creator,'Kenney');
  assert.equal(manifest.license,'CC0-1.0');
  assert.match(manifest.original_pack,/kenney.nl\/assets\/space-kit/);
  assert.match(manifest.source_commit,/^[0-9a-f]{40}$/);
  assert.equal(manifest.assets.length,14);
  assert.equal(new Set(manifest.assets.map(a=>a.id)).size,14);
  for(const asset of manifest.assets){
    assert.match(asset.git_blob_sha1,/^[0-9a-f]{40}$/);
    assert.ok(asset.bytes>2000);
  }
  assert.ok(manifest.assets.some(a=>a.id==='craft-racer'));
  assert.ok(readFileSync('scripts/sync-cc0-assets.mjs','utf8').includes('Asset integrity mismatch'));
  pass('all fourteen immutable Kenney CC0 manifest identities preserved');

  const app=readFileSync('src/App.tsx','utf8');
  const world=readFileSync('src/World.tsx','utf8');
  const stage=readFileSync('src/RaceStage.tsx','utf8');
  const craft=readFileSync('src/visuals/Craft.tsx','utf8');
  const kenney=readFileSync('src/visuals/KenneyAssets.tsx','utf8');
  const css=readFileSync('src/styles.css','utf8');
  assert.ok(app.includes('aria-label="Live 3D craft inspection angle"'));
  assert.ok(app.includes("['THREE_QUARTER','THREE-QUARTER']") ||
    app.includes("['THREE_QUARTER','THREE-QUARTER']".replaceAll("'",'"')));
  assert.ok(app.includes('aria-pressed={showcaseView===view}'));
  assert.ok(app.includes('showcaseView={showcaseView}'));
  assert.ok(stage.includes('showcaseView:'));
  assert.ok(world.includes('cameraRig.update(camera,game,dt,cameraMode,showcase,clock.elapsedTime,prefersReducedMotion,showcaseView)'));
  assert.ok(world.includes("showcase&&game.phase==='menu'"));
  assert.ok(craft.includes('color={paint}'));
  assert.ok(kenney.includes("repaintLicensedMaterial(m,tint)"));
  assert.ok(kenney.includes('asset="craft-racer" width={7.7} tint={paint}'));
  assert.ok(kenney.includes('clearcoatRoughness={.23}'));
  assert.ok(css.includes('.garage-view-buttons button:focus-visible'));
  assert.ok(css.includes('min-height:44px'));
  assert.ok(css.includes('(max-width:680px) and (orientation:portrait)'));
  pass('single native React/Three renderer, original model/palette and accessible 3-view garage');

  [gray,painted,dark,paintedDark,glass,paintedGlass,textured,paintedTextured]
    .forEach(material=>material.dispose());
}finally{
  await rm(tmp,{recursive:true,force:true});
}
