<template>
  <div class="timeline-statistics">
    <label>Statistic<select v-model="metric">
      <optgroup v-for="group in groups" :key="group" :label="group">
        <option v-for="item in metrics.filter(m=>m.group===group)" :key="item.key" :value="item.key">{{item.label}}</option>
      </optgroup>
    </select></label>
    <p class="timeline-statistics-note">Recorded during turn {{turn}}<template v-if="selected.unit"> · {{selected.unit}}</template></p>
    <p v-if="loading" role="status">Loading statistics…</p>
    <p v-else-if="error" role="status">{{error}} <button @click="load">Retry</button></p>
    <p v-else-if="!snapshot?.available">Historical statistics are not available for this release.</p>
    <p v-else-if="!hasObservations">No observations recorded for this statistic at T{{turn}}.</p>
    <div v-else class="timeline-statistics-scroll"><table>
      <thead><tr><th scope="col">Civilization</th><th scope="col">{{selected.label}}</th></tr></thead>
      <tbody><tr v-for="row in rows" :key="row.ownerId"><th scope="row"><span class="timeline-statistics-dot" :style="civStyle(row.name)" aria-hidden="true"></span>{{row.name}}</th><td>{{formatStatistic(row.value,metric)}}</td></tr></tbody>
    </table></div>
  </div>
</template>
<script>
import {mapStatisticsMetrics,statisticsRows,formatStatistic} from '../../../../../shared/mapStatistics.mjs';
import {statisticsMethods} from './statisticsSession.mjs';
import {civStyle} from '../../supporters/showcaseModel.mjs';
export default {
  props:{release:Object,releaseId:String,turn:Number,client:Object,preview:Boolean},
  data:()=>({metric:'score',metrics:mapStatisticsMetrics,groups:[...new Set(mapStatisticsMetrics.map(m=>m.group))],snapshot:null,loading:false,error:''}),
  computed:{
    selected(){return mapStatisticsMetrics.find(m=>m.key===this.metric);},
    rows(){return statisticsRows(this.snapshot,this.release,this.turn,this.metric);},
    hasObservations(){return this.rows.some(r=>r.value!==null);}
  },
  watch:{turn:'load',releaseId:'load',release:'load'},
  mounted(){this._alive=true;this.load();},
  beforeUnmount(){this._alive=false;this._request++;this._abort?.abort();},
  methods:{...statisticsMethods,civStyle,formatStatistic}
};
</script>
<style scoped>
.timeline-statistics{min-width:0}.timeline-statistics label{display:grid;gap:.3rem;font-size:.85rem;font-weight:700}.timeline-statistics select{font:inherit;max-width:100%;min-width:0;padding:.4rem;background:var(--panel-bg-color);color:var(--panel-text-color);border:1px solid var(--panel-border-color);border-radius:6px}.timeline-statistics-note{font-size:.75rem;color:var(--color-text-muted);line-height:1.4}.timeline-statistics p{font-size:.8rem}.timeline-statistics-scroll{max-height:330px;overflow:auto}.timeline-statistics table{display:table;width:100%;margin:0;border-collapse:collapse;font-size:.8rem}.timeline-statistics tr,.timeline-statistics tbody tr:nth-child(even){background:var(--panel-bg-color);color:var(--panel-text-color);border:0}.timeline-statistics tbody tr:nth-child(even){background:var(--panel-bg-elevated-color)}.timeline-statistics th,.timeline-statistics td{border:0;border-bottom:1px solid var(--panel-border-color);padding:.4rem .25rem;text-align:left}.timeline-statistics td{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.timeline-statistics thead th{position:sticky;top:0;background:var(--panel-bg-elevated-color)}.timeline-statistics-dot{display:inline-block;width:.65rem;height:.65rem;border:2px solid;border-radius:50%;margin-right:.4rem}.timeline-statistics button{font-size:.8rem;padding:.2rem .5rem}
</style>
