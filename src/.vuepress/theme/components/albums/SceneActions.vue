<template><span class="scene-actions"><BookmarkButton :active="bookmarked" :aria-label="bookmarkAria" :title="bookmarkAria" @toggle="$emit('toggle-bookmark')" /><CollectionButton :scenes="[{path:$route.path,number:sceneNumber}]" /></span></template>
<script>
import BookmarkButton from '../../layout/BookmarkButton.vue';
import CollectionButton from '../collections/CollectionButton.vue';
export default { components:{BookmarkButton,CollectionButton}, props:{bookmarked:Boolean,bookmarkAria:String,sceneNumber:Number}, emits:['toggle-bookmark'] };
</script>
<style scoped>.scene-actions { display:inline-flex; align-items:center; gap:.4rem; flex-shrink:0; }</style>
