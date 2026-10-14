// Download only selected author-licensed Kenney Space Kit GLBs at build/dev time.
// Fail closed on an unavailable or changed upstream, rather than shipping broken 3D links.
// Git's SHA1 is over "blob <size>\\0<bytes>", not the raw file bytes.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(repoRoot,'scripts/cc0-space-kit.json'),'utf8'));
const output = join(repoRoot,'public/assets/kenney');
const rawBase = 'https://raw.githubusercontent.com/Hidencod/tge-assets/' + manifest.source_commit + '/';
await mkdir(output,{recursive:true});

const check = (bytes, expected) => {
  const digest = createHash('sha1').update('blob ' + bytes.length).update(Buffer.from([0])).update(bytes).digest('hex');
  if (digest !== expected) throw new Error('Asset integrity mismatch: got ' + digest + ', expected ' + expected);
};

async function fetchOne(asset) {
  const target = join(output, asset.id + '.glb');
  try {
    const existing = await readFile(target);
    check(existing, asset.git_blob_sha1);
    if(existing.length===asset.bytes)return;
  } catch(error){
    if(error.code!=='ENOENT' && !String(error.message).includes('Asset integrity mismatch')) throw error;
  }
  const uri = rawBase + asset.path;
  let lastError;
  for(let attempt=1;attempt<=3;attempt++){
    try {
      const response=await fetch(uri,{signal:AbortSignal.timeout(25000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length!==asset.bytes)throw new Error('Size mismatch for '+asset.id);
      check(bytes, asset.git_blob_sha1);
      const temp=target+'.partial';
      await writeFile(temp,bytes);
      await rename(temp,target);
      return;
    }catch(error){lastError=error;await rm(target+'.partial',{force:true});}
  }
  throw new Error('Could not acquire CC0 asset '+asset.id+': '+lastError);
}

for(let i=0;i<manifest.assets.length;i+=4) {
  await Promise.all(manifest.assets.slice(i,i+4).map(fetchOne));
}
console.log('ION V4: validated '+manifest.assets.length+' CC0 Kenney 3D models against immutable Git blob hashes.');
