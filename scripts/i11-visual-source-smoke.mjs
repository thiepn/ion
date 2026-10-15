/**
 * ION I11 — inspect the actual committed CSS and original accessible React
 * controls without a simulated screenshot or fabricated browser playthrough.
 * This is source-level qualification; Chromium rendering remains separate.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const foundation=readFileSync('src/styles.css','utf8');
const responsive=readFileSync('src/v17.css','utf8');
const app=readFileSync('src/App.tsx','utf8');
const entry=readFileSync('src/main.tsx','utf8');
const markup=readFileSync('index.html','utf8');
const pass=(name,details='')=>
  console.log('PASS I11 '+name+(details?' — '+details:''));
const checkBraces=(name,source)=>{
  let comment=false,quote=null,esc=false,depth=0;
  for(let i=0;i<source.length;i++){
    const a=source[i],b=source[i+1];
    if(comment){if(a==='*'&&b==='/'){comment=false;i++;}continue;}
    if(quote){if(a===quote&&!esc)quote=null;esc=a==='\\'&&!esc;continue;}
    if(a==='/'&&b==='*'){comment=true;i++;continue;}
    if(a==='"'||a==="'"){quote=a;continue;}
    if(a==='{')depth++;
    if(a==='}'){depth--;assert.ok(depth>=0,name+' closes extra brace');}
  }
  assert.equal(depth,0,name+' unbalanced CSS declarations');
  assert.equal(quote,null,name+' unterminated quote');
  assert.equal(comment,false,name+' unterminated comment');
};
checkBraces('styles.css',foundation);
checkBraces('v17.css',responsive);
pass('both original stylesheets parse-balanced');

assert.equal((foundation.match(/:root\s*\{/g)||[]).length,1,
  'single canonical root expected');
assert.equal((responsive.match(/:root\s*\{/g)||[]).length,0,
  'touch stylesheet must not redefine global design root');
const foundations=[
  '--ion-ink','--ion-muted','--ion-cyan','--ion-coral',
  '--ion-bg','--ion-panel','--ion-border','--ion-focus',
  '--ion-display','--ion-body','--ion-data'
];
for(const token of foundations)assert.ok(foundation.includes(token+':'),token);
assert.ok(foundation.includes('/* I11 visual foundation.'));
assert.ok(!responsive.includes('/* Consolidated ION UI foundation'));
assert.ok(entry.includes("import './styles.css'")&&
  entry.includes("import './v17.css'"));
pass('one root + canonical desktop foundation and isolated touch styles',
  foundations.length+' typed tokens');

const getColor=(name)=>{
  const m=foundation.match(new RegExp(name+':(#[0-9a-fA-F]{6})'));
  assert.ok(m,name+' color must be author-defined');
  return m[1];
};
const rgb=(hex)=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255);
const luminance=(hex)=>{
  const linear=rgb(hex).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
};
const contrast=(a,b)=>{
  const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);
  return (values[0]+.05)/(values[1]+.05);
};
for(const role of ['--ion-ink','--ion-muted','--ion-cyan','--ion-coral']){
  const ratio=contrast(getColor(role),getColor('--ion-bg'));
  assert.ok(ratio>=4.5,
    role+' must meet 4.5:1 WCAG contrast on solid cockpit background, got '+ratio);
  pass('design-token contrast '+role,ratio.toFixed(2)+':1 on cockpit');
}
assert.ok(contrast(getColor('--ion-bg'),getColor('--ion-cyan'))>4.5);
pass('accent primary contrast');

assert.ok(/\.touch-bar\s*\{\s*display:none;\s*\}/.test(responsive.split('@media')[0]),
  'desktop must hide live race thumb buttons');
assert.ok(responsive.includes('(pointer:coarse), (max-width:680px)'));
assert.ok(responsive.includes('env(safe-area-inset-bottom)'));
assert.ok(responsive.includes('env(safe-area-inset-top)'));
assert.ok(responsive.includes('min-height:44px'));
assert.ok(responsive.includes('.touch-zone .touch-control.is-held'));
assert.ok(responsive.includes('min-height:44px;font-size:10px'));
pass('hidden desktop controls, 44px mobile actions and safe-area coverage');

assert.ok(foundation.includes('max-height:calc(100dvh - 138px)'));
assert.ok(foundation.includes('overflow-y:auto'));
assert.ok(foundation.includes('scrollbar-width:thin'));
assert.ok(foundation.includes('.results>.lap-result {flex-direction:column'));
assert.ok(foundation.includes('font-variant-numeric:tabular-nums'));
assert.ok(foundation.includes('outline:3px solid var(--ion-focus)'));
assert.ok(foundation.includes('@media (prefers-reduced-motion:reduce)'));
pass('scroll-safe menus/results, numeric alignment, keyboard focus and reduced motion');

assert.ok(markup.includes('viewport-fit=cover'));
assert.ok(app.includes('role="meter"')&&app.includes('aria-valuenow={amount}'));
assert.ok(app.includes('aria-modal="true"')&&app.includes('aria-describedby="help-description"'));
assert.ok(app.includes('document.addEventListener(\'keydown\',onKeys,true)'));
assert.ok(app.includes('if(previous?.isConnected)previous.focus'));
assert.ok(app.includes('event.key===\'Escape\''));
assert.ok(app.includes('event.shiftKey'));
pass('existing controls have meter names and focus-managed keyboard manual');
