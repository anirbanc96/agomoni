'use strict';
const $ = id => document.getElementById(id);
let songs=[],playlistReady=false;
let shuffleEnabled=false,shuffleQueue=[],shuffleHistory=[];
function shuffled(ids){
 const result=[...ids];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
function rememberSong(id){if(id){shuffleHistory.push(id);if(shuffleHistory.length>200)shuffleHistory.shift();}}
const mahalaya = {id:'YQyo8QeoYhc',title:'মহিষাসুরমর্দ্দিনী',artist:'Birendra Krishna Bhadra · Saregama Bengali',startSeconds:5};
const mahalayaEmbed = 'https://www.youtube-nocookie.com/embed/YQyo8QeoYhc';
let mode='pujo', songIndex=0, player=null, ready=false, wanted=false, playing=false, loading=false, failed=false, apiTimeout, bufferingTimeout;
const positions={pujo:0,mahalaya:mahalaya.startSeconds};
const currentTrack=()=>mode==='pujo'?(songs[songIndex]||{id:'',title:playlistReady?'Your Pujo playlist':'Loading songs…',artist:playlistReady?'Open the playlist to add a song.':'A moment, please.'}):mahalaya;
const trackStart=()=>currentTrack().startSeconds||0;
const timeLabel=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
function status(text,force=false){$('player-status').textContent=text;document.body.classList.toggle('has-message',force);}
function setPlaying(value){playing=value;document.body.classList.toggle('is-playing',value);$('play-icon').toggleAttribute('hidden',value);$('pause-icon').toggleAttribute('hidden',!value);$('play-label').textContent=value?'Pause':'Play';$('play').setAttribute('aria-label',value?'Pause music':'Play music');$('play').title=value?'Pause music':'Play music';window.PujoPlaylist?.setCurrent(mode==='pujo'?currentTrack().id:null,value);}
function updateTrackDetails(){const track=currentTrack();$('track-title').textContent=track.title;$('track-title').lang=mode==='mahalaya'?'bn':'en';$('track-title').title=track.title;$('track-artist').textContent=track.artist;$('track-artist').title=track.artist;$('youtube-link').href=track.id?`https://www.youtube.com/watch?v=${track.id}`:'https://www.youtube.com';$('youtube-link').hidden=!track.id;$('play').disabled=!track.id;['previous','next','shuffle'].forEach(id=>$(id).disabled=songs.length<2);if(shuffleEnabled)$('previous').disabled=songs.length<2||!shuffleHistory.length;window.PujoPlaylist?.setCurrent(mode==='pujo'?track.id:null,playing);}
function updateTrack(){updateTrackDetails();$('elapsed').textContent='0:00';$('duration').textContent='—:—';$('seek').value=0;$('seek').style.setProperty('--progress','0%');$('seek').disabled=true;status(mode==='mahalaya'?'The voice that welcomes Devi Paksha.':'Press play. Stay a little.');}
function fail(message){clearTimeout(apiTimeout);clearTimeout(bufferingTimeout);loading=false;failed=true;wanted=false;setPlaying(false);$('play').disabled=false;status(message,true);}
function waitForPlayback(){clearTimeout(bufferingTimeout);bufferingTimeout=setTimeout(()=>{if(wanted&&!playing)fail('Playback is taking a while. Try Play again, or listen on YouTube.');},20000);}
function loadCurrent(){failed=false;setPlaying(false);const track=currentTrack();const videoId=track.id;if(!videoId)return;$('youtube-link').href=`https://www.youtube.com/watch?v=${videoId}`;const args={videoId,startSeconds:Math.max(positions[mode]||0,trackStart())};if(wanted){player.loadVideoById(args);status('Opening the music…',true);waitForPlayback();}else{player.cueVideoById(args);}}
function mountPlayer(){
 if(player||!window.YT?.Player)return;
 const frame=document.createElement('iframe');
 frame.id='youtube-player';frame.width='200';frame.height='200';frame.title='YouTube music stream';frame.tabIndex=-1;
 frame.setAttribute('frameborder','0');
 frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
 frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
 frame.setAttribute('allowfullscreen','');
 const source=new URL(mode==='mahalaya'?mahalayaEmbed:`https://www.youtube-nocookie.com/embed/${currentTrack().id}`);
 for(const [key,value] of Object.entries({enablejsapi:1,origin:location.origin,start:trackStart(),autoplay:0,controls:0,playsinline:1,rel:0,fs:0,iv_load_policy:3}))source.searchParams.set(key,value);
 frame.src=source.href;
 $('youtube-player').replaceWith(frame);
 player=new YT.Player(frame,{host:'https://www.youtube-nocookie.com',events:{
 onReady:()=>{clearTimeout(apiTimeout);ready=true;loading=false;loadCurrent();},
 onStateChange:event=>{const s=event.data;if(s===YT.PlayerState.PLAYING){clearTimeout(bufferingTimeout);failed=false;wanted=true;setPlaying(true);status(mode==='mahalaya'?'The voice that welcomes Devi Paksha.':'Streaming from YouTube');}else if(s===YT.PlayerState.PAUSED){wanted=false;setPlaying(false);status('Paused. Take your time.');}else if(s===YT.PlayerState.ENDED){setPlaying(false);if(mode==='pujo'){wanted=true;changeSong(1);}else{wanted=false;positions.mahalaya=trackStart();status('Shubho Mahalaya. Press play to listen again.');}}else if(s===YT.PlayerState.BUFFERING){setPlaying(false);status('Opening the music…',true);}else if(s===YT.PlayerState.CUED){setPlaying(false);}},
 onError:event=>{console.warn('YouTube playback error',event.data);if([101,150].includes(event.data)){fail('YouTube has disabled playback of this recording on other websites. Use Listen on YouTube to hear the recording.');}else if(event.data===153){fail('YouTube could not verify this page. Reload the page or use Listen on YouTube.');}else{fail('This stream is unavailable here. Try again or listen on YouTube.');}},
 onAutoplayBlocked:()=>{wanted=false;setPlaying(false);clearTimeout(bufferingTimeout);status('Tap Play once more to start the music.',true);}
 }});}
function initialize(){
 loading=true;wanted=true;failed=false;status('Connecting to YouTube…',true);
 clearTimeout(apiTimeout);
 apiTimeout=setTimeout(()=>{if(!ready)fail('YouTube is taking a while. Try again or use the YouTube link.');},20000);
 if(window.YT?.Player){mountPlayer();return;}
 window.YouTubeAPI.ready().then(()=>{if(loading)mountPlayer();},()=>fail('YouTube could not connect. Try again or use the YouTube link.'));
}
function resetUnreadyPlayer(){
 if(player)player.destroy();
 player=null;ready=false;loading=false;
 if(!$('youtube-player')){const placeholder=document.createElement('div');placeholder.id='youtube-player';document.querySelector('.stream-host').appendChild(placeholder);}
}
$('play').addEventListener('click',()=>{
 if(!currentTrack().id)return;
 if(!ready&&failed)resetUnreadyPlayer();
 if(!player){if(!loading)initialize();return;}
 if(!ready){status('Connecting to YouTube…',true);return;}
 if(playing||wanted&&!failed){wanted=false;player.pauseVideo();setPlaying(false);}else{wanted=true;if(failed||player.getPlayerState()===YT.PlayerState.ENDED){loadCurrent();}else{player.playVideo();waitForPlayback();}status('Opening the music…',true);}
});
function changeSong(direction){
 if(mode!=='pujo'||!songs.length)return;
 if(shuffleEnabled&&songs.length>1){
  const currentId=currentTrack().id;
  let nextId;
  if(direction<0){
   nextId=shuffleHistory.pop();
   if(!nextId)return;
   shuffleQueue=[currentId,...shuffleQueue.filter(id=>id!==currentId&&id!==nextId)];
  }else{
   if(!shuffleQueue.length)shuffleQueue=shuffled(songs.map(song=>song.id).filter(id=>id!==currentId));
   nextId=shuffleQueue.shift();rememberSong(currentId);
  }
  songIndex=songs.findIndex(song=>song.id===nextId);
 }else songIndex=(songIndex+direction+songs.length)%songs.length;
 positions.pujo=0;updateTrack();if(ready)loadCurrent();
}
$('previous').addEventListener('click',()=>changeSong(-1));$('next').addEventListener('click',()=>changeSong(1));
$('shuffle').addEventListener('click',()=>{
 if(mode!=='pujo')return;
 shuffleEnabled=!shuffleEnabled;
 shuffleQueue=shuffleEnabled?shuffled(songs.map(song=>song.id).filter(id=>id!==currentTrack().id)):[];
 shuffleHistory=[];
 $('shuffle').setAttribute('aria-pressed',String(shuffleEnabled));
 $('shuffle').title=shuffleEnabled?'Shuffle on · turn off':'Shuffle off · turn on';
 updateTrackDetails();
});
$('mode-toggle').addEventListener('click',()=>{
 window.PujoPlaylist?.close(false);
 const resume=playing||wanted;
 if(ready){positions[mode]=player.getCurrentTime()||0;player.pauseVideo();}
 mode=mode==='pujo'?'mahalaya':'pujo';wanted=resume;document.body.dataset.mode=mode;setPlaying(false);
 const dawn=mode==='mahalaya';
 $('mode-label').textContent=dawn?'Pujo':'Mahalaya';$('mode-toggle').setAttribute('aria-label',dawn?'Switch to Durga Puja':'Switch to Mahalaya');
 $('scene-title').textContent=dawn?'মহালয়া':'পুজো এসে গেছে।';
 $('intro-bn').textContent=dawn?'শিউলির গন্ধে, দেবীপক্ষের সূচনা।':'চেনা সুরে, ঘরে ফেরার টান।';
 $('scene-caption').textContent=dawn?'A MAHALAYA MORNING':'A PUJO EVENING';
 ['previous','next','shuffle','playlist-toggle'].forEach(id=>$(id).hidden=dawn);
 updateTrack();if(ready)loadCurrent();
});
let seeking=false;
$('seek').addEventListener('pointerdown',()=>{seeking=true;});
window.addEventListener('pointerup',()=>{seeking=false;});
window.addEventListener('pointercancel',()=>{seeking=false;});
$('seek').addEventListener('blur',()=>{seeking=false;});
$('seek').addEventListener('input',()=>{if(ready){const start=trackStart(),d=player.getDuration()-start;if(d>0){const fraction=Number($('seek').value)/1000;player.seekTo(start+fraction*d,true);$('elapsed').textContent=timeLabel(fraction*d);$('seek').style.setProperty('--progress',`${fraction*100}%`);}}});
setInterval(()=>{if(!ready||failed||!currentTrack().id)return;const start=trackStart(),d=player.getDuration()-start,t=Math.max(0,player.getCurrentTime()-start);if(d>0){$('duration').textContent=timeLabel(d);$('seek').disabled=false;if(!seeking){$('elapsed').textContent=timeLabel(t);$('seek').value=Math.floor(t/d*1000);$('seek').style.setProperty('--progress',`${t/d*100}%`);}}},500);

window.PujoPlayer={
 setSongs(nextSongs){
  const previousId=songs[songIndex]?.id;
  const previousIds=new Set(songs.map(song=>song.id));
  songs=nextSongs;playlistReady=true;
  const previousIndex=songs.findIndex(song=>song.id===previousId);
  songIndex=previousIndex>=0?previousIndex:Math.max(0,Math.min(songIndex,songs.length-1));
  if(shuffleEnabled){
   const validIds=new Set(songs.map(song=>song.id)),selectedId=songs[songIndex]?.id;
   shuffleQueue=shuffleQueue.filter(id=>validIds.has(id)&&id!==selectedId);
   shuffleHistory=shuffleHistory.filter(id=>validIds.has(id));
   const added=songs.filter(song=>!previousIds.has(song.id)&&song.id!==selectedId).map(song=>song.id);
   if(added.length)shuffleQueue=shuffled([...shuffleQueue,...added]);
  }
  if(mode!=='pujo')return;
  if(previousId!==currentTrack().id){
   positions.pujo=0;updateTrack();
   if(!songs.length){wanted=false;player?.pauseVideo();setPlaying(false);}
   else if(ready)loadCurrent();
  }else updateTrackDetails();
 },
 select(id){
  const index=songs.findIndex(song=>song.id===id);
  if(index<0||mode!=='pujo')return;
  if(!ready&&failed)resetUnreadyPlayer();
  if(shuffleEnabled&&id!==currentTrack().id){rememberSong(currentTrack().id);shuffleQueue=shuffleQueue.filter(queuedId=>queuedId!==id);}
  songIndex=index;positions.pujo=0;wanted=true;updateTrack();
  if(ready)loadCurrent();else if(!loading)initialize();
 },
 selection:()=>({id:mode==='pujo'?currentTrack().id:null,playing}),
 notice(message){if(mode==='pujo')status(message,true);}
};
updateTrack();
// Atmospheric light and suspended dust remain independent of audio playback.
const canvas=$('atmosphere'),ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused=reduced.matches,frameId=null,w=0,h=0,last=0,phase=0;
const motes=Array.from({length:38},()=>({x:Math.random(),y:Math.random(),r:.5+Math.random()*1.4,s:.05+Math.random()*.2,p:Math.random()*Math.PI*2}));
function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);if(motionPaused)paint(0);}
function paint(delta){phase+=delta*.001;ctx.clearRect(0,0,w,h);const dawn=mode==='mahalaya';for(const m of motes){m.y-=delta*.00001*m.s;m.x+=Math.sin(phase*.25+m.p)*delta*.000004;if(m.y<-.02)m.y=1.02;if(m.x<-.02)m.x=1.02;if(m.x>1.02)m.x=-.02;const alpha=(.18+(Math.sin(phase+m.p)+1)*.19)*(dawn?.6:1);ctx.fillStyle=dawn?`rgba(238,240,221,${alpha})`:`rgba(255,208,117,${alpha})`;ctx.shadowBlur=dawn?3:8;ctx.shadowColor=dawn?'#fffbe4':'#f6be62';ctx.beginPath();ctx.arc(m.x*w,m.y*h,m.r,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;}
function animate(time){if(motionPaused||document.hidden){frameId=null;return;}const delta=last?Math.min(time-last,40):16;last=time;paint(delta);frameId=requestAnimationFrame(animate);}
function setMotion(value){motionPaused=value;document.body.classList.toggle('motion-paused',value);if(value){if(frameId)cancelAnimationFrame(frameId);frameId=null;}else if(!frameId){last=0;frameId=requestAnimationFrame(animate);}}
reduced.addEventListener('change',e=>setMotion(e.matches));document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!motionPaused&&!frameId){last=0;frameId=requestAnimationFrame(animate);}});window.addEventListener('resize',resize);resize();setMotion(motionPaused);
