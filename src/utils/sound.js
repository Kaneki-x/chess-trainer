const audioCtx=typeof window!=="undefined"?new (window.AudioContext||window.webkitAudioContext)():null;

export function playSound(type){
  if(!audioCtx)return;if(audioCtx.state==="suspended")audioCtx.resume();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
  o.connect(g);g.connect(audioCtx.destination);
  if(type==="move"){o.type="sine";o.frequency.setValueAtTime(600,t);o.frequency.exponentialRampToValueAtTime(400,t+0.06);g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.08);o.start(t);o.stop(t+0.08);}
  else if(type==="capture"){o.type="triangle";o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(150,t+0.1);g.gain.setValueAtTime(0.18,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.12);o.start(t);o.stop(t+0.12);}
  else if(type==="wrong"){o.type="square";o.frequency.setValueAtTime(200,t);g.gain.setValueAtTime(0.08,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);o.start(t);o.stop(t+0.15);}
  else if(type==="correct"){o.type="sine";o.frequency.setValueAtTime(523,t);o.frequency.setValueAtTime(659,t+0.08);g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.18);o.start(t);o.stop(t+0.18);}
}
