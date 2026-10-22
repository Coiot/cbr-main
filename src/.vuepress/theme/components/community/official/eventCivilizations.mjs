import {getEdition} from '../../../../data/editions.js';

// The save uses a few different spellings from the site's public S5 roster.
// Titles may precede the leader name or follow it (for example, "Warlord").
const leaderAliases={
  bactria:['Demetrius'],france:['Maximilien Robespierre'],luba:['Ilunga Sungu'],
  rouran:['Yujiulü Mugulü'],maravi:['Kalonga Mazula'],potiguara:['Filipe Camarão'],caral:['Qhapaq']
};
const words=value=>String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const civilizationKey=value=>{
  const key=words(value).replace(/^the /,'').replaceAll(' ','');
  return ({bjarmia:'bjarmians',hansa:'hanseaticleague'})[key]||key;
};
const roster=[...getEdition('s5').competitors,{name:'Babylon',leader:'Nebuchadnezzar II'}];

export function civilizationEventText(release) {
  const owners=new Map(release.civilizations.map(c=>[c.ownerId,c.name]));
  const civilizations=new Map(release.civilizations.map(c=>[civilizationKey(c.name),c.name]));
  const leaders=roster.flatMap(c=>{
    const key=civilizationKey(c.name),name=civilizations.get(key);
    return name?[{name,aliases:[c.leader,...(leaderAliases[key]||[])].map(words)}]:[];
  });
  const resolve=participant=>{
    const name=civilizations.get(civilizationKey(participant));
    if(name)return name;
    const phrase=` ${words(participant)} `;
    const matches=leaders.filter(c=>c.aliases.some(alias=>phrase.includes(` ${alias} `)));
    return matches.length===1?matches[0].name:participant;
  };
  return (event,text,category)=>{
    if(category==='completions') {
      const match=/^(.+?) completes (.+)!$/.exec(text);
      if(match)return `${owners.get(event.owner)||resolve(match[1])} completes ${match[2]}!`;
    }
    if(category==='diplomacy') {
      const match=/^(.+?)( declares war on | has made peace with )(.+)!$/.exec(text);
      if(match)return `${owners.get(event.owner)||resolve(match[1])}${match[2]}${resolve(match[3])}!`;
    }
    return text;
  };
}
