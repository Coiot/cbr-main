import publicConfig from '../../../../../shared/publicConfig.json';
export async function mapReleaseRequest(input, client, signal) {
  const {data}=client?await client.auth.getSession():{data:null};
  const token=data?.session?.access_token;
  const response=await fetch(`${publicConfig.SUPABASE_URL}/functions/v1/map-release`,{
    method:'POST',signal,cache:'no-store',
    headers:{'Content-Type':'application/json',apikey:publicConfig.SUPABASE_ANON_KEY,...(token?{Authorization:`Bearer ${token}`}:{})},
    body:JSON.stringify(input)
  });
  const result=await response.json();
  if(!response.ok||result.error)throw new Error(result.error||'The map service is unavailable. Please retry.');
  return result;
}
export function timelineSource(history,turn){return `timeline:${history}:${turn}`;}
export function parseTimelineSource(source) {
  const match=/^timeline:([0-9a-f-]{36}):([0-9]{1,6})$/.exec(source||'');
  return match?{history:match[1],turn:Number(match[2])}:null;
}
