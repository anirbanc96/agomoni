'use strict';
(function(){
 // Use YouTube's supported playlist API in a separate, silent player.
 // Importing never changes the main player's song or playback position.
 window.PlaylistImport={async videos(id){
  if(!/^[\w-]{10,120}$/.test(id))throw new Error('This playlist link is invalid.');
  const YT=await window.YouTubeAPI.ready();
  return new Promise((resolve,reject)=>{
   const host=document.createElement('div');host.className='playlist-import-host';host.setAttribute('aria-hidden','true');host.inert=true;
   const frame=document.createElement('iframe');frame.width='200';frame.height='200';frame.title='YouTube playlist import';frame.tabIndex=-1;
   frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.setAttribute('allow','encrypted-media');
   const source=new URL('https://www.youtube-nocookie.com/embed/videoseries');
   for(const [key,value] of Object.entries({list:id,enablejsapi:1,origin:location.origin,autoplay:0,controls:0,playsinline:1}))source.searchParams.set(key,value);
   frame.src=source.href;host.appendChild(frame);document.body.appendChild(host);
   let importer,done=false,poll,timeout,stable=0,last='';
   const finish=(error,ids)=>{
    if(done)return;done=true;clearInterval(poll);clearTimeout(timeout);
    try{importer?.destroy();}catch{}host.remove();
    if(error)reject(error);else resolve(ids);
   };
   const inspect=()=>{
    if(done)return;
    const ids=importer?.getPlaylist?.();
    if(!Array.isArray(ids)||!ids.length)return;
    const valid=[...new Set(ids.filter(value=>typeof value==='string'&&/^[\w-]{11}$/.test(value)))];
    if(!valid.length)return;
    const signature=valid.join(',');
    stable=signature===last?stable+1:0;last=signature;
    if(stable>=2)finish(null,valid);
   };
   timeout=setTimeout(()=>finish(new Error('This playlist could not be imported. Use a public or unlisted playlist, or paste its song links.')),18000);
   try{
    importer=new YT.Player(frame,{host:'https://www.youtube-nocookie.com',events:{
     onReady:event=>{event.target.mute();event.target.cuePlaylist({listType:'playlist',list:id,index:0});},
     onStateChange:inspect,
     // Some playlists contain a restricted first video but still expose their list.
     onError:inspect
    }});
    poll=setInterval(inspect,400);
   }catch{finish(new Error('YouTube could not open this playlist. Please try again.'));}
  });
 }};
})();
