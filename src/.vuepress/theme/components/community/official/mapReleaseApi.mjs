import publicConfig from '../../../../../shared/publicConfig.json';
import {fetchMapAsset} from '../../../../../shared/mapReleaseDelivery.mjs';
async function requestMapApi(input, client, signal) {
  const {data}=client?await client.auth.getSession():{data:null};
  const token=data?.session?.access_token;
  const response=await fetch(`${publicConfig.SUPABASE_URL}/functions/v1/map-release`,{
    method:'POST',signal,cache:'no-store',
    headers:{'Content-Type':'application/json',apikey:publicConfig.SUPABASE_ANON_KEY,...(token?{Authorization:`Bearer ${token}`}:{})},
    body:JSON.stringify({...input,...(['release','timeline-admin'].includes(input.action)?{includeMessages:true}:{})})
  });
  const result=await response.json();
  if(!response.ok||result.error)throw new Error(result.error||'The map service is unavailable. Please retry.');
  return result;
}
export async function mapReleaseRequest(input, client, signal) {
  if (input.action!=='release') return requestMapApi(input,client,signal);
  const result=await requestMapApi({...input,preferCdn:true},client,signal);
  if(!result.historyKey)return result;
  try {
    const timeout=AbortSignal.timeout(8000);
    const assetSignal=signal?AbortSignal.any([signal,timeout]):timeout;
    return {id:result.id,release:await fetchMapAsset(result.id,'history',result.historyKey,assetSignal)};
  } catch(error) {
    if(signal?.aborted)throw error;
    return requestMapApi(input,client,signal);
  }
}
export function timelineSource(history,turn){return `timeline:${history}:${turn}`;}
export function parseTimelineSource(source) {
  const match=/^timeline:([0-9a-f-]{36}):([0-9]{1,6})$/.exec(source||'');
  return match?{history:match[1],turn:Number(match[2])}:null;
}
