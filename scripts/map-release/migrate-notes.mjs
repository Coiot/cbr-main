// Prepares a reviewable, insert-only migration from a private legacy-map backup.
// Applying the generated SQL is a separate, explicit database operation.
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const note=payload=>typeof payload?.notes==='string'?payload.notes.trim():'';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const time=value=>{const t=Date.parse(value);if(!Number.isFinite(t))throw new Error('Missing source timestamp.');return t;};
const sql=value=>`'${String(value).replaceAll("'","''")}'`;

export function buildLegacyNotesPlan(backup){
  if(backup.format!=='cbr-legacy-notes-backup'||backup.version!==1)throw new Error('Invalid private backup.');
  const {release}=backup;
  if(!uuid(release?.history)||!Number.isInteger(release.last_turn)||release.last_turn<0||!release.id)throw new Error('Invalid published release.');
  const snapshots=backup.snapshots.filter(s=>s.is_published).sort((a,b)=>time(b.episode_at)-time(a.episode_at)||time(b.created_at)-time(a.created_at));
  const snapshot=snapshots[0];if(!snapshot||!Array.isArray(snapshot.payload))throw new Error('No published legacy snapshot.');
  const rows=new Map();
  for(const row of snapshot.payload){if(rows.has(row.tile_key))throw new Error('Duplicate snapshot tile.');rows.set(row.tile_key,{...row,at:snapshot.created_at});}
  const keys=new Set();
  for(const row of backup.overrides.filter(r=>r.snapshot_id===snapshot.id)){
    if(keys.has(row.tile_key))throw new Error('Duplicate live override.');keys.add(row.tile_key);
    rows.set(row.tile_key,{...row,payload:{...rows.get(row.tile_key)?.payload,...row.payload},at:row.updated_at});
  }
  const history=new Map();
  for(const row of [...backup.edits].sort((a,b)=>Number(a.id)-Number(b.id))){
    if(!Object.hasOwn(row.payload||{},'notes'))continue;
    const previous=history.get(row.tile_key)||[];
    if(!previous.length||previous.at(-1).text!==note(row.payload))previous.push({...row,text:note(row.payload)});
    history.set(row.tile_key,previous);
  }
  const profiles=new Map(backup.profiles.map(p=>[p.id,p]));
  const notes=[],unresolved=[];
  for(const row of rows.values()){
    const body=note(row.payload);if(!body)continue; // Explicit clears override older snapshot notes.
    const match=/^(\d+),(\d+)$/.exec(row.tile_key);
    if(!match||Number(match[1])>=180||Number(match[2])>=94||body.length>2000)throw new Error('Invalid tile or oversized legacy note.');
    const x=Number(match[1]),y=Number(match[2]),changes=history.get(row.tile_key)||[];
    const change=changes.findLast(r=>r.text===body&&time(r.edited_at)<=time(row.at));
    const author=change?.edited_by||change?.user_id;
    if(!uuid(author)||!profiles.has(author)){unresolved.push(row.tile_key);continue;}
    const tile=(93-y)*180+x;
    notes.push({tile_key:row.tile_key,tile,author,author_name:profiles.get(author).username||'CBR reader',body,
      authored_at:change.edited_at,source_edit_id:change.id,source_snapshot:snapshot.id,
      existing:backup.current.some(n=>n.history===release.history&&n.tile===tile&&n.author===author)});
  }
  if(unresolved.length)throw new Error(`Authorship needs review for ${unresolved.length} notes; no import prepared.`);
  return {format:'cbr-legacy-notes-migration',version:1,release,snapshot:{id:snapshot.id,label:snapshot.episode_label},notes:notes.sort((a,b)=>a.tile-b.tile)};
}

export function legacyNotesSql(plan){
  const {release,snapshot,notes}=plan;
  const expected=Object.fromEntries(notes.map(n=>[n.tile_key,n.body]));
  const rows=notes.map(n=>({history:release.history,tile:n.tile,author:n.author,body:n.body,revision:1,public_end_turn:release.last_turn,updated_at:n.authored_at}));
  return `-- Legacy notes only. No updates, deletions, map geometry, or release changes.
begin;
-- Keep the publication and legacy source stable throughout the import.
lock table public.map_snapshots,public.tile_overrides in share mode;
do $migration$
declare current_release public.map_releases; latest uuid; effective jsonb;
begin
  select r.* into current_release from public.map_release_control c join public.map_releases r on r.id=c.active_release
    where c.map_id='s5' and c.enabled for share of c;
  if current_release.id is distinct from ${sql(release.id)} or current_release.history is distinct from ${sql(release.history)}::uuid
    or current_release.last_turn is distinct from ${release.last_turn} then raise exception 'Public release changed; prepare a new note migration.'; end if;
  select id into latest from public.map_snapshots where map_id='s5' and is_published order by episode_at desc,created_at desc limit 1;
  if latest is distinct from ${sql(snapshot.id)}::uuid then raise exception 'Legacy snapshot changed; prepare a new backup.'; end if;
  with base as (
    select e->>'tile_key' as tile_key,e->'payload' as payload from public.map_snapshots s cross join lateral jsonb_array_elements(s.payload) e where s.id=latest
  ), overrides as (
    select tile_key,payload from public.tile_overrides where map_id='s5' and snapshot_id=latest
  ), combined as (
    select coalesce(b.tile_key,o.tile_key) as tile_key,coalesce(b.payload,'{}'::jsonb)||coalesce(o.payload,'{}'::jsonb) as payload
    from base b full join overrides o on o.tile_key=b.tile_key
  ) select coalesce(jsonb_object_agg(tile_key,btrim(payload->>'notes')) filter(where nullif(btrim(payload->>'notes'),'') is not null),'{}'::jsonb) into effective from combined;
  if effective is distinct from ${sql(JSON.stringify(expected))}::jsonb then raise exception 'Legacy note text changed; prepare a new backup.'; end if;
end $migration$;
insert into public.map_tile_notes(history,tile,author,body,revision,public_end_turn,updated_at)
select history,tile,author,body,revision,public_end_turn,updated_at from jsonb_to_recordset(${sql(JSON.stringify(rows))}::jsonb)
  as n(history uuid,tile integer,author uuid,body text,revision integer,public_end_turn integer,updated_at timestamptz)
on conflict(history,tile,author) do nothing;
commit;
`;
}

function privateFile(path){
  const target=resolve(path),actual=resolve(realpathSync(dirname(target)),target.split('/').at(-1));
  if(!relative(root,actual).startsWith('..'))throw new Error('Keep note backups, reports and SQL outside the repository.');
  return actual;
}
if(import.meta.url.endsWith('/scripts/map-release/migrate-notes.mjs')&&process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [input,sqlOutput,reportOutput]=process.argv.slice(2);
    if(!reportOutput)throw new Error('Usage: node scripts/map-release/migrate-notes.mjs <private-backup.json> <private-import.sql> <private-report.json>');
    const source=readFileSync(input),plan=buildLegacyNotesPlan(JSON.parse(source));
    plan.backup_sha256=createHash('sha256').update(source).digest('hex');
    writeFileSync(privateFile(sqlOutput),legacyNotesSql(plan),{mode:0o600,flag:'wx'});
    writeFileSync(privateFile(reportOutput),JSON.stringify(plan,null,2),{mode:0o600,flag:'wx'});
    console.log(JSON.stringify({prepared:plan.notes.length,existingPreserved:plan.notes.filter(n=>n.existing).length,source:plan.snapshot.label,publicMaximum:plan.release.last_turn,applied:false}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
