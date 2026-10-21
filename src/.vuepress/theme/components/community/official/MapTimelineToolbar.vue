<template>
  <section class="map-timeline" aria-label="Game timeline">
    <div class="timeline-playback" role="group" aria-label="Playback controls">
      <button type="button" :disabled="disabled || turn<=firstTurn" aria-label="Previous turn" title="Previous turn" @click="$emit('turn',turn-1)">←</button>
      <button type="button" :aria-pressed="playing" :disabled="disabled || turn>=lastTurn" @click="$emit('play')">{{playing?'Pause':'Play'}}</button>
      <button type="button" :disabled="disabled || turn>=lastTurn" aria-label="Next turn" title="Next turn" @click="$emit('turn',turn+1)">→</button>
    </div>
    <label class="timeline-turn"><span>End of turn</span><input type="number" :min="firstTurn" :max="lastTurn" :value="visibleTurn" :disabled="disabled" @change="choose(Number($event.target.value))" /></label>
    <div class="timeline-scrub">
      <span aria-hidden="true">T{{firstTurn}}</span>
      <div class="timeline-track">
        <div class="timeline-ticks" aria-hidden="true"><i v-for="m in visibleMarkers" :key="m.episode" :style="{left:tickPosition(m.turn)}" :title="`Episode ${m.episode} · End of turn ${m.turn}`"></i></div>
        <input ref="range" type="range" aria-label="Turn timeline" :aria-valuetext="`End of turn ${visibleTurn}${currentEpisode?`, Episode ${currentEpisode.episode}`:''}`" :min="firstTurn" :max="lastTurn" :value="visibleTurn" :disabled="disabled" @pointerdown="startScrub" @input="scrub" @keydown="stopScrub" />
      </div>
      <span aria-hidden="true">T{{lastTurn}}</span>
    </div>
    <label class="timeline-speed"><span>Speed</span><select :value="speed" :disabled="disabled" @change="$emit('speed',Number($event.target.value))"><option :value="0.25">1 turn / 4 sec</option><option :value="0.5">1 turn / 2 sec</option><option :value="1">1 turn / sec</option><option :value="2">2 turns / sec</option><option :value="5">5 turns / sec</option><option :value="10">10 turns / sec</option></select></label>
    <div class="timeline-episodes">
      <label><span class="timeline-sr">Jump to episode end</span><select :value="currentEpisode?.turn??''" :disabled="disabled || !visibleMarkers.length" @change="choose(Number($event.target.value))"><option disabled value="">Episodes</option><option v-for="m in visibleMarkers" :key="m.episode" :value="m.turn">Ep {{m.episode}} · T{{m.turn}}</option></select></label>
      <details v-if="canManage" ref="manager" class="timeline-manager" @keydown.esc="closeManager" @toggle="managerToggle">
        <summary aria-label="Manage episode endpoints" title="Manage episode endpoints">+</summary>
        <form @submit.prevent="saveMarker">
          <strong>Episode endpoints</strong>
          <p>{{remote?'Saving publishes the episode endpoint for everyone.':'Local preview only. These markers are saved on this device.'}}</p>
          <p v-if="publicTurn!==null">Public through the end of turn {{publicTurn}}.</p>
          <label>Episode<input v-model.trim="episode" type="number" min="0" max="1000" step="0.1" required :disabled="saving" /></label>
          <label>End turn<input v-model.number="endTurn" type="number" :min="firstTurn" :max="lastTurn" required :disabled="saving" /></label>
          <button type="submit" :disabled="saving">{{saving?'Saving…':remote?'Publish endpoint':'Save marker'}}</button>
          <p v-if="formError||message" role="status">{{formError||message}}</p>
        </form>
      </details>
    </div>
  </section>
