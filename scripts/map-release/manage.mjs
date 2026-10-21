import { readFileSync, writeFileSync, realpathSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseCiv5Replay } from '../../src/.vuepress/theme/components/community/replay/replayParser.mjs';
import { getEdition } from '../../src/.vuepress/data/editions.js';
import { prepareRelease } from './prepare.mjs';
import {createClient} from '@supabase/supabase-js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
function privateOutput(path) {
  const target=resolve(path);
  mkdirSync(dirname(target),{recursive:true});
  const actual=resolve(realpathSync(dirname(target)),target.split('/').at(-1));
  if(!relative(root,actual).startsWith('..'))throw new Error('Write private extraction and staging files outside the repository.');
  if(existsSync(actual))throw new Error('Output exists; use a new revision directory.');
  return actual;
}
try {
  const [command,...args]=process.argv.slice(2);
  if(command==='export-community') {
    const [out]=args;if(!out)throw new Error('export-community <private-output.json>');
    const output=privateOutput(out),config=json(resolve(root,'src/shared/publicConfig.json'));
    const db=createClient(config.SUPABASE_URL,config.SUPABASE_ANON_KEY,{auth:{persistSession:false}});
    const checked=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
    const snapshot=checked(await db.from(config.SNAPSHOT_TABLE).select('id,episode_label,payload').eq('map_id',config.MAP_ID).eq('is_published',true).order('episode_at',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle());
    if(!snapshot||!Array.isArray(snapshot.payload))throw new Error('No published community snapshot is available.');
    const rows=new Map(snapshot.payload.map(r=>[r.tile_key,r]));
    for(let offset=0;offset<50000;offset+=1000){const page=checked(await db.from(config.TILE_OVERRIDE_TABLE).select('tile_key,payload').eq('map_id',config.MAP_ID).eq('snapshot_id',snapshot.id).order('tile_key').range(offset,offset+999));
      for(const r of page){const before=rows.get(r.tile_key);rows.set(r.tile_key,{tile_key:r.tile_key,payload:{...before?.payload,...r.payload}});}if(page.length<1000)break;
    }
    // Abort if a new base appeared during export instead of mixing two episodes.
    const latest=checked(await db.from(config.SNAPSHOT_TABLE).select('id').eq('map_id',config.MAP_ID).eq('is_published',true).order('episode_at',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle());
    if(latest?.id!==snapshot.id)throw new Error('The community base changed during export. Retry.');
    writeFileSync(output,JSON.stringify({format:'cbr-legacy-map-payload',version:1,snapshot:{id:snapshot.id,label:`${snapshot.episode_label} plus live overrides (effective turn requires review)`},payload:[...rows.values()]}),{mode:0o600,flag:'wx'});
    console.log(`Exported ${rows.size} community tiles (${snapshot.episode_label}). Archived for local reference only; not imported into the new map.`);
  } else if(command==='extract') {
    const [save,reference,out]=args;
    if(!out)throw new Error('extract <save.Civ5Save> <reference.Civ5Replay> <private-output.json>');
    const output=privateOutput(out), bytes=readFileSync(reference);
    const parsed=parseCiv5Replay(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    const result=spawnSync('python3',[resolve(root,'scripts/map-release/extract.py'),resolve(save)],
      {input:JSON.stringify(parsed),encoding:'utf8',maxBuffer:60*1024*1024});
    if(result.status!==0)throw new Error(result.stderr || 'Extraction failed.');
    const extraction=JSON.parse(result.stdout);
    writeFileSync(output,JSON.stringify(extraction),{mode:0o600,flag:'wx'});
    console.log(`Recovered ${extraction.events.length} events through T${extraction.source.turn}. Private file: ${output}`);
  } else if(command==='prepare') {
    const [input,review,out]=args;
    if(!out)throw new Error('prepare <extraction.json> <review.json> <private-output-directory>');
    const packagePath=privateOutput(resolve(out,'release.json')), reportPath=privateOutput(resolve(out,'validation.json'));
    const base=json(resolve(root,'src/.vuepress/public/community/CBRXMapOct62025_V2.base.json'));
    const owners=[...getEdition('s5').competitors,{name:'Babylon'}];
    const config=json(review);
    const {release,report}=prepareRelease(json(input),base,owners,config);
    const serialized=JSON.stringify(release);
    report.releaseId=createHash('sha256').update(serialized).digest('hex');
    // Failed packages remain local preview artifacts, never uploadable envelopes.
    writeFileSync(packagePath,JSON.stringify({release,validation:report}),{mode:0o600,flag:'wx'});
    writeFileSync(reportPath,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});
    console.log(`${report.ok?'Validated':'BLOCKED'}: ${report.checkedTurns} turn states checked; ${report.issues.length} issues. See ${reportPath}`);
    if(!report.ok)process.exitCode=2;
  } else throw new Error('Use extract, prepare, or export-community. See scripts/map-release/README.md.');
}catch(error){console.error(error.message);process.exitCode=1;}
