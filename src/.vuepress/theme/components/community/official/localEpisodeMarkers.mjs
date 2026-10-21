import {defaultEpisodeMarkers} from '../../../../../shared/mapTimelineDisplay.mjs';
import {validateEpisodeMarkers} from '../../../../../shared/mapEpisodeMarkers.mjs';
const key='cbr-s5-episode-endpoints-v1';
export function loadLocalEpisodeMarkers() {
  try{const input=JSON.parse(localStorage.getItem(key));if(input)return validateEpisodeMarkers(input);}catch{}
  return defaultEpisodeMarkers.map(m=>({...m}));
}
export function saveLocalEpisodeMarkers(markers) {
  localStorage.setItem(key,JSON.stringify(validateEpisodeMarkers(markers)));
}