</template>
<script>
import {upsertEpisodeMarker} from '../../../../../shared/mapEpisodeMarkers.mjs';
import {createMarkerScrubber} from './markerScrub.mjs';
export default {
  props:{turn:Number,firstTurn:Number,lastTurn:Number,bookmarks:{type:Array,default:()=>[]},playing:Boolean,disabled:Boolean,speed:{type:Number,default:2},canManage:Boolean,remote:Boolean,saving:Boolean,message:String,publicTurn:{type:Number,default:null}},
  emits:['turn','play','speed','episode'],
  data:()=>({draftTurn:null,episode:'',endTurn:0,formError:''}),
  computed:{
    visibleTurn(){return this.draftTurn??this.turn;},
    visibleMarkers(){return this.bookmarks.filter(m=>m.turn>=this.firstTurn&&m.turn<=this.lastTurn);},
    currentEpisode(){return this.visibleMarkers.find(m=>m.turn===this.visibleTurn);}
  },
  watch:{turn(){if(!this._pointer||this.turn===this.draftTurn)this.draftTurn=null;},lastTurn(){this.stopScrub();this.draftTurn=null;},message(){this.formError='';}},
  mounted(){this.endTurn=this.turn;this.episode=String(Math.floor(Math.max(0,...this.bookmarks.map(m=>Number(m.episode))))+1);window.addEventListener('pointerup',this.stopScrub);window.addEventListener('pointercancel',this.stopScrub);document.addEventListener('pointerdown',this.outsideManager);},
  beforeUnmount(){this.stopScrub();window.removeEventListener('pointerup',this.stopScrub);window.removeEventListener('pointercancel',this.stopScrub);document.removeEventListener('pointerdown',this.outsideManager);},
  methods:{
    tickPosition(turn){const fraction=(turn-this.firstTurn)/(this.lastTurn-this.firstTurn||1);return `calc(8px + (100% - 16px) * ${fraction})`;},
    choose(value){this.stopScrub();const turn=Math.max(this.firstTurn,Math.min(this.lastTurn,Math.round(Number(value)||0)));this.draftTurn=turn;this.$emit('turn',turn);},
    startScrub(){this.stopScrub();this._pointer=true;this._raw=null;this._scrubber=createMarkerScrubber(this.visibleMarkers.filter(m=>m.turn>this.firstTurn&&m.turn<this.lastTurn).map(m=>m.turn),{tolerance:Math.max(1,(this.lastTurn-this.firstTurn)*7/Math.max(1,this.$refs.range.clientWidth-16))});},
    scrub(event){const raw=Number(event.target.value);if(!this._pointer){this.choose(raw);return;}this._raw=raw;this.pointerValue(raw);},
    pointerValue(raw){const result=this._scrubber.step(raw,performance.now()),changed=result.turn!==this.visibleTurn;this.draftTurn=result.turn;this.$refs.range.value=result.turn;if(changed)this.$emit('turn',result.turn);clearTimeout(this._hold);if(result.until)this._hold=setTimeout(()=>{if(this._pointer)this.pointerValue(this._raw);},Math.max(1,result.until-performance.now()));},
    stopScrub(event){if(event?.type==='pointerup'&&this._pointer&&Number.isFinite(this._raw)){const turn=this._scrubber.finish(this._raw);if(turn!==this.visibleTurn){this.draftTurn=turn;this.$emit('turn',turn);}}this._pointer=false;clearTimeout(this._hold);this._scrubber=null;},
    saveMarker(){this.formError='';try{const marker={episode:String(this.episode).trim(),turn:Number(this.endTurn)};upsertEpisodeMarker(this.bookmarks,marker,{firstTurn:this.firstTurn,lastTurn:this.lastTurn});this.$emit('episode',marker);}catch(error){this.formError=error.message;}},
    managerToggle(event){if(event.target.open){this.endTurn=this.turn;this.formError='';}},
    closeManager(){if(this.$refs.manager)this.$refs.manager.open=false;},
    outsideManager(event){if(this.$refs.manager&&!this.$refs.manager.contains(event.target))this.closeManager();}
  }
};
</script>
<style scoped>
.map-timeline{position:relative;z-index:4;box-sizing:border-box;display:grid;grid-template-columns:auto auto minmax(8rem,1fr) auto auto;align-items:center;gap:.4rem .7rem;margin:.5rem 0 .75rem;padding:.35rem .6rem;border:1px solid var(--panel-border-color);border-radius:1rem;background:var(--panel-bg-soft-color);color:var(--panel-text-color)}
.map-timeline *{box-sizing:border-box}.map-timeline button,.map-timeline summary{font:inherit;font-weight:700;cursor:pointer;color:var(--panel-text-color)}.map-timeline label{display:flex;align-items:center;gap:.4rem;margin:0;color:var(--panel-muted-color);font-size:.75rem;font-weight:800;white-space:nowrap}.map-timeline :is(input[type=number],select){min-width:0;max-width:100%;min-height:32px;padding:.25rem .5rem;border:1px solid var(--panel-border-color);border-radius:999px;background:var(--panel-bg-elevated-color);color:var(--panel-text-color);font:inherit;font-size:.8rem;font-weight:700;line-height:1.3}.map-timeline :is(button,input,select,summary):focus-visible{outline:3px solid var(--field-label-color);outline-offset:2px}.map-timeline :disabled{opacity:.45;cursor:default}.timeline-playback{display:grid;grid-template-columns:32px 3.4rem 32px;overflow:hidden;border:1px solid var(--panel-border-color);border-radius:999px;background:var(--panel-bg-elevated-color)}.map-timeline .timeline-playback button{min-width:0;min-height:32px;padding:.25rem .4rem;border:0;border-radius:0;background:transparent;font-size:.85rem;line-height:1.3}.timeline-playback button+button{border-left:1px solid var(--panel-border-color)!important}.map-timeline .timeline-playback button:hover:not(:disabled),.timeline-playback button[aria-pressed=true]{background:var(--accent-color);color:#171717}.map-timeline .timeline-playback button:focus-visible{outline-offset:-3px}.timeline-turn input{width:4.5rem;text-align:center;font-variant-numeric:tabular-nums}.timeline-scrub{display:flex;align-items:center;gap:.5rem;min-width:0;color:var(--panel-muted-color);font-size:.7rem;font-weight:700;white-space:nowrap}.timeline-track{position:relative;flex:1;min-width:0;height:32px;display:flex;align-items:center}.map-timeline .timeline-track input{position:relative;z-index:1;width:100%;min-width:0;min-height:24px;margin:0;padding:0;border:0;background:transparent;accent-color:var(--accent-color);cursor:pointer}.timeline-ticks{position:absolute;inset:0;pointer-events:none}.timeline-ticks i{position:absolute;top:3px;bottom:3px;width:2px;transform:translateX(-50%);background:var(--accent-color);opacity:.75}.timeline-episodes{display:flex;align-items:center;gap:.3rem;min-width:0}.timeline-episodes>label{min-width:0;flex:1;justify-content:flex-end}.timeline-manager{flex:0 0 auto}.timeline-episodes select{width:8.5rem}.timeline-manager>summary{display:flex;align-items:center;justify-content:center;width:32px;min-height:32px;list-style:none;border:1px solid var(--panel-border-color);border-radius:50%;background:var(--panel-bg-elevated-color);font-size:1.1rem}.timeline-manager>summary::-webkit-details-marker{display:none}.timeline-manager[open]>summary,.timeline-manager>summary:hover{background:var(--accent-color);color:#171717}.timeline-manager form{position:absolute;z-index:10;right:0;top:calc(100% + .4rem);width:min(22rem,100%);padding:1rem;border:1px solid var(--panel-border-color);border-top:3px solid var(--accent-color);border-radius:0 0 12px 12px;background:var(--panel-bg-color);box-shadow:0 8px 24px rgb(0 0 0/.3);font-size:.9rem}.timeline-manager p{font-size:.8rem;line-height:1.5;margin:.5rem 0}.timeline-manager form label{display:grid;gap:.3rem;margin:.7rem 0;font-size:.85rem}.timeline-manager form input{border-radius:7px}.timeline-manager form button{padding:.5rem .8rem;min-height:40px;border:1px solid var(--accent-color);border-radius:999px;background:var(--accent-color);color:#171717}.timeline-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:1100px){.map-timeline{grid-template-columns:auto 1fr auto auto}.timeline-turn{justify-self:center}.timeline-scrub{grid-column:1/-1;grid-row:2}.timeline-episodes{grid-column:3;grid-row:1}.timeline-speed{grid-column:4;grid-row:1}}
@media(max-width:900px){.timeline-playback{grid-template-columns:40px 3.4rem 40px}.map-timeline .timeline-playback button,.map-timeline :is(input[type=number],select){min-height:40px}.timeline-manager>summary{min-height:40px;width:32px}}
@media(max-width:650px){.map-timeline{grid-template-columns:auto minmax(0,1fr);gap:.3rem .5rem}.timeline-speed{grid-column:2;grid-row:1;justify-self:end}.timeline-speed>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.timeline-speed select{width:7.5rem;font-size:.75rem}.timeline-turn{grid-column:1;grid-row:2;justify-self:start}.timeline-turn>span{max-width:6ch;white-space:normal;line-height:1.2}.timeline-episodes{grid-column:2;grid-row:2;justify-self:stretch;justify-content:flex-end}.timeline-scrub{grid-row:3}.timeline-episodes select{width:100%;max-width:7.2rem}}
</style>
