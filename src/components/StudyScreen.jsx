import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { computePositions, resolveMove } from "../utils/chess";
import { playSound } from "../utils/sound";
import { HAS_VOICE, useVoice } from "../utils/voice";
import { Board } from "./Board";
import { Btn } from "./Btn";

export function StudyScreen({variation,onBack,color}){
  const moves=variation.moves.split(" ").filter(Boolean);
  const positions=useMemo(()=>computePositions(moves),[variation.moves]);
  const[step,setStep]=useState(0);
  const[auto,setAuto]=useState(false);
  const[showArrow,setShowArrow]=useState(false);
  const[flipped,setFlipped]=useState(false);
  const[mode,setMode]=useState("study");
  const[quizActive,setQuizActive]=useState(null);
  const[quizAnswer,setQuizAnswer]=useState(null);
  const[score,setScore]=useState({correct:0,total:0});
  const[drillMsg,setDrillMsg]=useState(null); // {type:"correct"|"wrong"|"done",text}
  const[wrongSq,setWrongSq]=useState(null);
  const[drillWaiting,setDrillWaiting]=useState(false);
  const[drillErrors,setDrillErrors]=useState(0);
  const[hintSquares,setHintSquares]=useState(null); // {from:[r,c],to:[r,c]} flash correct move
  const ref=useRef(null);
  const drillTimer=useRef(null);
  const max=positions.length-1;
  const pos=positions[Math.min(step,max)];
  const moveIdx=step-1;
  const note=variation.notes?.[moveIdx];
  const[winSize,setWinSize]=useState(typeof window!=="undefined"?{w:window.innerWidth,h:window.innerHeight}:{w:520,h:800});
  useEffect(()=>{const h=()=>setWinSize({w:window.innerWidth,h:window.innerHeight});window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const isDesktop=winSize.w>=768;
  const bsz=isDesktop?Math.min(winSize.h-120,720):Math.min(winSize.w-16,560);
  useEffect(()=>{setStep(0);setAuto(false);setQuizActive(null);setQuizAnswer(null);setScore({correct:0,total:0});setDrillMsg(null);setWrongSq(null);setDrillWaiting(false);setDrillErrors(0);setHintSquares(null);},[variation]);
  useEffect(()=>{if(auto&&step<max){const hasNote=variation.notes?.[step];ref.current=setTimeout(()=>setStep(s=>s+1),hasNote?3500:1800);return()=>clearTimeout(ref.current);}if(step>=max)setAuto(false);},[auto,step,max]);
  // keyboard arrow keys for stepping (study/practice modes)
  useEffect(()=>{if(mode==="drill")return;const h=(e)=>{if(e.key==="ArrowLeft"){e.preventDefault();setStep(s=>Math.max(0,s-1));setQuizActive(null);setQuizAnswer(null);}else if(e.key==="ArrowRight"){e.preventDefault();setStep(s=>Math.min(max,s+1));}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[mode,max]);
  // In drill mode: flipped = playing black, !flipped = playing white
  // moves[0]=white, moves[1]=black, moves[2]=white...
  // step is the position index; move at step corresponds to moves[step] (0-indexed)
  // isPlayerTurn: when playing white, player moves at step 0,2,4... (even); playing black at 1,3,5... (odd)
  const isPlayerTurn=useCallback((s)=>{
    if(s>=max)return false;
    const moveIsWhite=s%2===0; // moves[s] is white's move (even index)
    return flipped?!moveIsWhite:moveIsWhite;
  },[max,flipped]);
  const handleDrillMove=useCallback((fr,fc,tr,tc)=>{
    if(drillWaiting||step>=max)return;
    const nextPos=positions[step+1];
    if(!nextPos||!nextPos.lastMove)return;
    const exp=nextPos.lastMove;
    if(fr===exp.from[0]&&fc===exp.from[1]&&tr===exp.to[0]&&tc===exp.to[1]){
      setStep(s=>s+1);setWrongSq(null);setDrillErrors(0);setHintSquares(null);
      setScore(s=>({correct:s.correct+1,total:s.total+1}));playSound("correct");
      const cheers=["太棒了！","真聪明！","好厉害！","答对啦！","没错！","你真棒！","厉害！"];
      setDrillMsg({type:"correct",text:cheers[Math.floor(Math.random()*cheers.length)]});
      // auto-play opponent's response after delay
      setDrillWaiting(true);
      drillTimer.current=setTimeout(()=>{
        setStep(s=>{
          if(s<max){setDrillMsg(null);return s+1;}
          setDrillMsg({type:"done",text:"全部完成！"});return s;
        });
        setDrillWaiting(false);
      },800);
    }else{
      setWrongSq([tr,tc]);playSound("wrong");
      setScore(s=>({...s,total:s.total+1}));
      setDrillErrors(n=>{
        const ne=n+1;
        const oops=["不对哦～","换一个试试！","再想想！"];
        if(ne>=1&&mode==="practice"){
          // practice mode: show note hint
          const noteHint=variation.notes?.[step];
          const hintText=noteHint?`💡 ${noteHint.s}`:oops[Math.floor(Math.random()*oops.length)];
          setDrillMsg({type:"wrong",text:hintText});
        }else if(ne>=1){
          // drill mode: only generic encouragement
          setDrillMsg({type:"wrong",text:oops[Math.floor(Math.random()*oops.length)]});
        }
        if(ne>=3&&mode==="drill"){
          // drill: flash correct squares after 3 wrong
          const nextPos=positions[step+1];
          if(nextPos?.lastMove){
            setHintSquares({from:nextPos.lastMove.from,to:nextPos.lastMove.to});
            setTimeout(()=>setHintSquares(null),2000);
          }
        }else if(ne>=2&&mode==="practice"){
          // practice: flash correct squares after 2 wrong
          const nextPos=positions[step+1];
          if(nextPos?.lastMove){
            setHintSquares({from:nextPos.lastMove.from,to:nextPos.lastMove.to});
            setTimeout(()=>setHintSquares(null),2000);
          }
        }
        return ne;
      });
      setTimeout(()=>setWrongSq(null),800);
    }
  },[step,max,positions,drillWaiting,moves,mode]);
  // Auto-play opponent's moves in drill/practice mode (including first move when playing black)
  useEffect(()=>{
    if((mode!=="drill"&&mode!=="practice")||step>=max||drillWaiting)return;
    if(!isPlayerTurn(step)){
      setDrillWaiting(true);
      drillTimer.current=setTimeout(()=>{
        setStep(s=>Math.min(s+1,max));
        setDrillWaiting(false);
        setDrillMsg(null);
      },step===0?500:800);
    }
  },[mode,step,max,drillWaiting,isPlayerTurn]);
  useEffect(()=>{
    if((mode==="drill"||mode==="practice")&&step>=max&&!drillWaiting){setDrillMsg({type:"done",text:"太棒了，全部完成！你是小棋王！"});}
  },[step,max,mode,drillWaiting]);
  useEffect(()=>()=>{clearTimeout(drillTimer.current);},[]);
  useEffect(()=>{if(mode==="practice"&&variation.quiz){const qi=variation.quiz.findIndex(q=>q.step===moveIdx);if(qi>=0&&quizActive!==qi){setQuizActive(qi);setQuizAnswer(null);}}},[step,mode,variation.quiz,moveIdx]);
  const activeQuiz=quizActive!==null?variation.quiz?.[quizActive]:null;
  const blocked=mode==="practice"&&activeQuiz&&quizAnswer===null;
  const goNext=useCallback(()=>{if(blocked)return;setStep(s=>Math.min(max,s+1));setQuizActive(null);setQuizAnswer(null);},[blocked,max]);
  const noteColor=note?.t==="bad"?"#c0392b":note?.t==="good"?"#27ae60":note?.t==="key"?"#2980b9":note?.t==="forced"?"#7f8c8d":"#e67e22";
  const noteIcon=note?.t==="bad"?"❌":note?.t==="good"?"✅":note?.t==="key"?"⭐":note?.t==="forced"?"⚡":"💡";
  const resetDrillState=useCallback(()=>{setStep(0);setScore({correct:0,total:0});setDrillMsg(null);setWrongSq(null);setDrillWaiting(false);setDrillErrors(0);setHintSquares(null);},[]);
  const modeResetProps={onClick:m=>()=>{setMode(m);resetDrillState();}};
  // Voice control
  const handleVoiceCmd=useCallback((cmd)=>{
    if(cmd.type==="nav"){
      if(cmd.cmd==="next"){if(mode==="study")setStep(s=>Math.min(max,s+1));}
      else if(cmd.cmd==="prev"){if(mode==="study")setStep(s=>Math.max(0,s-1));}
      else if(cmd.cmd==="start")resetDrillState();
      else if(cmd.cmd==="auto")setAuto(true);
      else if(cmd.cmd==="pause")setAuto(false);
      else if(cmd.cmd==="flip")setFlipped(f=>!f);
    }else if(cmd.type==="move"&&(mode==="drill"||mode==="practice")){
      // Resolve the voice move notation against current position
      const curFen=pos.fen;
      const result=resolveMove(curFen,cmd.notation);
      if(result){handleDrillMove(result.from[0],result.from[1],result.to[0],result.to[1]);}
      else{playSound("wrong");}
    }
  },[mode,max,pos.fen,handleDrillMove,resetDrillState]);
  const{listening,voiceText,toggle:toggleVoice}=useVoice(handleVoiceCmd);
  /* ---- shared sub-components ---- */
  const headerBar=<div style={{width:"100%",display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
    <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#888",padding:"2px 6px"}}>←</button>
    <div style={{flex:1}}><h3 style={{margin:0,fontSize:15,color:"#2d2d3a",fontWeight:800}}>{variation.name}</h3>
      {variation.result&&<span style={{fontSize:11,color:"#999",fontWeight:600}}>{variation.result==="1-0"?"白胜":variation.result==="0-1"?"黑胜":"学习变化"}</span>}</div>
    <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1.5px solid #ddd"}}>
      {["study","practice","drill"].map(m=><button key={m} onClick={modeResetProps.onClick(m)} style={{padding:"7px 14px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",background:mode===m?color:"#fff",color:mode===m?"#fff":"#666",transition:"all .15s"}}>{m==="study"?"📖 学习":m==="practice"?"🎯 跟练":"🎹 盲练"}</button>)}
    </div>
  </div>;
  const drillFeedback=(mode==="drill"||mode==="practice")&&<div style={{width:"100%",marginTop:8,minHeight:48,display:"flex",alignItems:"center",justifyContent:"center"}}>
    {drillMsg?<div style={{padding:"10px 20px",borderRadius:12,fontWeight:800,fontSize:16,animation:"fadeS .2s ease",
      background:drillMsg.type==="correct"?"#e8f8e8":drillMsg.type==="wrong"?"#fce8e8":"linear-gradient(135deg,#fffbe6,#fff3c4)",
      color:drillMsg.type==="correct"?"#1a7a3a":drillMsg.type==="wrong"?"#c0392b":"#b8860b",
      border:`2px solid ${drillMsg.type==="correct"?"#2ecc7150":drillMsg.type==="wrong"?"#e74c3c50":"#f5d44260"}`,
      boxShadow:drillMsg.type==="done"?"0 4px 16px rgba(245,212,66,.3)":"none"
    }}>{drillMsg.type==="correct"?"⭐ ":drillMsg.type==="wrong"?"💪 ":"🏆 "}{drillMsg.text}{drillMsg.type==="done"&&score.total>0?` ${score.correct}/${score.total}`:""}</div>
    :step===0?<div style={{fontSize:15,color:"#888",fontWeight:700}}>{mode==="practice"?"看着棋谱，":""}拖动{flipped?"黑":"白"}棋走出正确的开局！加油！💪</div>
    :<div style={{fontSize:15,color:"#888",fontWeight:700}}>轮到你走{flipped?"黑":"白"}棋啦～</div>}
  </div>;
  const resetDrill=()=>{setStep(0);setScore({correct:0,total:0});setDrillMsg(null);setWrongSq(null);setDrillWaiting(false);setDrillErrors(0);setHintSquares(null);};
  const micBtn=HAS_VOICE&&<Btn onClick={toggleVoice} accent={listening?"#e74c3c":undefined}>{listening?"🎤":"🎙️"}</Btn>;
  const voiceStatus=listening&&<div style={{width:"100%",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
    <span style={{width:8,height:8,borderRadius:"50%",background:"#e74c3c",animation:"hintPulse 0.5s ease-in-out infinite alternate"}}/>
    <span style={{fontSize:12,color:"#999",fontWeight:600}}>{voiceText||"语音识别中…说出棋步或指令"}</span>
  </div>;
  const controlBtns=<>{mode==="study"&&<div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
    <Btn onClick={()=>setStep(0)} disabled={step===0}>⏮</Btn>
    <Btn onClick={()=>{setStep(s=>Math.max(0,s-1));}} disabled={step===0}>◀</Btn>
    <Btn onClick={()=>setAuto(a=>!a)} accent={color}>{auto?"⏸":"▶"}</Btn>
    <Btn onClick={goNext} disabled={step>=max}>▶</Btn>
    <Btn onClick={()=>setStep(max)} disabled={step>=max}>⏭</Btn>
    <Btn onClick={()=>setFlipped(f=>!f)}>🔄</Btn>
    <Btn onClick={()=>setShowArrow(a=>!a)} accent={showArrow?color:undefined}>📍</Btn>
    {micBtn}
  </div>}
  {(mode==="drill"||mode==="practice")&&<div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap",justifyContent:"center"}}>
    <Btn onClick={resetDrill}>⏮</Btn>
    <Btn onClick={()=>setFlipped(f=>!f)}>🔄</Btn>
    <Btn onClick={()=>setShowArrow(a=>!a)} accent={showArrow?color:undefined}>📍</Btn>
    {micBtn}
  </div>}
  {voiceStatus}</>;
  const progressBar=<div style={{width:"100%",marginTop:6,height:4,borderRadius:2,background:"#e0dcd6",overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:color,width:`${max>0?(step/max)*100:0}%`,transition:"width .2s"}}/></div>;
  const moveList=<div style={{width:"100%",marginTop:8,background:"#fff",borderRadius:10,border:"1px solid #e8e4de",padding:"8px 12px",overflowX:"auto"}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:"2px 0",fontSize:13,fontWeight:600,lineHeight:1.8}}>
      {moves.map((m,idx)=>{const active=idx===moveIdx,wm=idx%2===0,mn=Math.floor(idx/2)+1;const n=variation.notes?.[idx];const nc=n?.t==="bad"?"#c0392b":n?.t==="good"?"#27ae60":n?.t==="key"?"#2980b9":null;const hidden=mode==="drill"&&idx>moveIdx;
      return <span key={idx}>{wm&&<span style={{color:"#bbb",fontSize:11,marginLeft:4}}>{mn}.</span>}
      <span onClick={()=>{if(!hidden){setStep(idx+1);setQuizActive(null);setQuizAnswer(null);}}} style={{cursor:hidden?"default":"pointer",padding:"1px 4px",borderRadius:4,background:active?color:"transparent",color:hidden?"transparent":active?"#fff":nc||"#444",transition:"all .15s",textDecorationLine:nc&&!active?"underline":"none",textDecorationStyle:"dotted",textUnderlineOffset:"3px"}}>{hidden?"???":m.replace(/[#]/g,"")}</span></span>;})}
    </div>
  </div>;
  const noteBox=note&&!blocked&&<div style={{width:"100%",marginTop:8,background:noteColor+"15",border:`2px solid ${noteColor}40`,borderRadius:12,padding:"12px 16px",fontSize:16,color:"#2d2d3a",lineHeight:1.7,animation:"fadeS .25s ease"}}><span style={{fontWeight:800,fontSize:18,marginRight:6}}>{noteIcon}</span><span style={{fontWeight:note.t==="bad"||note.t==="key"?800:600}}>{note.s}</span></div>;
  const quizBox=mode==="practice"&&activeQuiz&&<div style={{width:"100%",marginTop:8,background:"#fff",border:`2px solid ${color}`,borderRadius:12,padding:"14px 16px",animation:"fadeS .3s ease"}}>
    <div style={{fontWeight:800,fontSize:15,color:color,marginBottom:8}}>🤔 {activeQuiz.q}</div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {activeQuiz.opts.map((opt,oi)=>{const picked=quizAnswer!==null;const isAns=oi===activeQuiz.ans;const isCorrectPick=picked&&oi===activeQuiz.ans;const isWrongPick=picked&&quizAnswer===oi&&oi!==activeQuiz.ans;
      let bg="#f8f7f5",brd="#e0dcd6",col="#444";if(isCorrectPick){bg="#e8f8e8";brd="#2ecc71";col="#1a7a3a";}if(isWrongPick){bg="#fce8e8";brd="#e74c3c";col="#a02020";}if(picked&&isAns&&!isCorrectPick){bg="#e8f8e8";brd="#2ecc71";col="#1a7a3a";}
      return <button key={oi} onClick={()=>{if(picked)return;setQuizAnswer(oi);setScore(s=>({correct:s.correct+(oi===activeQuiz.ans?1:0),total:s.total+1}));}} style={{padding:"10px 14px",borderRadius:8,background:bg,border:`1.5px solid ${brd}`,cursor:picked?"default":"pointer",textAlign:"left",fontSize:14,fontWeight:700,color:col,transition:"all .15s"}}>{picked&&isAns?"✅ ":""}{picked&&isWrongPick?"❌ ":""}{opt}</button>;})}
    </div>
    {quizAnswer!==null&&<div style={{marginTop:8,padding:"10px 12px",borderRadius:8,background:quizAnswer===activeQuiz.ans?"#e8f8e8":"#fce8e8",fontSize:13,lineHeight:1.5}}><b>{quizAnswer===activeQuiz.ans?"🎉 答对了！":"😅 答错了..."}</b><br/>{activeQuiz.why}</div>}
    {quizAnswer!==null&&<button onClick={goNext} style={{marginTop:8,padding:"8px 20px",borderRadius:8,background:color,color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontSize:14}}>继续 →</button>}
  </div>;
  const lessonBox=step>=max&&variation.lesson&&<div style={{width:"100%",marginTop:8,background:"#fffbe6",border:"1.5px solid #f5d442",borderRadius:10,padding:"12px 14px",fontSize:14,lineHeight:1.6,animation:"fadeS .3s ease"}}><span style={{fontWeight:800,color:"#b8860b"}}>📚 核心要点：</span>{variation.lesson}</div>;
  const completionBox=step>=max&&<div style={{width:"100%",marginTop:10,display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",animation:"fadeS .3s ease"}}>
    {mode==="study"&&<button onClick={modeResetProps.onClick("drill")} style={{padding:"10px 20px",borderRadius:10,background:color,color:"#fff",border:"none",cursor:"pointer",fontWeight:800,fontSize:15}}>🎹 去盲练！</button>}
    {mode==="drill"&&<button onClick={()=>{setStep(0);setScore({correct:0,total:0});setDrillMsg(null);setWrongSq(null);setDrillWaiting(false);setDrillErrors(0);setHintSquares(null);}} style={{padding:"10px 20px",borderRadius:10,background:color,color:"#fff",border:"none",cursor:"pointer",fontWeight:800,fontSize:15}}>🔄 再来一次！</button>}
    <button onClick={onBack} style={{padding:"10px 20px",borderRadius:10,background:"#fff",color:"#666",border:"1.5px solid #ddd",cursor:"pointer",fontWeight:700,fontSize:14}}>📚 换一个开局</button>
  </div>;
  const scoreText=(mode==="practice"||mode==="drill")&&score.total>0&&<div style={{marginTop:8,fontSize:15,color:"#666",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>{"⭐".repeat(Math.min(score.correct,10))} {score.correct}/{score.total} {score.correct===score.total&&score.total>0?"🏆 全对！太厉害了！":score.correct/score.total>=0.8?"很棒！":""}</div>;
  const stepText=<div style={{marginTop:6,fontSize:12,color:"#bbb",fontWeight:600}}>{step===0?"起始局面":`第${Math.ceil(step/2)}回合 · ${step%2===1?"白":"黑"}方走棋`} · {step}/{max}</div>;
  const boardEl=<Board fen={pos.fen} size={bsz} lastMove={pos.lastMove} flipped={flipped} interactive={(mode==="drill"||mode==="practice")&&!drillWaiting&&step<max} playerWhite={!flipped} onMove={handleDrillMove} wrongSquare={wrongSq} showArrow={showArrow} hintSquares={hintSquares}/>;

  return <div style={{minHeight:"100vh",background:"linear-gradient(175deg,#faf9f6 0%,#ede9e3 100%)",fontFamily:"'Nunito',sans-serif",padding:isDesktop?"20px 32px 32px":"10px 8px 24px",display:"flex",flexDirection:"column",alignItems:"center"}}>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
    <div style={{width:"100%",maxWidth:bsz,display:"flex",flexDirection:"column",alignItems:"center"}}>
      {headerBar}{boardEl}{drillFeedback}{controlBtns}{progressBar}{moveList}{noteBox}{quizBox}{lessonBox}{completionBox}{scoreText}{stepText}
    </div>
    <style>{`@keyframes fadeS{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{transform:translate(var(--sx),var(--sy))}to{transform:translate(0,0)}}@keyframes hintPulse{from{opacity:0.3}to{opacity:0.6}}`}</style>
  </div>;
}
