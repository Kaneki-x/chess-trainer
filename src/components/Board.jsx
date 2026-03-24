import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { parseFEN, getLegalTargets } from "../utils/chess";
import { playSound } from "../utils/sound";
import { Pc } from "./Piece";
import { MoveArrow } from "./MoveArrow";

export function Board({fen,size=480,lastMove=null,flipped=false,interactive=false,playerWhite=true,onMove=null,wrongSquare=null,showArrow=true,hintSquares=null}){
  const{board,castling,ep}=parseFEN(fen);const sq=size/8;
  const boardRef=useRef(null);
  const[drag,setDrag]=useState(null); // {r,c,piece,x,y}
  const[selected,setSelected]=useState(null); // {r,c} for tap-to-move
  const prevFenRef=useRef(fen);
  const prevBoardRef=useRef(board);
  const[slideInfo,setSlideInfo]=useState(null);
  useEffect(()=>{
    if(prevFenRef.current===fen){setSlideInfo(null);prevFenRef.current=fen;prevBoardRef.current=board;return;}
    const pb=prevBoardRef.current;
    const gone=[], arrived=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const o=pb[r][c], n=board[r][c];
      if(o&&!n)gone.push({r,c,p:o});
      if(n&&n!==o)arrived.push({r,c,p:n});
    }
    // build slide list for all moved pieces (handles castling: king + rook)
    const slides=[];const isCapture=arrived.some(a=>!gone.find(x=>x.r===a.r&&x.c===a.c));
    for(const a of arrived){const g=gone.find(x=>x.p===a.p);if(g){slides.push({fromR:g.r,fromC:g.c,toR:a.r,toC:a.c});gone.splice(gone.indexOf(g),1);}}
    setSlideInfo(slides.length>0?slides:null);
    if(slides.length>0){playSound(isCapture?"capture":"move");setTimeout(()=>setSlideInfo(null),160);}
    setSelected(null); // clear selection on board change
    prevFenRef.current=fen;prevBoardRef.current=board;
  },[fen]);
  const isPlayerPiece=(p)=>p&&(playerWhite?p===p.toUpperCase():p===p.toLowerCase());
  const toBoard=(cx,cy)=>{const rect=boardRef.current?.getBoundingClientRect();if(!rect)return null;const x=cx-rect.left,y=cy-rect.top;const vc=Math.floor(x/sq),vi=Math.floor(y/sq);if(vc<0||vc>7||vi<0||vi>7)return null;return{r:flipped?7-vi:vi,c:flipped?7-vc:vc};};
  const pending=useRef(null); // {r,c,piece,startX,startY} — mousedown recorded but not yet dragging
  const handledByEnd=useRef(false); // prevent click firing after handleEnd
  const DRAG_THRESHOLD=5;
  const handleStart=(e,r,c)=>{if(!interactive)return;handledByEnd.current=false;const p=board[r][c];if(p&&isPlayerPiece(p)){const lt=getLegalTargets(board,r,c,castling,ep);if(lt.length===0)return;e.preventDefault();const t=e.touches?e.touches[0]:e;pending.current={r,c,piece:p,startX:t.clientX,startY:t.clientY};return;}// tapped on non-own square while piece is selected → treat as move target
    if(selected&&e.touches){e.preventDefault();handledByEnd.current=true;onMove&&onMove(selected.r,selected.c,r,c);setSelected(null);}};
  const handleMove=useCallback((e)=>{const t=e.touches?e.touches[0]:e;if(pending.current&&!drag){const dx=t.clientX-pending.current.startX,dy=t.clientY-pending.current.startY;if(Math.abs(dx)>DRAG_THRESHOLD||Math.abs(dy)>DRAG_THRESHOLD){e.preventDefault();const p=pending.current;setDrag({r:p.r,c:p.c,piece:p.piece,x:t.clientX,y:t.clientY});setSelected(null);pending.current=null;}return;}if(!drag)return;e.preventDefault();setDrag(d=>d?{...d,x:t.clientX,y:t.clientY}:null);},[drag]);
  const handleEnd=useCallback((e)=>{if(pending.current&&!drag){/* no drag happened = click-to-select */e.preventDefault();handledByEnd.current=true;const p=pending.current;pending.current=null;if(selected&&(selected.r!==p.r||selected.c!==p.c)){setSelected({r:p.r,c:p.c});}else if(selected&&selected.r===p.r&&selected.c===p.c){setSelected(null);}else{setSelected({r:p.r,c:p.c});}return;}if(!drag)return;e.preventDefault();handledByEnd.current=true;pending.current=null;const t=e.changedTouches?e.changedTouches[0]:e;const to=toBoard(t.clientX,t.clientY);if(to&&(to.r!==drag.r||to.c!==drag.c)&&onMove){onMove(drag.r,drag.c,to.r,to.c);setSelected(null);}setDrag(null);},[drag,onMove,selected]);
  const handleClick=(e,r,c)=>{if(!interactive||handledByEnd.current){handledByEnd.current=false;return;}if(selected){const p=board[r][c];if(p&&isPlayerPiece(p)){setSelected({r,c});}else if(isTarget(r,c)){onMove&&onMove(selected.r,selected.c,r,c);setSelected(null);}else{setSelected(null);/* click non-target = deselect */}}};
  useEffect(()=>{const mo=e=>handleMove(e);const up=e=>handleEnd(e);const cancel=()=>{pending.current=null;setDrag(null);};window.addEventListener("mousemove",mo);window.addEventListener("mouseup",up);window.addEventListener("touchmove",mo,{passive:false});window.addEventListener("touchend",up);window.addEventListener("touchcancel",cancel);document.addEventListener("mouseleave",cancel);return()=>{window.removeEventListener("mousemove",mo);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",mo);window.removeEventListener("touchend",up);window.removeEventListener("touchcancel",cancel);document.removeEventListener("mouseleave",cancel);};},[handleMove,handleEnd]);
  const activeRC=drag||selected;
  const targets=useMemo(()=>{if(!interactive||!activeRC)return[];return getLegalTargets(board,activeRC.r,activeRC.c,castling,ep);},[interactive,activeRC?.r,activeRC?.c,board,castling,ep]);
  const isTarget=(r,c)=>targets.some(t=>t[0]===r&&t[1]===c);
return <div ref={boardRef} style={{position:"relative",display:"inline-block",borderRadius:3,overflow:"hidden",boxShadow:"0 6px 28px rgba(0,0,0,.18)",border:"3px solid #302e2b",touchAction:"none"}}>
<div style={{display:"inline-grid",gridTemplateColumns:`repeat(8,${sq}px)`,gridTemplateRows:`repeat(8,${sq}px)`}}>
{Array(64).fill(0).map((_,i)=>{const vi=Math.floor(i/8),vc=i%8,r=flipped?7-vi:vi,c=flipped?7-vc:vc,lt=(r+c)%2===0;const lm=lastMove&&((lastMove.from[0]===r&&lastMove.from[1]===c)||(lastMove.to[0]===r&&lastMove.to[1]===c));const sel=selected&&selected.r===r&&selected.c===c;const wrong=wrongSquare&&wrongSquare[0]===r&&wrongSquare[1]===c;let bg=lt?"#ebecd0":"#779952";if(lm)bg=lt?"#f5f682":"#bbcc44";if(wrong)bg="#e74c3c88";
const isHint=hintSquares&&((hintSquares.from[0]===r&&hintSquares.from[1]===c)||(hintSquares.to[0]===r&&hintSquares.to[1]===c));
return <div key={i} style={{width:sq,height:sq,background:bg,position:"relative"}}>{sel&&<div style={{position:"absolute",inset:0,background:lt?"rgba(20,85,30,0.35)":"rgba(20,85,30,0.5)"}}/>}{isHint&&<div style={{position:"absolute",inset:0,background:"rgba(41,128,185,0.45)",animation:"hintPulse 0.6s ease-in-out infinite alternate"}}/>}</div>;})}</div>
{showArrow&&lastMove&&<svg style={{position:"absolute",top:0,left:0,width:sq*8,height:sq*8,pointerEvents:"none"}}><MoveArrow from={lastMove.from} to={lastMove.to} sq={sq} flipped={flipped} piece={lastMove.piece}/></svg>}
<div style={{position:"absolute",top:0,left:0,display:"inline-grid",gridTemplateColumns:`repeat(8,${sq}px)`,gridTemplateRows:`repeat(8,${sq}px)`}}>
{Array(64).fill(0).map((_,i)=>{const vi=Math.floor(i/8),vc=i%8,r=flipped?7-vi:vi,c=flipped?7-vc:vc,p=board[r][c],lt=(r+c)%2===0;
  const isDragging=drag&&drag.r===r&&drag.c===c;
  const tgt=isTarget(r,c);
  const hasEnemy=tgt&&p;
  const sl=slideInfo&&!drag&&slideInfo.find(s=>s.toR===r&&s.toC===c);
  const slideX=sl?((flipped?-(sl.fromC-sl.toC):(sl.fromC-sl.toC))*sq):0;
  const slideY=sl?((flipped?-(sl.fromR-sl.toR):(sl.fromR-sl.toR))*sq):0;
return <div key={i} onMouseDown={e=>handleStart(e,r,c)} onTouchStart={e=>handleStart(e,r,c)} onClick={e=>handleClick(e,r,c)} style={{width:sq,height:sq,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:interactive&&isPlayerPiece(p)?"grab":tgt||selected?"pointer":"default",opacity:isDragging?0.3:1}}>
{p&&<div style={sl?{animation:`slideIn 0.15s ease-out`,["--sx"]:slideX+"px",["--sy"]:slideY+"px"}:{}}><Pc p={p} sz={sq}/></div>}
{tgt&&!hasEnemy&&<div style={{position:"absolute",width:sq*0.28,height:sq*0.28,borderRadius:"50%",background:"rgba(0,0,0,0.12)"}}/>}
{hasEnemy&&<div style={{position:"absolute",width:sq*0.85,height:sq*0.85,borderRadius:"50%",border:`${sq*0.07}px solid rgba(0,0,0,0.12)`,boxSizing:"border-box"}}/>}
{vi===7&&<span style={{position:"absolute",bottom:1,right:2,fontSize:Math.max(9,sq*.16),color:lt?"#779952":"#ebecd0",fontWeight:800,fontFamily:"'Nunito',sans-serif",pointerEvents:"none"}}>{"abcdefgh"[c]}</span>}
{vc===0&&<span style={{position:"absolute",top:1,left:2,fontSize:Math.max(9,sq*.16),color:lt?"#779952":"#ebecd0",fontWeight:800,fontFamily:"'Nunito',sans-serif",pointerEvents:"none"}}>{8-r}</span>}
</div>;})}</div>
{drag&&<div style={{position:"fixed",left:drag.x-sq*0.55,top:drag.y-sq*0.55,width:sq*1.1,height:sq*1.1,pointerEvents:"none",zIndex:1000,filter:"drop-shadow(0 6px 12px rgba(0,0,0,.35))"}}><Pc p={drag.piece} sz={sq*1.1}/></div>}
</div>;}
