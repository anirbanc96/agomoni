'use strict';
(function(root){
 const storageKey='agomoni.pujo.personal.v1';
 const validId=id=>typeof id==='string'&&/^[\w-]{11}$/.test(id);
 const cleanText=(value,fallback)=>typeof value==='string'&&value.trim()?value.trim().slice(0,200):fallback;

 function videoId(input){
  if(typeof input!=='string')return null;
  try{
   const url=new URL(input.trim());
   if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)return null;
   const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);
   let id;
   if(host==='youtu.be')id=parts[0];
   else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)){
    id=parts[0]==='watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null;
   }else if(['youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)&&parts[0]==='embed')id=parts[1];
   return validId(id)?id:null;
  }catch{return null;}
 }

 function songFromLink(link,title,artist){
  const id=videoId(link);
  return id?{id,title:cleanText(title,`YouTube song (${id})`),artist:cleanText(artist,'YouTube'),needsMetadata:!title}:null;
 }

 function playlistId(input){
  try{
   const url=new URL(input.trim());
   if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)return null;
   if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(url.hostname))return null;
   const path=url.pathname.replace(/\/$/,'');
   const id=path==='/playlist'?url.searchParams.get('list'):path.startsWith('/show/VL')?path.slice(8):null;
   return id&&/^[\w-]{10,120}$/.test(id)&&!id.startsWith('RD')?id:null;
  }catch{return null;}
 }

 function parseInput(input){
  const entries=[],invalid=[],seen=new Set();
  for(const token of String(input).trim().split(/[\s,]+/).filter(Boolean)){
   const url=token.replace(/^[<\[(]+|[>\]),;]+$/g,'');
   const playlist=playlistId(url),video=videoId(url);
   const item=playlist?{kind:'playlist',id:playlist,url}:video?{kind:'video',id:video,url}:null;
   if(!item){invalid.push(token);continue;}
   const key=`${item.kind}:${item.id}`;
   if(!seen.has(key)){seen.add(key);entries.push(item);}
  }
  return {entries,invalid};
 }

 function parseMarkdown(markdown){
  const songs=[],seen=new Set();let fence=null;
  for(const line of String(markdown).replace(/<!--[\s\S]*?-->/g,'').split(/\r?\n/)){
   const marker=line.match(/^\s*(`{3,}|~{3,})/);
   if(marker){if(!fence)fence=marker[1][0];else if(fence===marker[1][0])fence=null;continue;}
   if(fence)continue;
   const bullet=line.match(/^\s*[-*+]\s+(.+)\s*$/);
   if(!bullet)continue;
   const entry=bullet[1].trim();
   const named=entry.match(/^\[([^\]]+)\]\(<?(https?:\/\/[^\s)>]+)>?\)\s*(?:[—–|]\s*|-\s+)?(.*)$/);
   const bare=entry.match(/^<?(https?:\/\/[^\s<>]+)>?$/);
   const song=named?songFromLink(named[2],named[1],named[3]):bare?songFromLink(bare[1]):null;
   if(song&&!seen.has(song.id)){seen.add(song.id);songs.push(song);}
  }
  return songs;
 }

 function readLocalSongs(storage){
  try{
   const rows=JSON.parse((storage||root.localStorage).getItem(storageKey)||'[]');
   if(!Array.isArray(rows))return [];
   const seen=new Set();
   return rows.filter(row=>row&&validId(row.id)&&!seen.has(row.id)&&seen.add(row.id)).map(row=>({
    id:row.id,title:cleanText(row.title,`YouTube song (${row.id})`),artist:cleanText(row.artist,'YouTube'),needsMetadata:!!row.needsMetadata,local:true
   }));
  }catch{return [];}
 }

 function saveLocalSongs(songs,storage){
  try{
   (storage||root.localStorage).setItem(storageKey,JSON.stringify(songs.filter(song=>validId(song.id)).map(({id,title,artist,needsMetadata})=>({id,title,artist,needsMetadata:!!needsMetadata}))));
   return true;
  }catch{return false;}
 }

 function mergeSongs(shared,personal){
  const seen=new Set();
  return [...shared.map(song=>({...song,local:false})),...personal.map(song=>({...song,local:true}))].filter(song=>!seen.has(song.id)&&seen.add(song.id));
 }

 async function metadata(id){
  if(!validId(id))return null;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
  try{
   const url=new URL('https://www.youtube.com/oembed');
   url.searchParams.set('url',`https://www.youtube.com/watch?v=${id}`);url.searchParams.set('format','json');
   const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)return null;
   const data=await response.json();
   return typeof data.title==='string'?{title:cleanText(data.title,`YouTube song (${id})`),artist:cleanText(data.author_name,'YouTube')}:null;
  }catch{return null;}finally{clearTimeout(timeout);}
 }

 const api={videoId,playlistId,parseInput,songFromLink,parseMarkdown,readLocalSongs,saveLocalSongs,mergeSongs,metadata};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.PlaylistData=api;
})(globalThis);
