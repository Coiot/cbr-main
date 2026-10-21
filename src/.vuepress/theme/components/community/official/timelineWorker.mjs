import {createTimeline} from '../../../../../shared/mapRelease.mjs';
let timeline=null;
self.onmessage=({data})=>{
  try {
    if(data.release)timeline=createTimeline(data.release);
    if(!timeline)throw new Error('Load a published timeline first.');
    self.postMessage({request:data.request,frame:timeline.frame(data.turn)});
  }catch(error){self.postMessage({request:data.request,error:error.message});}
};
