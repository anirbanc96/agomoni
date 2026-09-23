'use strict';
(function(){
 const data=window.PlaylistData,player=window.PujoPlayer;
 const el=id=>document.getElementById(id);
 const panel=el('playlist-panel'),toggle=el('playlist-toggle'),list=el('playlist-songs');
 const form=el('playlist-add-form'),input=el('song-url'),feedback=el('playlist-feedback');
 let shared=[],personal=data.readLocalSongs(),previews=[],songs=[],open=false,busy=false,closeTimer;
 const metadataQueue=[],metadataPending=new Set();let metadataWorkers=0;

 function fitPanel(){
  const available=el('player-wrap').getBoundingClientRect().top-(window.visualViewport?.offsetTop||0)-24;
  panel.style.maxHeight=`${Math.max(160,Math.min(470,available))}px`;
 }
 function scheduleClose(){
  clearTimeout(closeTimer);
  if(open)closeTimer=setTimeout(()=>{
   if(busy||form.contains(document.activeElement)){scheduleClose();return;}
   close();
  },10000);
 }
 function close(returnFocus=true){
  const hadFocus=panel.contains(document.activeElement);
  open=false;clearTimeout(closeTimer);
  panel.classList.remove('is-open');panel.inert=true;panel.setAttribute('aria-hidden','true');
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open playlist');
  if(returnFocus&&hadFocus)toggle.focus({preventScroll:true});
 }
 function show(){
  open=true;fitPanel();panel.inert=false;panel.setAttribute('aria-hidden','false');panel.classList.add('is-open');
  toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close playlist');
  scheduleClose();
 }
 function setCurrent(id,isPlaying){
  for(const row of list.children){
   const active=row.dataset.videoId===id,button=row.querySelector('.playlist-play');
   row.classList.toggle('is-current',active);row.classList.toggle('is-playing-track',active&&isPlaying);
   if(active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
  }
 }
 window.PujoPlaylist={close,setCurrent};

 function render(){
  const focused=document.activeElement;
  const focusedId=focused.closest?.('[data-video-id]')?.dataset.videoId;
  const focusedAction=focused.dataset?.action,scroll=list.scrollTop;
  const fragment=document.createDocumentFragment();
  songs.forEach((song,index)=>{
   const row=document.createElement('li');row.dataset.videoId=song.id;
   const info=document.createElement('div');info.className='playlist-song';
   const number=document.createElement('span');number.className='playlist-number';number.textContent=String(index+1).padStart(2,'0');number.setAttribute('aria-hidden','true');
   const copy=document.createElement('span');copy.className='playlist-song-copy';
   const title=document.createElement('span');title.className='playlist-song-title';title.textContent=song.title;
   const artist=document.createElement('span');artist.className='playlist-song-artist';artist.textContent=song.artist;
   copy.append(title,artist);
   if(song.local||song.preview){const badge=document.createElement('span');badge.className='personal-badge';badge.textContent=song.local?'Yours · saved':'Preview · this visit';copy.append(badge);}
   info.append(number,copy);row.append(info);
   const play=document.createElement('button');play.type='button';play.className='playlist-play';play.dataset.action='play';play.title='Play now';play.setAttribute('aria-label',`Play ${song.title}`);
   const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
   const triangle=document.createElementNS('http://www.w3.org/2000/svg','path');triangle.setAttribute('d','M9 5.5 19 12 9 18.5Z');icon.append(triangle);play.append(icon);row.append(play);
   if(song.local||song.preview){
    const remove=document.createElement('button');remove.type='button';remove.className='playlist-remove';remove.dataset.action='remove';remove.textContent='×';remove.title='Remove your song';remove.setAttribute('aria-label',`Remove ${song.title}`);row.append(remove);
   }
   fragment.append(row);
  });
  list.replaceChildren(fragment);list.scrollTop=scroll;
  if(focusedId&&focusedAction){
   const row=[...list.children].find(item=>item.dataset.videoId===focusedId);
   row?.querySelector(`[data-action="${focusedAction}"]`)?.focus({preventScroll:true});
  }
  el('playlist-count').textContent=`${songs.length} ${songs.length===1?'song':'songs'}`;
  el('playlist-empty').hidden=songs.length>0;
  const selected=player.selection();setCurrent(selected.id,selected.playing);
 }
 function sync(){
  const saved=data.mergeSongs(shared,personal),ids=new Set(saved.map(song=>song.id));
  songs=[...saved,...previews.filter(song=>!ids.has(song.id)).map(song=>({...song,preview:true,local:false}))];
  player.setSongs(songs);render();
 }
 async function resolveTitle(id){
  const info=await data.metadata(id);if(!info)return;
  const current=[...shared,...personal,...previews].find(item=>item.id===id);if(!current)return;
  Object.assign(current,info,{needsMetadata:false});
  if(personal.includes(current))data.saveLocalSongs(personal);
  sync();
 }
 function queueTitles(items){
  for(const song of items)if(song.needsMetadata&&!metadataPending.has(song.id)){metadataPending.add(song.id);metadataQueue.push(song.id);}
  while(metadataWorkers<3&&metadataQueue.length){
   metadataWorkers++;
   void (async()=>{try{while(metadataQueue.length){const id=metadataQueue.shift();await resolveTitle(id);metadataPending.delete(id);}}finally{metadataWorkers--;}})();
  }
 }
 function setBusy(value){
  busy=value;input.readOnly=value;
  el('add-song').disabled=value;el('play-links').disabled=value;
  form.setAttribute('aria-busy',String(value));scheduleClose();
 }
 async function load(){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  let loadError=false;
  try{
   const response=await fetch('songs.md',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('Playlist unavailable');
   shared=data.parseMarkdown(await response.text());
  }catch{loadError=true;}finally{clearTimeout(timeout);}
  sync();setBusy(false);
  if(loadError){feedback.textContent='The shared playlist could not load. You can still add your own songs.';player.notice('The playlist could not load. Refresh, or add a song from the playlist button.');}
  queueTitles([...shared,...personal]);
 }
 async function useLinks(save){
  if(busy)return;
  const parsed=data.parseInput(input.value);
  if(!parsed.entries.length){
   feedback.textContent='Paste YouTube song links or a public playlist page link, one per line.';input.setAttribute('aria-invalid','true');input.focus();scheduleClose();return;
  }
  input.removeAttribute('aria-invalid');setBusy(true);
  const ids=[],seen=new Set(),errors=[];
  for(const entry of parsed.entries){
   try{
    let resolved;
    if(entry.kind==='playlist'){
     feedback.textContent='Reading the YouTube playlist… Your current song keeps playing.';
     resolved=await window.PlaylistImport.videos(entry.id);
    }else resolved=[entry.id];
    for(const id of resolved)if(!seen.has(id)){seen.add(id);ids.push(id);}
   }catch(error){errors.push(error.message);}
  }
  const savedIds=new Set([...shared,...personal].map(song=>song.id));
  let added=0;
  for(const id of ids){
   const existing=songs.find(song=>song.id===id);
   if(save&&!savedIds.has(id)){
    personal.push({...existing||data.songFromLink(`https://youtu.be/${id}`),local:true,preview:false});
    savedIds.add(id);previews=previews.filter(song=>song.id!==id);added++;
   }else if(!save&&!existing){
    previews.push({...data.songFromLink(`https://youtu.be/${id}`),preview:true});added++;
   }
  }
  const stored=save?data.saveLocalSongs(personal):true;
  sync();setBusy(false);
  const parts=[];
  if(ids.length){
   if(save)parts.push(added?`Added ${added} ${added===1?'song':'songs'}${stored?' for your next visit.':' for this visit; browser storage is unavailable.'}`:'These songs are already saved in your playlist.');
   else parts.push('Playing your selection. Use Add to save it for next time.');
   const duplicate=ids.length-added;
   if(save&&added&&duplicate)parts.push(`${duplicate} already in your playlist.`);
  }
  if(parsed.invalid.length)parts.push(`Skipped ${parsed.invalid.length} invalid ${parsed.invalid.length===1?'link':'links'}.`);
  if(errors.length)parts.push(...new Set(errors));
  feedback.textContent=parts.join(' ');
  queueTitles([...personal,...previews]);
  if(!save&&ids.length){
   player.select(ids[0]);close();
   if(errors.length||parsed.invalid.length)player.notice('Playing the available selection. Some links could not be imported; details are in the playlist.');
  }else input.focus({preventScroll:true});
 }

 list.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const id=button.closest('[data-video-id]').dataset.videoId;
  if(button.dataset.action==='play'){close();player.select(id);return;}
  const wasSaved=personal.some(song=>song.id===id);
  personal=personal.filter(song=>song.id!==id);previews=previews.filter(song=>song.id!==id);
  const saved=!wasSaved||data.saveLocalSongs(personal);sync();
  feedback.textContent=saved?'Removed from your playlist.':'Removed for this visit. Browser storage is unavailable.';
  el('playlist-close').focus({preventScroll:true});scheduleClose();
 });
 toggle.addEventListener('click',()=>open?close(false):show());
 el('playlist-close').addEventListener('click',()=>close());
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}else scheduleClose();});
 for(const event of ['pointerdown','input','scroll','focusout'])panel.addEventListener(event,scheduleClose,true);
 document.addEventListener('pointerdown',event=>{if(open&&!panel.contains(event.target)&&!toggle.contains(event.target))close(false);});
 window.addEventListener('resize',()=>{if(open)fitPanel();});
 window.visualViewport?.addEventListener('resize',()=>{if(open)fitPanel();});
 window.addEventListener('storage',event=>{
  if(event.key===null||event.key==='agomoni.pujo.personal.v1'){personal=data.readLocalSongs();sync();queueTitles(personal);}
 });
 form.addEventListener('submit',event=>{event.preventDefault();void useLinks(true);});
 el('play-links').addEventListener('click',()=>void useLinks(false));
 input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');feedback.textContent='';});
 void load();
})();
