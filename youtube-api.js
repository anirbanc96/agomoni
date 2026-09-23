'use strict';
(function(){
 let pending;
 window.YouTubeAPI={ready(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   let finished=false,timer;
   const prior=window.onYouTubeIframeAPIReady;
   const finish=error=>{
    if(finished)return;finished=true;clearTimeout(timer);
    if(error){pending=null;reject(error);}else resolve(window.YT);
   };
   window.onYouTubeIframeAPIReady=()=>{finish();if(typeof prior==='function')prior();};
   timer=setTimeout(()=>finish(new Error('YouTube could not connect. Please try again.')),20000);
   document.getElementById('youtube-api')?.remove();
   const script=document.createElement('script');script.id='youtube-api';script.src='https://www.youtube.com/iframe_api';
   script.onerror=()=>finish(new Error('YouTube could not connect. Please try again.'));
   document.head.appendChild(script);
  });
  return pending;
 }};
})();
