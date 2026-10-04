export class GameAudio{
 private music:HTMLAudioElement|null=null;
 private sounds=new Set<HTMLAudioElement>();
 private crow:HTMLAudioElement|null=null;
 muted=false;musicEnabled=true;volume=.5;
 unlock(){if(!this.music){this.music=new Audio('./audio/music.mp3');this.music.loop=true;this.music.volume=.14*this.volume;}this.sync();}
 sync(){this.sounds.forEach(a=>{a.muted=this.muted;});if(!this.music)return;this.music.volume=.28*this.volume;this.music.muted=this.muted;if(!this.muted&&this.musicEnabled&&document.visibilityState==='visible')void this.music.play().catch(()=>{});else this.music.pause();}
 sfx(name:'spin'|'stop'|'win'|'crow'|'egg'|'impact'){if(this.muted||document.hidden||name==='crow'&&this.crow&&!this.crow.ended)return;const file=name==='egg'?'egg-crack':name==='impact'?'crate-impact':name==='win'?'win-chime':name;const a=new Audio('./audio/'+file+(name==='crow'?'.mp3':'.ogg'));a.playbackRate=1;if(name==='crow')this.crow=a;a.volume=this.volume*(name==='crow'?.72:.6);this.sounds.add(a);const release=()=>{this.sounds.delete(a);if(this.crow===a)this.crow=null;};a.onended=release;void a.play().catch(release);}
 pause(){this.music?.pause();this.sounds.forEach(a=>a.pause());this.sounds.clear();this.crow=null;}
 dispose(){this.pause();this.music=null;}
}
