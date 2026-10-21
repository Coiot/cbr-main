import config from './officialMapConfig.json' with {type:'json'};
import {validateEpisodeMarkers} from './mapEpisodeMarkers.mjs';
export const latestMapEpisode=config.latestEpisode;
export const defaultEpisodeMarkers=validateEpisodeMarkers(config.episodeMarkers||[{episode:latestMapEpisode.episode,turn:latestMapEpisode.endTurn}]);
export function timelineLastTurn(availableLastTurn,markers=defaultEpisodeMarkers) {
  return Math.min(availableLastTurn,validateEpisodeMarkers(markers).at(-1).turn);
}
export function timelineBookmarks(markers,availableLastTurn) {
  return validateEpisodeMarkers(markers).filter(m=>m.turn<=availableLastTurn);
}
export function isLoopbackTimeline(hostname) {
  return ['localhost','127.0.0.1','[::1]','::1'].includes(hostname);
}
