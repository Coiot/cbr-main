import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildLegacyNotesPlan,legacyNotesSql} from '../map-release/migrate-notes.mjs';
const author='00000000-0000-4000-8000-000000000001',snapshot='00000000-0000-4000-8000-000000000002';
const backup=()=>({format:'cbr-legacy-notes-backup',version:1,release:{id:'release',history:'00000000-0000-4000-8000-000000000003',last_turn:645},
  snapshots:[{id:snapshot,is_published:true,episode_label:'Episode 31',created_at:'2026-10-01',episode_at:'2026-10-01',payload:[{tile_key:'9,93',payload:{notes:'Original'}}]}],
  overrides:[],edits:[{id:1,tile_key:'9,93',payload:{notes:null},edited_at:'2026-01-01',edited_by:author},
    {id:2,tile_key:'9,93',payload:{notes:'Original'},edited_at:'2026-02-01',edited_by:author},
    {id:3,tile_key:'9,93',payload:{notes:'Original',owner:5},edited_at:'2026-03-01',edited_by:'00000000-0000-4000-8000-000000000004'}],
  profiles:[{id:author,username:'Original author'}],current:[]});
test('legacy migration retains note-change authorship and maps display coordinates to the same tile',()=>{
  const plan=buildLegacyNotesPlan(backup());assert.equal(plan.notes[0].tile,9);assert.equal(plan.notes[0].author,author);assert.equal(plan.notes[0].source_edit_id,2);
  assert.equal(plan.notes[0].authored_at,'2026-02-01');
});
test('current overrides win, explicit clears stay cleared and unpublished snapshots are excluded',()=>{
  const b=backup();b.snapshots.push({...b.snapshots[0],id:'unpublished',is_published:false,episode_at:'2026-11-01',payload:[{tile_key:'9,93',payload:{notes:'Future'}}]});
  b.overrides.push({snapshot_id:snapshot,tile_key:'9,93',payload:{notes:null},updated_at:'2026-10-02'});
  assert.deepEqual(buildLegacyNotesPlan(b).notes,[]);
});
test('migration refuses unverifiable authors and ignores note changes after its source state',()=>{
  const b=backup();b.edits.push({id:4,tile_key:'9,93',payload:{notes:'Different'},edited_at:'2026-10-03',edited_by:author},
    {id:5,tile_key:'9,93',payload:{notes:'Original'},edited_at:'2026-10-04',edited_by:author});
  assert.equal(buildLegacyNotesPlan(b).notes[0].source_edit_id,2);b.profiles=[];assert.throws(()=>buildLegacyNotesPlan(b),/Authorship/);
});
test('prepared SQL is insert-only, preserves conflicts and refuses a changed source or public cap',()=>{
  const b=backup();b.current.push({history:b.release.history,tile:9,author,body:'New note',is_deleted:true});
  const plan=buildLegacyNotesPlan(b),sql=legacyNotesSql(plan);assert.equal(plan.notes[0].existing,true);
  assert.match(sql,/on conflict\(history,tile,author\) do nothing/);assert.match(sql,/last_turn is distinct from 645/);
  assert.match(sql,/Legacy note text changed/);assert.doesNotMatch(sql,/\b(delete from|update public\.)/i);
});
