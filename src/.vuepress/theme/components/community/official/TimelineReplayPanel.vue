<template>
  <section class="tile-info-card timeline-replay-panel">
    <div class="timeline-replay-toggle" role="group" aria-label="Replay information">
      <button :aria-pressed="tab==='civilizations'" @click="tab='civilizations'">Civilizations</button>
      <button :aria-pressed="tab==='events'" @click="tab='events'">Events</button>
    </div>
    <h2>End of turn {{frame.turn}}</h2>
    <template v-if="tab==='civilizations'">
      <div class="timeline-replay-scroll"><table><thead><tr><th>Civilization</th><th>Cities</th><th>Tiles</th></tr></thead>
        <tbody><tr v-for="row in summary" :key="row.ownerId"><th scope="row"><span class="timeline-civ-dot" :style="civStyle(row.name)" aria-hidden="true"></span>{{row.name}}</th><td>{{row.cities}}</td><td>{{row.tiles}}</td></tr></tbody>
      </table></div>
    </template>
    <template v-else>
      <div class="timeline-event-filters">
        <label>Event type<select v-model="filter"><option v-for="[value,label] in categories" :key="value" :value="value">{{label}}</option></select></label>
        <label>Search events<input v-model="query" type="search" maxlength="100" placeholder="City, civilization, or event…" /></label>
      </div>
      <p class="official-muted timeline-event-count" role="status">{{events.length}} of {{matchingEvents.length.toLocaleString()}} events · newest first</p>
      <ol v-if="events.length" class="timeline-replay-events"><li v-for="event in events" :key="event.order"><strong>Turn {{event.turn}} <small>{{categoryLabel(event.category)}}</small></strong><span>{{event.text}}</span></li></ol>
      <p v-else>No matching events.</p>
      <button v-if="events.length<matchingEvents.length" class="timeline-earlier-events" @click="limit+=100">Show earlier events</button>
    </template>
  </section>
</template>
<script>
import {timelineSummary,timelineEventHistory,filterTimelineEvents,eventCategories} from './timelineSummary.mjs';
import {civStyle} from '../../supporters/showcaseModel.mjs';
export default {
  props:{release:Object,frame:Object},
  data:()=>({tab:'civilizations',filter:'all',query:'',limit:100,categories:eventCategories}),
  computed:{
    summary(){return timelineSummary(this.frame,this.release);},
    history(){return timelineEventHistory(this.release);},
    matchingEvents(){return filterTimelineEvents(this.history,this.frame.turn,this.filter,this.query);},
    events(){return this.matchingEvents.slice(0,this.limit);}
  },
  watch:{filter(){this.limit=100;},query(){this.limit=100;},'frame.turn'(){this.limit=100;},release(){this.limit=100;}},
  methods:{civStyle,categoryLabel(value){return eventCategories.find(([key])=>key===value)?.[1]||'Other messages';}}
};
</script>
<style scoped>
.timeline-replay-panel{min-width:0}.timeline-replay-panel h2{font-size:1.2rem;margin:1rem 0}.timeline-replay-toggle{display:inline-flex;border:1px solid var(--accent-color);border-radius:999px;overflow:hidden}.timeline-replay-toggle button{border:0;border-radius:0;padding:.4rem .7rem;font-size:.85rem}.timeline-replay-toggle button+button{border-left:1px solid var(--accent-color)}.timeline-replay-toggle button[aria-pressed=true]{background:var(--accent-color);color:#171717}.timeline-replay-toggle button:focus-visible{outline-offset:-4px}.timeline-replay-scroll{max-height:330px;overflow:auto}.timeline-replay-panel table{display:table;width:100%;margin:0;border-collapse:collapse;font-size:.82rem}.timeline-replay-panel tr,.timeline-replay-panel tbody tr:nth-child(even){border:0;background:var(--panel-bg-color);color:var(--panel-text-color)}.timeline-replay-panel tbody tr:nth-child(even){background:var(--panel-bg-elevated-color)}.timeline-replay-panel th,.timeline-replay-panel td{border:0;border-bottom:1px solid var(--panel-border-color);padding:.4rem .25rem;text-align:left}.timeline-replay-panel td{text-align:right}.timeline-replay-panel thead th{position:sticky;top:0;background:var(--panel-bg-elevated-color)}.timeline-civ-dot{display:inline-block;width:.65rem;height:.65rem;border:2px solid;border-radius:50%;margin-right:.4rem}.timeline-replay-events{max-height:330px;overflow:auto;list-style:none;margin:0;padding:0}.timeline-replay-events li{padding:.6rem 0;border-bottom:1px solid var(--panel-border-color);font-size:.85rem}.timeline-replay-events strong,.timeline-replay-events span{display:block}.timeline-replay-events strong{color:var(--field-label-color)}.timeline-replay-panel label{display:grid;gap:.3rem;margin-top:1rem;font-size:.85rem;font-weight:700}.timeline-replay-panel select{font:inherit;background:var(--panel-bg-color);color:var(--panel-text-color);border:1px solid var(--panel-border-color);border-radius:6px;padding:.4rem;max-width:100%}
</style>
<style scoped>
.timeline-event-filters{display:grid;gap:.6rem}.timeline-event-filters label{margin:0}.timeline-event-filters input{min-width:0;width:100%;box-sizing:border-box;font:inherit;padding:.4rem;background:var(--panel-bg-color);color:var(--panel-text-color);border:1px solid var(--panel-border-color);border-radius:6px}.timeline-event-count{font-size:.75rem;margin:.65rem 0}.timeline-replay-events small{font-size:.7rem;font-weight:400;color:var(--muted-text-color);margin-left:.4rem}.timeline-replay-events span{white-space:pre-line;overflow-wrap:anywhere}.timeline-replay-panel .timeline-earlier-events{font-size:.8rem;padding:.3rem .6rem;margin-top:.65rem}
</style>
