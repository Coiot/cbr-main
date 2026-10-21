<template>
  <section class="replay-map">
    <CommunityTileMapGrid ref="map" :official-source="source" :show-map-heading="false" :detail-editing="true" extra-panel-label="Replay"
      @official-detail-edit="$emit('edit-details',$event)">
      <template #map-timeline><slot name="timeline" /></template>
      <template #extra-panel><slot name="replay" /></template>
    </CommunityTileMapGrid>
  </section>
</template>
<script>
import {markRaw} from 'vue';
import CommunityTileMapGrid from '../CommunityTileMapGrid.vue';
// The lab changes data only. Rendering, hover/click details and editing use the
// community map components, with saves redirected to its private detail layer.
export default {
  components:{CommunityTileMapGrid},props:{base:Object,frame:Object},emits:['edit-details'],
  computed:{source(){return markRaw({base:this.base,frame:this.frame,preview:true});}}
};
</script>
<style scoped>.replay-map{min-width:0}</style>
