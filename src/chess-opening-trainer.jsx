import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ═══════════════ SOUND ═══════════════ */
const audioCtx=typeof window!=="undefined"?new (window.AudioContext||window.webkitAudioContext)():null;
function playSound(type){
  if(!audioCtx)return;if(audioCtx.state==="suspended")audioCtx.resume();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
  o.connect(g);g.connect(audioCtx.destination);
  if(type==="move"){o.type="sine";o.frequency.setValueAtTime(600,t);o.frequency.exponentialRampToValueAtTime(400,t+0.06);g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.08);o.start(t);o.stop(t+0.08);}
  else if(type==="capture"){o.type="triangle";o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(150,t+0.1);g.gain.setValueAtTime(0.18,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.12);o.start(t);o.stop(t+0.12);}
  else if(type==="wrong"){o.type="square";o.frequency.setValueAtTime(200,t);g.gain.setValueAtTime(0.08,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);o.start(t);o.stop(t+0.15);}
  else if(type==="correct"){o.type="sine";o.frequency.setValueAtTime(523,t);o.frequency.setValueAtTime(659,t+0.08);g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.18);o.start(t);o.stop(t+0.18);}
}

/* ═══════════════ PIECES ═══════════════ */
const pieceImg=(p)=>{
  const color=p===p.toUpperCase()?"w":"b";
  const name=p.toLowerCase();
  return `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${color}${name}.png`;
};
const Pc=({p,sz})=>{
  return <div style={{userSelect:"none",display:"flex",alignItems:"center",justifyContent:"center",width:sz,height:sz}}><img src={pieceImg(p)} alt={p} draggable={false} style={{width:sz*0.88,height:sz*0.88}} /></div>;
};
/* ═══════════════ CHESS ENGINE ═══════════════ */
const START="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const f2c=f=>f.charCodeAt(0)-97, r2r=r=>8-parseInt(r), c2f=c=>String.fromCharCode(97+c), r2R=r=>String(8-r);
function parseFEN(fen){const b=Array(8).fill(null).map(()=>Array(8).fill(null));const p=fen.split(" "),rows=p[0].split("/");for(let r=0;r<8;r++){let c=0;for(const ch of rows[r]){if(/\d/.test(ch))c+=parseInt(ch);else{b[r][c]=ch;c++;}}}return{board:b,turn:p[1]||"w",castling:p[2]||"-",ep:p[3]||"-"};}
function boardToFEN(b,t,ca,ep){let f="";for(let r=0;r<8;r++){let e=0;for(let c=0;c<8;c++){if(b[r][c]){if(e>0){f+=e;e=0;}f+=b[r][c];}else e++;}if(e>0)f+=e;if(r<7)f+="/";}return`${f} ${t} ${ca} ${ep} 0 1`;}
const clone=b=>b.map(r=>[...r]);
function getLegalTargets(b,fr,fc,castling,ep){
  const pc=b[fr][fc];if(!pc)return[];
  const w=isW(pc);const t=pc.toLowerCase();const targets=[];
  const own=(p)=>p&&(w?isW(p):!isW(p));
  const enemy=(p)=>p&&(w?!isW(p):isW(p));
  if(t==="p"){
    const d=w?-1:1,startR=w?6:1;
    // forward 1
    if(fr+d>=0&&fr+d<=7&&!b[fr+d][fc])  {targets.push([fr+d,fc]);
      // forward 2 from start
      if(fr===startR&&!b[fr+2*d][fc])targets.push([fr+2*d,fc]);}
    // diagonal captures
    for(const dc of[-1,1]){const nr=fr+d,nc=fc+dc;if(nr<0||nr>7||nc<0||nc>7)continue;
      if(enemy(b[nr][nc]))targets.push([nr,nc]);
      // en passant
      if(ep&&ep!=="-"){const ec=ep.charCodeAt(0)-97,er=8-parseInt(ep[1]);if(nr===er&&nc===ec)targets.push([nr,nc]);}}
  }else if(t==="n"){
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=fr+dr,nc=fc+dc;if(nr<0||nr>7||nc<0||nc>7)continue;if(!own(b[nr][nc]))targets.push([nr,nc]);}
  }else if(t==="k"){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=fr+dr,nc=fc+dc;if(nr<0||nr>7||nc<0||nc>7)continue;if(!own(b[nr][nc]))targets.push([nr,nc]);}
    // castling
    if(castling&&castling!=="-"){const r=w?7:0;
      if(fr===r&&fc===4){
        if(castling.includes(w?"K":"k")&&!b[r][5]&&!b[r][6]&&b[r][7]&&b[r][7].toLowerCase()==="r")targets.push([r,6]);
        if(castling.includes(w?"Q":"q")&&!b[r][3]&&!b[r][2]&&!b[r][1]&&b[r][0]&&b[r][0].toLowerCase()==="r")targets.push([r,2]);}}
  }else{
    const dirs=t==="b"?[[-1,-1],[-1,1],[1,-1],[1,1]]:t==="r"?[[-1,0],[1,0],[0,-1],[0,1]]:[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
    for(const[ddr,ddc]of dirs){for(let s=1;s<8;s++){const nr=fr+ddr*s,nc=fc+ddc*s;if(nr<0||nr>7||nc<0||nc>7)break;if(own(b[nr][nc]))break;targets.push([nr,nc]);if(enemy(b[nr][nc]))break;}}}
  return targets;
}
const isW=p=>p&&p===p.toUpperCase();
const isEn=(p,w)=>p&&(w?p===p.toLowerCase():p===p.toUpperCase());
function canReach(b,fr,fc,tr,tc,pc){const t=pc.toLowerCase(),w=isW(pc),dr=tr-fr,dc=tc-fc,adr=Math.abs(dr),adc=Math.abs(dc);if(t==="p"){const d=w?-1:1,s=w?6:1;if(dc===0&&!b[tr][tc]){if(dr===d)return true;if(fr===s&&dr===2*d&&!b[fr+d][fc])return true;}if(adc===1&&dr===d)return true;return false;}if(t==="n")return(adr===2&&adc===1)||(adr===1&&adc===2);if(t==="k")return adr<=1&&adc<=1;const dirs=t==="b"?[[-1,-1],[-1,1],[1,-1],[1,1]]:t==="r"?[[-1,0],[1,0],[0,-1],[0,1]]:[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];for(const[ddr,ddc]of dirs){for(let s=1;s<8;s++){const nr=fr+ddr*s,nc=fc+ddc*s;if(nr<0||nr>7||nc<0||nc>7)break;if(nr===tr&&nc===tc)return true;if(b[nr][nc])break;}}return false;}
function resolveMove(fen,mv){const{board:b,turn,castling:ca,ep}=parseFEN(fen);const w=turn==="w";let m=mv.replace(/[+#!?×x]/g,"").trim();
if(m==="O-O"||m==="0-0"){const r=w?7:0;const nb=clone(b);nb[r][6]=nb[r][4];nb[r][4]=null;nb[r][5]=nb[r][7];nb[r][7]=null;let nc=ca.replace(w?/[KQ]/g:/[kq]/g,"")||"-";return{board:nb,from:[r,4],to:[r,6],ca:nc,ep:"-"};}
if(m==="O-O-O"||m==="0-0-0"){const r=w?7:0;const nb=clone(b);nb[r][2]=nb[r][4];nb[r][4]=null;nb[r][3]=nb[r][0];nb[r][0]=null;let nc=ca.replace(w?/[KQ]/g:/[kq]/g,"")||"-";return{board:nb,from:[r,4],to:[r,2],ca:nc,ep:"-"};}
if(/^[a-h][a-h]$/.test(m)){const ff=f2c(m[0]),tf=f2c(m[1]),d=w?-1:1,pn=w?"P":"p";for(let r=0;r<8;r++){if(b[r][ff]!==pn)continue;const tr=r+d;if(tr<0||tr>7||Math.abs(tf-ff)!==1)continue;if(b[tr][tf]&&isEn(b[tr][tf],w)){const nb=clone(b);nb[tr][tf]=pn;nb[r][ff]=null;if(tr===0||tr===7)nb[tr][tf]=w?"Q":"q";return{board:nb,from:[r,ff],to:[tr,tf],ca,ep:"-"};}if(ep!=="-"){const ec=f2c(ep[0]),er=r2r(ep[1]);if(tr===er&&tf===ec){const nb=clone(b);nb[tr][tf]=pn;nb[r][ff]=null;nb[r][tf]=null;return{board:nb,from:[r,ff],to:[tr,tf],ca,ep:"-"};}}}return null;}
if(/^[a-h][a-h][1-8]$/.test(m)){const ff=f2c(m[0]),tf=f2c(m[1]),tr=r2r(m[2]),pn=w?"P":"p",fr=tr+(w?1:-1);if(fr>=0&&fr<=7&&b[fr][ff]===pn){const nb=clone(b);nb[tr][tf]=pn;nb[fr][ff]=null;if(tr===0||tr===7)nb[tr][tf]=w?"Q":"q";return{board:nb,from:[fr,ff],to:[tr,tf],ca,ep:"-"};}return null;}
if(/^[a-h][1-8]$/.test(m)){const tc=f2c(m[0]),tr=r2r(m[1]),pn=w?"P":"p",d=w?-1:1,s=w?6:1;let ne="-";if(b[tr-d]?.[tc]===pn&&!b[tr][tc]){const nb=clone(b);nb[tr][tc]=pn;nb[tr-d][tc]=null;if(tr===0||tr===7)nb[tr][tc]=w?"Q":"q";return{board:nb,from:[tr-d,tc],to:[tr,tc],ca,ep:ne};}if(b[tr-2*d]?.[tc]===pn&&tr-2*d===s&&!b[tr][tc]&&!b[tr-d][tc]){const nb=clone(b);nb[tr][tc]=pn;nb[s][tc]=null;ne=c2f(tc)+r2R(tr-d);return{board:nb,from:[s,tc],to:[tr,tc],ca,ep:ne};}return null;}
if(/^[KQRBN]/.test(m)){const pt=m[0],rest=m.slice(1),dest=rest.slice(-2),dis=rest.slice(0,-2);const tc=f2c(dest[0]),tr=r2r(dest[1]),pc=w?pt:pt.toLowerCase();for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(b[r][c]!==pc)continue;if(!canReach(b,r,c,tr,tc,pc))continue;if(dis.length===1){if(/[a-h]/.test(dis)&&c!==f2c(dis))continue;if(/[1-8]/.test(dis)&&r!==r2r(dis))continue;}else if(dis.length===2){if(c!==f2c(dis[0])||r!==r2r(dis[1]))continue;}const nb=clone(b);nb[tr][tc]=pc;nb[r][c]=null;let nc=ca;if(pt==="K")nc=nc.replace(w?/[KQ]/g:/[kq]/g,"");if(pt==="R"){if(w&&r===7&&c===7)nc=nc.replace("K","");if(w&&r===7&&c===0)nc=nc.replace("Q","");if(!w&&r===0&&c===7)nc=nc.replace("k","");if(!w&&r===0&&c===0)nc=nc.replace("q","");}if(nc==="")nc="-";return{board:nb,from:[r,c],to:[tr,tc],ca:nc,ep:"-"};}return null;}
return null;}
function computePositions(moves){const pos=[{fen:START,lastMove:null}];let cur=START;for(let i=0;i<moves.length;i++){const prev=parseFEN(cur);const r=resolveMove(cur,moves[i]);if(!r)break;const piece=prev.board[r.from[0]][r.from[1]];const nt=i%2===0?"b":"w";const nf=boardToFEN(r.board,nt,r.ca,r.ep);pos.push({fen:nf,lastMove:{from:r.from,to:r.to,piece}});cur=nf;}return pos;}

/* ═══════════════ OPENING DATA (verified from Excel) ═══════════════ */
const DATA=[
{cat:"mistakes",name:"开局陷阱",icon:"⚠️",color:"#d35400",desc:"经典开局错误和陷阱",vars:[
{name:"错误1（傻瓜斜线）",moves:"f4 e6 g4 Qh4#",result:"0-1",notes:{0:{t:"bad",s:"f4是一步弱棋，虽然控制了e5，但打开了e1-h4斜线，暴露了王的安全"},1:{t:"idea",s:"e6准备出动象，同时打开了后通往h4的路线"},2:{t:"bad",s:"g4大错！白方贪心推兵，完全忽略了王的安全，e1-h4斜线彻底暴露"},3:{t:"key",s:"黑后直接将杀！白王无处可逃，这就是'傻瓜斜线'陷阱——开局不能乱推王前兵"},},lesson:""},
{name:"错误2",moves:"e4 e5 Qh5 Ke7 Qe5#",result:"1-0",notes:{0:{t:"idea",s:"e4占据中心，是最常见的开局第一步"},1:{t:"idea",s:"e5对称应对，争夺中心控制权"},2:{t:"bad",s:"后过早出动到h5，虽然威胁f7，但后太早出来容易被对方小子攻击"},3:{t:"bad",s:"Ke7大错！王不应该走出来挡路，应该走Nc6或Qe7防守"},4:{t:"key",s:"白后吃e5将杀！黑王走到e7失去了易位权利，又挡住了自己棋子的防守"},},lesson:""},
{name:"错误3",moves:"e4 e5 Bc4 Bc5 Qh5 Nc6 Qf7#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心d5和f5两个格子"},1:{t:"idea",s:"e5对称回应，控制d4和f4"},2:{t:"idea",s:"象出到c4，瞄准黑方最弱的f7兵——f7只有黑王保护"},3:{t:"idea",s:"象出到c5，同样瞄准白方f2，也发展子力"},4:{t:"bad",s:"后过早出到h5，同时威胁f7和e5两个目标"},5:{t:"idea",s:"马出到c6保护e5兵，但忽略了f7的威胁"},6:{t:"key",s:"Qxf7将杀！后在f7不可阻挡，黑王被困死。教训：要注意f7弱点的防守"},},lesson:""},
{name:"错误4",moves:"e4 e5 Bc4 Bc5 Qf3 Nh6 d4 Bd4 Bh6 Bb2 Qf7#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Bc4瞄准f7弱点"},3:{t:"idea",s:"Bc5对称发展，也瞄准f2"},4:{t:"idea",s:"Qf3白后出动，同时瞄准f7，与象形成联合攻击"},5:{t:"bad",s:"Nh6不是好位置，马在边上力量弱。应该走Nf6守住中心"},6:{t:"idea",s:"d4推进中心，打开局面，同时攻击黑象"},7:{t:"bad",s:"Bxd4吃兵贪心，黑象离开了防守位置"},8:{t:"idea",s:"Bxh6吃掉黑马，消除王翼防守力量"},9:{t:"bad",s:"Bxb2贪吃车前兵，但忽略了f7的致命威胁"},10:{t:"key",s:"Qxf7将杀！白后和象联手在f7形成致命攻击。教训：不能贪吃子忽略王的安全"},},lesson:""},
{name:"错误5",moves:"d4 Nf6 c4 e5 d5 Bc5 Bg5 Ne4 Bd8 Bf2#",result:"0-1",notes:{0:{t:"idea",s:"d4控制中心，是后兵开局"},1:{t:"idea",s:"Nf6发展马，攻击e4格"},2:{t:"idea",s:"c4英格兰式，进一步控制d5中心"},3:{t:"idea",s:"e5黑方抢占中心空间"},4:{t:"bad",s:"d5推进但把中心关闭了，给了黑方c5的反击机会"},5:{t:"idea",s:"Bc5象出到活跃位置，瞄准f2"},6:{t:"bad",s:"Bg5钉住黑马，但忽略了黑象对f2的威胁"},7:{t:"idea",s:"Ne4！马跳入白方阵地，利用白象离开防守的机会"},8:{t:"bad",s:"Bxd8贪吃黑后，但中了圈套！"},9:{t:"key",s:"Bxf2将杀！黑象和马配合将杀白王。白方虽然吃了后但被将死——子力价值不等于安全"},},lesson:""},
{name:"错误6",moves:"d4 c5 d5 Na6 Nf3 d6 e4 Bg4 Ne5 Qa5+ Bd2 de Ba5 Bd1 Bb5#",result:"1-0",notes:{0:{t:"idea",s:"d4中心开局"},1:{t:"idea",s:"c5西西里式应对，从侧面争夺中心"},2:{t:"idea",s:"d5推进中心兵，占据空间"},3:{t:"idea",s:"Na6马出到边上不理想，但准备跳回c7或b4"},4:{t:"idea",s:"Nf3发展马，控制中心"},5:{t:"idea",s:"d6稳固阵型，给子力发展留空间"},6:{t:"idea",s:"e4建立强大中心双兵"},7:{t:"idea",s:"Bg4象钉住白马，想削弱白方对中心的控制"},8:{t:"idea",s:"Ne5！马跳到强力前哨，攻击黑象同时威胁f7"},9:{t:"bad",s:"Qa5+将军看似主动，但浪费了宝贵的发展时间"},10:{t:"idea",s:"Bd2挡住将军，同时发展子力"},11:{t:"idea",s:"dxe4吃兵，打开局面"},12:{t:"idea",s:"Bxa5吃掉黑后！黑方之前的将军反而丢了后"},13:{t:"idea",s:"Bxd1吃掉白后，试图挽回损失"},14:{t:"key",s:"Bb5将杀！白象在b5将军，黑王无处可逃。陷阱完成"},},lesson:""},
{name:"错误7",moves:"e4 b6 d4 Bb7 Bd3 f5 ef Bg2 Qh5+ g6 fg Nf6 gh+ Nh5 Bg6#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"bad",s:"b6欧文防御，想侧翼出象，但太慢了"},2:{t:"idea",s:"d4白方趁机抢占中心"},3:{t:"idea",s:"Bb7象放到大斜线，控制对角线"},4:{t:"idea",s:"Bd3发展象，控制王翼"},5:{t:"bad",s:"f5？冒险的反击，打开了王翼，非常危险"},6:{t:"idea",s:"exf5吃兵，打开f线"},7:{t:"bad",s:"Bxg2贪吃兵，但忽略了王翼已经千疮百孔"},8:{t:"key",s:"Qh5+将军！白后利用打开的斜线攻击，黑王危险了"},9:{t:"forced",s:"g6被迫挡住，但兵阵被破坏"},10:{t:"idea",s:"fxg6白兵继续推进，打开更多进攻线路"},11:{t:"idea",s:"Nf6发展马防守，但已经太晚了"},12:{t:"idea",s:"gxh7+兵推到h7将军，逼迫黑方应对"},13:{t:"forced",s:"Nxh5只能吃掉白后，但代价很大"},14:{t:"key",s:"Bg6将杀！白象在g6将军，黑王被围住无路可逃"},},lesson:""},
{name:"错误8",moves:"e4 e5 Nc3 Nf6 Bc4 Ne4 Qh5 Nd6 Bb3 Nc6 d4 ed Nd5 g6 Qe2+ Be7 Nf6+ Kf8 Bh6#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nc3发展马，保护e4兵"},3:{t:"idea",s:"Nf6攻击e4兵"},4:{t:"idea",s:"Bc4瞄准f7弱点"},5:{t:"bad",s:"Nxe4贪吃中心兵，但马深入敌阵很危险"},6:{t:"idea",s:"Qh5！后出动，同时威胁f7和e4上的黑马"},7:{t:"forced",s:"Nd6马被迫后退，还挡住了自己的子力"},8:{t:"idea",s:"Bb3象退回安全位置，保持对f7的压力"},9:{t:"idea",s:"Nc6发展马"},10:{t:"idea",s:"d4打开中心，争夺空间"},11:{t:"idea",s:"exd4吃掉中心兵"},12:{t:"key",s:"Nd5！马跳到中心最强位置，威胁c7和f6"},13:{t:"forced",s:"g6挡住白后，但破坏了王翼兵形"},14:{t:"idea",s:"Qe2+将军，迫使黑方应对"},15:{t:"forced",s:"Be7挡住将军"},16:{t:"key",s:"Nf6+！马叉将军，攻击黑王和后"},17:{t:"forced",s:"Kf8王只能躲到f8"},18:{t:"key",s:"Bh6将杀！象封住了王的退路。教训：不要贪吃子"},},lesson:""},
{name:"错误9",moves:"e4 e6 d4 d5 ed ed Nf3 Bd6 c4 Ne7 c5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御，稳固但限制了白格象"},2:{t:"idea",s:"d4建立中心双兵"},3:{t:"idea",s:"d5黑方挑战白方中心"},4:{t:"idea",s:"exd5兑换中心兵"},5:{t:"idea",s:"exd5用兵吃回，中心对称"},6:{t:"idea",s:"Nf3发展马"},7:{t:"bad",s:"Bd6象虽然发展了，但挡住了d兵的去路，限制了后翼发展"},8:{t:"idea",s:"c4！白方利用黑象位置不佳，攻击d5兵"},9:{t:"idea",s:"Ne7马只能放到不理想的e7位置"},10:{t:"key",s:"c5！推进后黑象被困住，白方空间优势明显。教训：象不要挡住自己的兵"},},lesson:""},
{name:"错误10",moves:"d4 Nf6 Nf3 c5 Bf4 cd Nd4 e5 Be5 Qa5+",result:"",notes:{0:{t:"idea",s:"d4中心开局"},1:{t:"idea",s:"Nf6发展马，是最灵活的应对"},2:{t:"idea",s:"Nf3发展马，保护d4"},3:{t:"idea",s:"c5挑战白方中心d4兵"},4:{t:"bad",s:"Bf4出象看似自然，但过早让象暴露在外"},5:{t:"idea",s:"cxd4吃掉中心兵"},6:{t:"bad",s:"Nxd4马虽然占据中心，但位置不稳固"},7:{t:"idea",s:"e5！推兵同时攻击白马和白象，一石二鸟"},8:{t:"bad",s:"Bxe5？吃兵是个陷阱"},9:{t:"key",s:"Qa5+将军！黑后将军的同时攻击无保护的e5白象，白方必丢一子。教训：要注意双重攻击"},},lesson:""},
{name:"错误11",moves:"e4 e6 d4 d5 Nc3 de Ne4 Nd7 Nf3 Nf6 Ng5 Be7 Nf7 Kf7 Ng5+ Kg8 Ne6 Qe8 Nc7 Bb4#",result:"0-1",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4建立中心"},3:{t:"idea",s:"d5挑战中心"},4:{t:"idea",s:"Nc3保护e4"},5:{t:"idea",s:"dxe4吃掉中心兵，打开局面"},6:{t:"idea",s:"Nxe4马占领中心"},7:{t:"idea",s:"Nd7稳健发展，准备Ngf6"},8:{t:"idea",s:"Nf3发展王翼马"},9:{t:"idea",s:"Nf6发展马，准备易位"},10:{t:"bad",s:"Ng5白双马跳到g5，集中攻击f7，但过于急躁"},11:{t:"idea",s:"Be7发展象，准备易位"},12:{t:"idea",s:"Nxf7抢攻f7弱点，吃掉兵"},13:{t:"forced",s:"Kxf7被迫用王吃"},14:{t:"idea",s:"Ng5+马将军，继续攻击"},15:{t:"forced",s:"Kg8王退回安全位置"},16:{t:"idea",s:"Ne6马深入攻击，叉住后和c7"},17:{t:"forced",s:"Qe8后只能到e8"},18:{t:"bad",s:"Nc7贪心叉车和后，但忽略了黑方的反击"},19:{t:"key",s:"Bb4将杀！黑象将军，白王无处可逃。白方虽然子力多，但王位不安全被反杀"},},lesson:""},
{name:"错误12",moves:"e4 c6 d4 d5 Nc3 de Ne4 Nf6 Qd3 e6 Nf3 Be7 Ne5 Bd7 Nf7 Kf7 Ng5+ Kg8 Ne6 Qe8 Nc7 Bb4++ Kd1 Qe1#",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"c6卡罗-卡恩防御，准备d5挑战中心"},2:{t:"idea",s:"d4建立中心双兵"},3:{t:"idea",s:"d5挑战白方中心"},4:{t:"idea",s:"Nc3保护e4"},5:{t:"idea",s:"dxe4吃掉中心兵"},6:{t:"idea",s:"Nxe4夺回中心"},7:{t:"idea",s:"Nf6出马攻击白方中心马"},8:{t:"idea",s:"Qd3后出来保护马，避免兑换"},9:{t:"idea",s:"e6给象让出发展空间"},10:{t:"idea",s:"Nf3继续发展"},11:{t:"idea",s:"Be7发展象准备易位"},12:{t:"idea",s:"Ne5马占领强力前哨"},13:{t:"idea",s:"Bd7发展象"},14:{t:"idea",s:"Nxf7牺牲马抢攻f7"},15:{t:"forced",s:"Kxf7被迫吃马"},16:{t:"idea",s:"Ng5+马将军继续攻击"},17:{t:"forced",s:"Kg8王退回"},18:{t:"idea",s:"Ne6马深入敌阵"},19:{t:"forced",s:"Qe8防守"},20:{t:"idea",s:"Nc7叉后和车"},21:{t:"key",s:"Bb4双将！象将军的同时暴露了后对白王的攻击线"},22:{t:"forced",s:"Kd1王只能躲到d1"},23:{t:"key",s:"Qe1将杀！黑方用反攻将杀白王，白方攻击虽猛但后方空虚"},},lesson:""},
{name:"错误13",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Qh4 Nc3 Nf6 Nf5 Qh5 Be2 Qg6 Nh4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5兵，发展马"},3:{t:"idea",s:"Nc6保护e5兵"},4:{t:"idea",s:"d4打开中心，进入苏格兰开局"},5:{t:"idea",s:"exd4吃掉中心兵"},6:{t:"idea",s:"Nxd4马占领中心"},7:{t:"bad",s:"Qh4过早出后，虽然攻击e4但很容易被追赶"},8:{t:"idea",s:"Nc3发展马同时保护e4"},9:{t:"idea",s:"Nf6发展马攻击e4"},10:{t:"idea",s:"Nf5！马跳到强力位置，攻击黑后"},11:{t:"forced",s:"Qh5后被迫后退"},12:{t:"idea",s:"Be2准备赶走黑后"},13:{t:"forced",s:"Qg6后只能退到g6"},14:{t:"key",s:"Nh4！白马叉住黑后，后无好的退路。教训：后太早出来容易被追着打"},},lesson:""},
{name:"错误14",moves:"e4 e6 d4 d5 Nd2 de Ne4 Bd7 Nf3 Bc6 Bd3 Nf6 Nf6+ Qf6 Bg5 Bf3 Qd2 Qd4 Bb5+",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4中心推进"},3:{t:"idea",s:"d5挑战中心"},4:{t:"idea",s:"Nd2塔拉什变例，保护e4但堵住了白格象"},5:{t:"idea",s:"dxe4吃掉中心兵"},6:{t:"idea",s:"Nxe4夺回中心"},7:{t:"idea",s:"Bd7发展象"},8:{t:"idea",s:"Nf3继续发展"},9:{t:"idea",s:"Bc6象到活跃位置"},10:{t:"idea",s:"Bd3发展象"},11:{t:"idea",s:"Nf6出马"},12:{t:"idea",s:"Nxf6+兑换马，打开局面"},13:{t:"idea",s:"Qxf6用后吃回"},14:{t:"idea",s:"Bg5钉住黑后"},15:{t:"bad",s:"Bxf3？吃白马看似好棋，但忽略了对角线上的危险"},16:{t:"idea",s:"Qxd2？不急着吃回"},17:{t:"bad",s:"Qxd4黑后贪吃中心兵"},18:{t:"key",s:"Bb5+！白象将军，同时黑后失去保护。黑方贪吃丢子"},},lesson:""},
{name:"错误15",moves:"e4 e6 d4 d5 Nc3 de Ne4 b6 Nf3 Bb7 Bb5+ Nd7 Ne5 Bc8 Bg5 Nf6 Nc6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4中心推进"},3:{t:"idea",s:"d5挑战中心"},4:{t:"idea",s:"Nc3保护e4"},5:{t:"idea",s:"dxe4吃中心兵"},6:{t:"idea",s:"Nxe4夺回"},7:{t:"idea",s:"b6准备侧翼出象"},8:{t:"idea",s:"Nf3发展马"},9:{t:"idea",s:"Bb7象到大斜线"},10:{t:"idea",s:"Bb5+将军，打乱黑方发展节奏"},11:{t:"forced",s:"Nd7挡住将军"},12:{t:"idea",s:"Ne5马到强力前哨"},13:{t:"bad",s:"Bc8？象退回原位，浪费了两步发展时间"},14:{t:"idea",s:"Bg5出象牵制"},15:{t:"idea",s:"Nf6发展马"},16:{t:"key",s:"Nc6！马叉王和后，黑方因为浪费步数，子力发展落后被抓住破绽"},},lesson:""},
{name:"错误16",moves:"e4 d5 ed Qd5 Nc3 Qa5 Nf3 Bg4 h3 Bf3 Qf3 Nc6 Bb5 Qb6 Nd5 Qa5 b4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"d5中心对称防御，直接挑战e4"},2:{t:"idea",s:"exd5吃掉黑兵"},3:{t:"bad",s:"Qxd5后虽然夺回兵，但过早出后"},4:{t:"idea",s:"Nc3出马同时攻击黑后，后被迫浪费时间"},5:{t:"forced",s:"Qa5后退到a5，已经浪费了一步"},6:{t:"idea",s:"Nf3继续发展"},7:{t:"idea",s:"Bg4钉住白马，想限制白方发展"},8:{t:"idea",s:"h3赶走黑象"},9:{t:"idea",s:"Bxf3被迫兑换"},10:{t:"idea",s:"Qxf3白后活跃，控制中心和对角线"},11:{t:"idea",s:"Nc6发展马"},12:{t:"idea",s:"Bb5象钉住黑马"},13:{t:"bad",s:"Qb6？后又移动，浪费宝贵的发展时间"},14:{t:"idea",s:"Nd5！马跳入中心，叉住黑后和c7"},15:{t:"key",s:"Qa5退后也没用，白方接下来b4追后，黑后无好位置。教训：后太早出来反复被追"},},lesson:""},
{name:"错误17",moves:"e4 d5 ed Qd5 Nc3 Qa5 d4 e5 Qe2 Nc6 d5 Bb4 Qc4 Nd4 Bd3 b5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"d5直接挑战"},2:{t:"idea",s:"exd5吃兵"},3:{t:"bad",s:"Qxd5后吃回兵但过早出后"},4:{t:"idea",s:"Nc3攻击黑后"},5:{t:"forced",s:"Qa5后退到a5"},6:{t:"idea",s:"d4占据中心"},7:{t:"idea",s:"e5黑方试图反击中心"},8:{t:"idea",s:"Qe2白后出到e2，保护e线"},9:{t:"idea",s:"Nc6发展马"},10:{t:"idea",s:"d5用兵推进，赶走黑马"},11:{t:"idea",s:"Bb4钉住白马，黑方试图反击"},12:{t:"idea",s:"Qc4攻击黑象同时瞄准c7"},13:{t:"bad",s:"Nxd4马吃兵看似赚了，但落入陷阱"},14:{t:"key",s:"b5！白方弃兵让象和后联合攻击，黑马和后都受到攻击，黑方局面崩溃"},},lesson:""},
{name:"错误18",moves:"d4 Nf6 Nd2 e5 de Ng4 h3 Ne3",result:"",notes:{0:{t:"idea",s:"d4中心开局"},1:{t:"idea",s:"Nf6发展马"},2:{t:"bad",s:"Nd2？马放到d2不好，堵住了白格象和后的出路"},3:{t:"idea",s:"e5抢占中心，趁白方发展缓慢"},4:{t:"idea",s:"dxe5吃掉黑兵"},5:{t:"idea",s:"Ng4马瞄准e3和f2两个弱点"},6:{t:"bad",s:"h3？试图赶走黑马，但忽略了e3的致命威胁"},7:{t:"key",s:"Ne3！马叉王和后，白方大亏。教训：Nd2堵住了自己子力的出路"},},lesson:""},
{name:"错误19",moves:"e4 c5 Nf3 Nc6 d4 cd Nd4 e5 Nf5 Ne7 Nd6#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"c5西西里防御，从侧面挑战中心"},2:{t:"idea",s:"Nf3发展马"},3:{t:"idea",s:"Nc6发展马"},4:{t:"idea",s:"d4打开中心"},5:{t:"idea",s:"cxd4吃掉中心兵"},6:{t:"idea",s:"Nxd4马占领中心"},7:{t:"idea",s:"e5推兵攻击白马"},8:{t:"bad",s:"Nf5？看似强力位置，但走错了格子"},9:{t:"idea",s:"Ne7？黑方想赶走白马"},10:{t:"key",s:"Nd6将杀！白马在d6将杀，被e5兵和f5位置保护，黑王无处可逃。这叫'闷杀'"},},lesson:""},
{name:"错误20",moves:"e4 c6 d4 d5 Nc3 de Ne4 Nd7 Qe2 Nf6 Nd6#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"c6卡罗-卡恩防御"},2:{t:"idea",s:"d4中心双兵"},3:{t:"idea",s:"d5挑战中心"},4:{t:"idea",s:"Nc3保护e4"},5:{t:"idea",s:"dxe4吃兵"},6:{t:"idea",s:"Nxe4夺回中心"},7:{t:"idea",s:"Nd7发展马"},8:{t:"idea",s:"Qe2后出到e2线上，控制e线"},9:{t:"idea",s:"Nf6出马想赶走白方中心马"},10:{t:"key",s:"Nd6将杀！和错误19一样的闷杀，白马在d6将军，黑王被自己的子力围住无法逃跑"},},lesson:""},
{name:"错误21",moves:"d4 Nf6 c4 e5 de Ng4 Nf3 Nc6 Bf4 Bb4+ Nd2 Qe7 a3 Ne5 ab Nd3#",result:"0-1",notes:{0:{t:"idea",s:"d4中心开局"},1:{t:"idea",s:"Nf6发展马"},2:{t:"idea",s:"c4后兵开局，控制d5"},3:{t:"idea",s:"e5反击中心"},4:{t:"idea",s:"dxe5吃掉黑兵"},5:{t:"idea",s:"Ng4马跳向前，瞄准e3和f2弱点"},6:{t:"idea",s:"Nf3发展马，保护关键格子"},7:{t:"idea",s:"Nc6发展马"},8:{t:"idea",s:"Bf4出象"},9:{t:"idea",s:"Bb4+将军，打乱白方阵型"},10:{t:"forced",s:"Nd2挡住将军"},11:{t:"idea",s:"Qe7后出到e线，准备反击"},12:{t:"idea",s:"a3赶走黑象"},13:{t:"idea",s:"Nxe5白马试图稳固，但e5位置不安全"},14:{t:"idea",s:"axb4吃掉黑象"},15:{t:"key",s:"Nd3将杀！黑马在d3将杀，白王被困在e1无路可逃。'闷杀'又一个例子"},},lesson:""},
{name:"错误22",moves:"e4 e5 d4 Nf6 de Ne4 Nf3 Bc5 Qd5 Nf2 Bc4 0-0 Ng5 Nh1 Nf7 c6 Nh6++ Kh8 Qg8+ Rg8 Nf7#",result:"1-0",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"d4打开中心"},3:{t:"idea",s:"Nf6发展马"},4:{t:"idea",s:"dxe5吃兵"},5:{t:"bad",s:"Nxe4？马吃兵深入敌阵很危险"},6:{t:"idea",s:"Nf3发展马"},7:{t:"idea",s:"Bc5出象瞄准f2"},8:{t:"idea",s:"Qd5攻击黑马和f7"},9:{t:"idea",s:"Nxf2反击，叉住车和王"},10:{t:"idea",s:"Bc4出象加强攻击"},11:{t:"idea",s:"O-O黑方赶紧易位保护王"},12:{t:"idea",s:"Ng5白马跳向王翼进攻"},13:{t:"idea",s:"Nxh1黑马吃掉白车"},14:{t:"idea",s:"Nxf7白马攻入f7"},15:{t:"idea",s:"c6挡住白后"},16:{t:"key",s:"Nh6双将！马和后同时将军，黑王必须移动"},17:{t:"forced",s:"Kh8王躲到角落"},18:{t:"idea",s:"Qg8+后将军牺牲"},19:{t:"forced",s:"Rxg8被迫吃后"},20:{t:"key",s:"Nf7将杀！经典的闷杀，白马在f7将杀，黑王被自己的兵和车堵住"},},lesson:""},
{name:"错误23",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 Bc5 Ne5 Ne5 d4 Bb4 de Ne4 Qd4 Nc3 bc Ba5 Ba3 b6 e6 Qf6 Bd7+ Kd8 Bc6+ Qd4 e7#",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bb5西班牙开局，钉住黑马"},5:{t:"idea",s:"a6赶走白象，莫菲防御"},6:{t:"idea",s:"Ba4象退到a4保持钉住"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"Nc3发展马"},9:{t:"idea",s:"Bc5出象到活跃位置"},10:{t:"idea",s:"Nxe5牺牲马吃e5兵"},11:{t:"idea",s:"Nxe5黑方吃回"},12:{t:"idea",s:"d4推中心兵，攻击黑象"},13:{t:"idea",s:"Bb4象退到b4，钉住白马"},14:{t:"idea",s:"dxe5继续推进"},15:{t:"idea",s:"Nxe4马吃兵"},16:{t:"idea",s:"Qd4后出到中心"},17:{t:"idea",s:"Nxc3吃掉白马"},18:{t:"idea",s:"bxc3用兵吃回"},19:{t:"idea",s:"Ba5象退开"},20:{t:"idea",s:"Ba3攻击黑方弱格"},21:{t:"idea",s:"b6准备防守"},22:{t:"idea",s:"e6！兵推进，打开进攻线路"},23:{t:"idea",s:"Qf6防守"},24:{t:"idea",s:"Bxd7+将军"},25:{t:"forced",s:"Kd8王被迫走到d8"},26:{t:"idea",s:"Bxc6+再次将军"},27:{t:"forced",s:"Qxd4后吃掉中心的白后"},28:{t:"key",s:"e7将杀！兵推到e7将杀，虽然只是一个小兵，但位置致命"},},lesson:""},
{name:"错误24",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb4 c3 Ba5 d4 ed 0-0 dc Qb3 Qe7 Nc3 Nf6 Nd5 Nd5 ed Ne5 Ne5 Qe5 Bb2 Qg5 h4 Qh4 Bg7 Rg8 Re1+ Kd8 Qg3 Qg3 Bf6#",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7弱点"},5:{t:"idea",s:"Bc5对称出象"},6:{t:"key",s:"b4！埃文斯弃兵——白方弃掉一个兵换取快速发展和进攻"},7:{t:"idea",s:"Bxb4接受弃兵"},8:{t:"idea",s:"c3赶走黑象，夺回中心"},9:{t:"idea",s:"Ba5象退到a5"},10:{t:"idea",s:"d4打开中心，白方子力全面出动"},11:{t:"idea",s:"exd4吃兵"},12:{t:"good",s:"O-O先易位保护王，不急着吃回兵"},13:{t:"idea",s:"dxc3吃掉c3兵"},14:{t:"idea",s:"Qb3后出来攻击f7和b7两个目标"},15:{t:"idea",s:"Qe7防守f7"},16:{t:"idea",s:"Nxc3夺回兵，白方子力全面活跃"},17:{t:"idea",s:"Nf6发展马"},18:{t:"idea",s:"Nd5！马跳到中心最强位置"},19:{t:"idea",s:"Nxd5只能兑换"},20:{t:"idea",s:"exd5打开e线"},21:{t:"idea",s:"Nxe5吃掉兵"},22:{t:"idea",s:"Nxe5吃回"},23:{t:"idea",s:"Qxe5后吃回"},24:{t:"idea",s:"Bb2白象控制大斜线，力量强大"},25:{t:"forced",s:"Qg5后躲开"},26:{t:"idea",s:"h4追后"},27:{t:"forced",s:"Qh4后退到h4"},28:{t:"idea",s:"Bxg7！吃掉g7兵，打开黑王防线"},29:{t:"forced",s:"Rg8退车准备防守"},30:{t:"idea",s:"Re1+车将军"},31:{t:"forced",s:"Kd8王逃跑"},32:{t:"idea",s:"Qg3兑后"},33:{t:"idea",s:"Qxg3"},34:{t:"key",s:"Bf6将杀！白象控制所有逃跑路线，埃文斯弃兵的经典攻杀"},},lesson:""},
]},
{cat:"italian",name:"意大利开局",icon:"🇮🇹",color:"#27ae60",desc:"1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5",vars:[
{name:"变化1",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 ed cd Bb4+ Bd2 Bd2+ Nbd2 d5 ed Nd5 Qb3 Nce7 0-0 0-0 Rfe1 c6 Rac1",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5兵"},3:{t:"idea",s:"Nc6保护e5兵"},4:{t:"idea",s:"Bc4意大利开局！象瞄准f7——黑方最弱的格子"},5:{t:"idea",s:"Bc5黑象也出来，瞄准白方f2"},6:{t:"idea",s:"c3准备d4推中心，是意大利开局最积极的方案"},7:{t:"idea",s:"Nf6出马发展子力，同时攻击e4"},8:{t:"key",s:"d4！推进中心，打开局面，白方争夺空间"},9:{t:"idea",s:"exd4吃掉中心兵"},10:{t:"idea",s:"cxd4用兵夺回中心"},11:{t:"idea",s:"Bb4+将军，利用白方d线打开的弱点"},12:{t:"idea",s:"Bd2挡住将军，同时发展象"},13:{t:"idea",s:"Bxd2+兑换象"},14:{t:"idea",s:"Nbxd2用马吃回，马到活跃位置"},15:{t:"idea",s:"d5！黑方在中心反击，挑战白方"},16:{t:"idea",s:"exd5吃掉黑兵"},17:{t:"idea",s:"Nxd5马占领强大的中心位置"},18:{t:"idea",s:"Qb3后出来攻击b7兵"},19:{t:"idea",s:"Nce7马退回保护，准备出后翼子力"},20:{t:"good",s:"O-O白方易位，王安全了，车也出来了"},21:{t:"good",s:"O-O黑方也易位，双方都把王保护好"},22:{t:"idea",s:"Rfe1车占领e线——开放线路是车最喜欢的"},23:{t:"idea",s:"c6稳固d5马的位置，不让白方赶走"},24:{t:"idea",s:"Rac1车到c线，白方子力全面就位，局面均势"},},lesson:""},
{name:"变化2(白略优）",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Qe7 d4 Bb6 0-0 d6 h3 Nf6 Re1 0-0 a4 a6 Be3",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局，瞄准f7"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"c3准备d4推中心"},7:{t:"idea",s:"Qe7后出到e7，准备支援中心"},8:{t:"idea",s:"d4推进中心"},9:{t:"idea",s:"Bb6象退开，保持在斜线上"},10:{t:"good",s:"O-O先易位确保王安全"},11:{t:"idea",s:"d6稳固中心"},12:{t:"idea",s:"h3预防黑象出到g4钉住白马"},13:{t:"idea",s:"Nf6出马"},14:{t:"idea",s:"Re1车占领e线，增加对中心的压力"},15:{t:"good",s:"O-O黑方也易位"},16:{t:"idea",s:"a4白方在后翼扩张，准备推a5赶走黑象"},17:{t:"idea",s:"a6阻止白兵继续推进"},18:{t:"idea",s:"Be3白象出来，交换掉黑方的活跃象，白方空间更大，略优"},},lesson:""},
{name:"变化3( 双方均势）",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 Nc3 d6 Be3 Bb6 Qd2 Be6 Bb5 0-0 Bc6 bc 0-0 Nd7 d4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"d3慢速体系，白方选择稳健发展而非激进的c3-d4"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"Nc3发展后翼马"},9:{t:"idea",s:"d6稳固中心"},10:{t:"idea",s:"Be3出象准备交换黑方活跃的c5象"},11:{t:"idea",s:"Bb6象退开避免被交换"},12:{t:"idea",s:"Qd2后出来，准备长易位或O-O"},13:{t:"idea",s:"Be6出象发展子力"},14:{t:"idea",s:"Bb5象换到b5位置，钉住黑马"},15:{t:"good",s:"O-O先易位保护王"},16:{t:"idea",s:"Bxc6用象换马，改变兵形"},17:{t:"idea",s:"bxc6用兵吃回，虽然兵形破了但获得双象"},18:{t:"good",s:"O-O白方也易位"},19:{t:"idea",s:"Nd7马准备调动到更好位置"},20:{t:"idea",s:"d4白方推进中心，局面基本均势"},},lesson:""},
{name:"变化4",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 Nc3 d6 Bg5 h6 Bf6 Qf6 Nd5 Qd8 c3 Ne7 Ne3 0-0 0-0 Ng6 d4 Bb6 a4 c6 de de Qd8 Rd8 Rad1 Re8",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"d3慢速体系"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"Nc3发展马"},9:{t:"idea",s:"d6稳固"},10:{t:"idea",s:"Bg5钉住黑马f6——马不能走，否则后会被吃"},11:{t:"idea",s:"h6赶走白象，问白象要不要换"},12:{t:"idea",s:"Bxf6白方选择吃掉黑马"},13:{t:"idea",s:"Qxf6后吃回"},14:{t:"idea",s:"Nd5！马跳到中心强力位置，攻击黑后"},15:{t:"forced",s:"Qd8后退回"},16:{t:"idea",s:"c3巩固中心"},17:{t:"idea",s:"Ne7马准备赶走白方d5马"},18:{t:"idea",s:"Ne3白马退到稳固位置"},19:{t:"good",s:"O-O黑方易位"},20:{t:"good",s:"O-O白方也易位"},21:{t:"idea",s:"Ng6黑马到g6，准备王翼活动"},22:{t:"idea",s:"d4白方推进中心"},23:{t:"idea",s:"Bb6象退开"},24:{t:"idea",s:"a4白方后翼扩张"},25:{t:"idea",s:"c6稳固中心"},26:{t:"idea",s:"dxe5打开中心"},27:{t:"idea",s:"dxe5吃回"},28:{t:"idea",s:"Qxd8兑后"},29:{t:"idea",s:"Rxd8车吃回"},30:{t:"idea",s:"Rad1车占领d线"},31:{t:"idea",s:"Re8车到e线，双方平稳，白棋位置稍好"},},lesson:"d3 Nf6体系这个变化比较平稳，白棋子力位置稍好，局面稍占优势。"},
{name:"变化5",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 0-0 Nf6 d4 Bd4 Nd4 Nd4 f4 d6 Nc3 c6 Be3 b5 Be2 Ne2 Qe2 Ng4 fe Ne5 Bf4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"good",s:"O-O先易位，选择激进的弃兵路线"},7:{t:"idea",s:"Nf6出马"},8:{t:"key",s:"d4！弃兵抢攻，白方牺牲一个兵换取快速发展"},9:{t:"idea",s:"Bxd4吃掉白兵"},10:{t:"idea",s:"Nxd4马吃回象"},11:{t:"idea",s:"Nxd4黑马也吃"},12:{t:"idea",s:"f4白方推进，建立强大的中心"},13:{t:"idea",s:"d6黑方稳固"},14:{t:"idea",s:"Nc3发展马"},15:{t:"idea",s:"c6建立中心"},16:{t:"idea",s:"Be3出象"},17:{t:"idea",s:"b5反击白象"},18:{t:"idea",s:"Be2象退回安全位置"},19:{t:"idea",s:"Nxe2兑换"},20:{t:"idea",s:"Qxe2后到e线"},21:{t:"idea",s:"Ng4黑马反攻"},22:{t:"idea",s:"fxe5打开f线"},23:{t:"idea",s:"Nxe5马占强点"},24:{t:"idea",s:"Bf4白象攻击黑马，但黑方应对得当已经稍好"},},lesson:"0-0 Nf6体系白棋选择弃兵抢攻的激进招法，但是若黑棋应对得当，黑方稍好。"},
{name:"变化6",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 ed cd Bb4+ Nc3 Ne4 0-0 Bc3 d5 Bf6 Rfe1 Ne7 Re4 d6 Bg5 Bg5 Ng5 h6 Qe2 hg Re1 Be6 de f6 Re3 d5 Rh3 Rh3 gh g6 Qf3 Qd6 Qf6 Qf4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"c3准备d4"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"d4推进中心"},9:{t:"idea",s:"exd4吃兵"},10:{t:"idea",s:"cxd4夺回"},11:{t:"idea",s:"Bb4+将军"},12:{t:"key",s:"Nc3！用马挡住将军，弃掉一个兵换取发展速度"},13:{t:"idea",s:"Nxe4黑方吃兵"},14:{t:"good",s:"O-O白方弃兵后立刻易位，争取时间"},15:{t:"idea",s:"Bxc3吃掉白马"},16:{t:"idea",s:"d5兵继续推进，打开对角线"},17:{t:"idea",s:"Bxf6吃掉白马"},18:{t:"idea",s:"Rfe1车到e线"},19:{t:"idea",s:"Ne7马退回防守"},20:{t:"idea",s:"Rxe4车吃兵，占领e线"},21:{t:"idea",s:"d6黑方稳固"},22:{t:"idea",s:"Bg5白象出击攻击"},23:{t:"idea",s:"Bxg5兑换"},24:{t:"idea",s:"Nxg5马到g5攻击王翼"},25:{t:"idea",s:"h6赶走白马"},26:{t:"idea",s:"Qe2后到e线"},27:{t:"idea",s:"hxg5吃马"},28:{t:"idea",s:"Re1车继续占领e线"},29:{t:"idea",s:"Be6出象防守"},30:{t:"idea",s:"dxe6打开更多线路"},31:{t:"idea",s:"f6防守"},32:{t:"idea",s:"Re3车提到第三排攻击"},33:{t:"idea",s:"d5反击"},34:{t:"idea",s:"Rh3车横移攻击h线"},35:{t:"idea",s:"Rxh3兑换"},36:{t:"idea",s:"gxh3打开g线"},37:{t:"idea",s:"g6防守"},38:{t:"idea",s:"Qf3白后进攻"},39:{t:"idea",s:"Qd6黑后防守"},40:{t:"idea",s:"Qf6继续施压"},41:{t:"idea",s:"Qf4白方攻势强，但黑方也有反击，互有机会"},},lesson:"c3 Nf6 体系此变化中白棋同样选择了弃兵抢攻，白棋通过占领e线取得一定攻势，局面互有机会"},
{name:"变化7",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 ed cd Bb4+ Nc3 Ne4 0-0 Bc3 d5 Bf6 Re1 Ne7 Re4 d6 Bg5 Bg5 Ng5 0-0 Nh7 Bf5 Rh4 Re8 Qh5 Ng6 Rd4 Re5 Ng5 Qf6 Qh7+ Kf8 Qh5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"c3准备d4"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"d4推中心"},9:{t:"idea",s:"exd4吃兵"},10:{t:"idea",s:"cxd4夺回"},11:{t:"idea",s:"Bb4+将军"},12:{t:"idea",s:"Nc3用马挡住，弃兵"},13:{t:"idea",s:"Nxe4吃兵"},14:{t:"good",s:"O-O易位"},15:{t:"idea",s:"Bxc3吃马"},16:{t:"idea",s:"d5推兵"},17:{t:"idea",s:"Bxf6吃马"},18:{t:"idea",s:"Re1车到e线"},19:{t:"idea",s:"Ne7退马"},20:{t:"idea",s:"Rxe4车吃兵"},21:{t:"idea",s:"d6稳固"},22:{t:"idea",s:"Bg5出象攻击"},23:{t:"idea",s:"Bxg5兑换"},24:{t:"idea",s:"Nxg5马到g5"},25:{t:"good",s:"O-O黑方终于易位"},26:{t:"key",s:"Nxh7！马吃h7兵，牺牲进攻王翼"},27:{t:"idea",s:"Bf5黑象反击"},28:{t:"idea",s:"Rh4车横移到h线进攻"},29:{t:"idea",s:"Re8车到e线反击"},30:{t:"idea",s:"Qh5后加入攻击"},31:{t:"idea",s:"Ng6黑马防守"},32:{t:"idea",s:"Rd4车转向d线"},33:{t:"idea",s:"Rxe5黑车反击"},34:{t:"idea",s:"Ng5白马回到攻击位"},35:{t:"idea",s:"Qf6黑后防守"},36:{t:"idea",s:"Qh7+将军"},37:{t:"forced",s:"Kf8王逃跑"},38:{t:"idea",s:"Qh5白方要求和棋，因为黑王能逃回去，形成重复局面"},},lesson:"c3 Nf6体系这个变化比较激烈，在双方招法精确的情况下将形成重复局面的和棋"},
{name:"变化8",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 ed cd Bb4+ Nc3 Ne4 0-0 Nc3 bc d5 cb dc Re1+ Ne7 Bg5 f6 Qe2 Bg4 Bf4 Kf7 Qc4+ Nd5 Nd2 Be6 Bg3 Re8 Ne4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"c3准备d4"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"d4推中心"},9:{t:"idea",s:"exd4吃兵"},10:{t:"idea",s:"cxd4夺回"},11:{t:"idea",s:"Bb4+将军"},12:{t:"idea",s:"Nc3挡住将军"},13:{t:"idea",s:"Nxe4吃中心兵"},14:{t:"good",s:"O-O弃兵易位"},15:{t:"idea",s:"Nxc3吃掉白马"},16:{t:"idea",s:"bxc3用兵吃回，打开b线给车"},17:{t:"idea",s:"d5推兵反击"},18:{t:"idea",s:"cxb4吃黑象"},19:{t:"idea",s:"dxc4吃白象"},20:{t:"idea",s:"Re1+车将军"},21:{t:"forced",s:"Ne7挡住将军"},22:{t:"idea",s:"Bg5钉住黑马"},23:{t:"idea",s:"f6赶走白象"},24:{t:"idea",s:"Qe2后到e线"},25:{t:"idea",s:"Bg4出象"},26:{t:"idea",s:"Bf4白象退开"},27:{t:"forced",s:"Kf7王走开避免被攻击"},28:{t:"idea",s:"Qxc4+将军"},29:{t:"idea",s:"Nd5马到中心强点"},30:{t:"idea",s:"Nd2白马出动"},31:{t:"idea",s:"Be6防守"},32:{t:"idea",s:"Bg3白象控制斜线"},33:{t:"idea",s:"Re8车到e线"},34:{t:"idea",s:"Ne4白方子力活跃，双方保留异色格象，局面均势"},},lesson:"c3 Nf6体系双方保留异色格象，白方子力位置较好，黑方兵形好，局面均势"},
{name:"变化9",moves:"e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 ed cd Bb4 Bd2 Bd2 Nbd2 d5 ed Nd5 Qb3 Nce7 0-0 0-0 Rfe1 c6 a4 Qb6 Qa3 Be6 a5 Qc7 Ng5 Bf5 Re5 Qd7 a6 b6 Bd5 Nd5 Qf3 g6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4意大利开局"},5:{t:"idea",s:"Bc5出象"},6:{t:"idea",s:"c3准备d4——这是意大利开局最主流的变化"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"d4推进中心"},9:{t:"idea",s:"exd4吃兵"},10:{t:"idea",s:"cxd4夺回"},11:{t:"idea",s:"Bb4将军"},12:{t:"idea",s:"Bd2挡住将军"},13:{t:"idea",s:"Bxd2+兑换象"},14:{t:"idea",s:"Nbxd2马吃回"},15:{t:"idea",s:"d5反击中心"},16:{t:"idea",s:"exd5吃兵"},17:{t:"idea",s:"Nxd5马占中心"},18:{t:"idea",s:"Qb3攻击b7"},19:{t:"idea",s:"Nce7马回防"},20:{t:"good",s:"O-O易位"},21:{t:"good",s:"O-O双方易位完成"},22:{t:"idea",s:"Rfe1车到e线"},23:{t:"idea",s:"c6稳固中心"},24:{t:"idea",s:"a4后翼扩张"},25:{t:"idea",s:"Qb6兑后缓解压力"},26:{t:"idea",s:"Qa3白后换位置"},27:{t:"idea",s:"Be6出象"},28:{t:"idea",s:"a5后翼推进"},29:{t:"idea",s:"Qc7后退回"},30:{t:"idea",s:"Ng5攻击黑象"},31:{t:"idea",s:"Bf5黑象到活跃位置"},32:{t:"idea",s:"Rxe5！白车牺牲进攻"},33:{t:"idea",s:"Qd7防守"},34:{t:"idea",s:"a6打击后翼"},35:{t:"idea",s:"b6守住"},36:{t:"idea",s:"Bxd5白象到强力中心"},37:{t:"idea",s:"Nxd5马吃回"},38:{t:"idea",s:"Qf3后攻击"},39:{t:"idea",s:"g6防守，这是意大利开局最常见的主变，局面均势"},},lesson:"c3 Nf6体系这是意大利开局最常见的变化，黑棋顶住白方中心的d4兵，局面局势"},
]},
{cat:"scotch",name:"苏格兰开局",icon:"🏴",color:"#2980b9",desc:"1.e4 e5 2.Nf3 Nc6 3.d4",vars:[
{name:"变化1",moves:"e4 e5 Nf3 Nc6 d4 ed Bc4 Bc5 c3 d3 b4 Bb6 Qb3 Qf6 0-0 d6 a4 a6 a5 Ba7 b5 ab",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"key",s:"d4！苏格兰开局，白方直接打开中心"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Bc4出象而不是立刻夺回兵，选择弃兵争先"},7:{t:"idea",s:"Bc5出象"},8:{t:"idea",s:"c3要求夺回中心"},9:{t:"idea",s:"d3黑方不吃c3，保留中心兵"},10:{t:"idea",s:"b4推兵赶走黑象"},11:{t:"idea",s:"Bb6象退开"},12:{t:"idea",s:"Qb3后出来攻击f7和b7"},13:{t:"idea",s:"Qf6黑后出来防守f7同时攻击f2"},14:{t:"good",s:"O-O白方先易位，安全优先"},15:{t:"idea",s:"d6稳固中心"},16:{t:"idea",s:"a4白方后翼扩张"},17:{t:"idea",s:"a6阻止白兵"},18:{t:"idea",s:"a5继续推进赶走黑象"},19:{t:"idea",s:"Ba7象退到角落"},20:{t:"idea",s:"b5继续推进"},21:{t:"idea",s:"axb5兑换，双方各有顾虑，复杂多变"},},lesson:"4.弃兵争先，导入激烈变化说明：形成双方各有顾虑，复杂多变的局面"},
{name:"变化2",moves:"e4 e5 Nf3 Nc6 d4 ed c3 d3 Bd3 d6 0-0 Nf6 Nbd2 Be7 Nd4 0-0 f4 Ne5 fe de N2f3 ed",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"c3弃兵方案，准备夺回中心"},7:{t:"idea",s:"d3黑方保留兵"},8:{t:"idea",s:"Bxd3夺回兵，象到活跃位置"},9:{t:"idea",s:"d6稳固"},10:{t:"good",s:"O-O白方先易位"},11:{t:"idea",s:"Nf6出马"},12:{t:"idea",s:"Nbd2发展马"},13:{t:"idea",s:"Be7出象准备易位"},14:{t:"idea",s:"Nxd4白马占领中心"},15:{t:"good",s:"O-O黑方也易位"},16:{t:"idea",s:"f4白方在中心建立兵链，控制e5"},17:{t:"idea",s:"Nxe5黑方反击吃兵"},18:{t:"idea",s:"fxe5吃回"},19:{t:"idea",s:"dxe5夺回"},20:{t:"idea",s:"N2f3白马出到活跃位置"},21:{t:"idea",s:"exd4吃回中心兵，白方在中心占优势"},},lesson:"白方在中心占有优势，空间较大，形势较好"},
{name:"变化3",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 0-0 d5 ed Bh3 Bf3 0-0-0",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4白马占领强大的中心位置"},7:{t:"idea",s:"Bc5出象攻击白方d4马"},8:{t:"idea",s:"Be3出象保护d4马，准备交换"},9:{t:"idea",s:"Qf6后出来攻击d4马和f2兵"},10:{t:"idea",s:"c3巩固中心，保护d4马"},11:{t:"idea",s:"Nge7出马到不常见的e7"},12:{t:"idea",s:"Bc4出象瞄准f7"},13:{t:"idea",s:"Ne5！黑马跳到强力位置"},14:{t:"idea",s:"Be2象退开"},15:{t:"idea",s:"Qg6黑后到攻击位置"},16:{t:"good",s:"O-O白方易位"},17:{t:"idea",s:"d5反击中心"},18:{t:"idea",s:"exd5吃兵"},19:{t:"idea",s:"Bh3！象攻击g2，瞄准白王"},20:{t:"idea",s:"Bf3用象挡住"},21:{t:"good",s:"O-O-O！黑方反方向易位，形成对攻局面，非常刺激"},},lesson:"4.白马虽然占领了中心，但也由此成为了黑方反击的目标5.稳健之着，利用白方马在d4总结：双方反方向易位，形成对攻之势。黑方子力活跃，形势较好"},
{name:"变化4",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Nf6 Nc3 Bb4 Nc6 bc Bd3 d5 ed cd 0-0 0-0 Bg5 c6 Qf3 Be7 Rae1 Rb8 Nd1 Re8",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Nf6出马——最常见的应对"},8:{t:"idea",s:"Nc3发展马"},9:{t:"idea",s:"Bb4出象钉住白马"},10:{t:"idea",s:"Nxc6马吃掉黑马，简化局面"},11:{t:"idea",s:"bxc6用兵吃回"},12:{t:"idea",s:"Bd3出象"},13:{t:"idea",s:"d5反击中心"},14:{t:"idea",s:"exd5吃兵"},15:{t:"idea",s:"cxd5兵吃回"},16:{t:"good",s:"O-O白方易位"},17:{t:"good",s:"O-O黑方也易位"},18:{t:"idea",s:"Bg5钉住黑马"},19:{t:"idea",s:"c6稳固中心"},20:{t:"idea",s:"Qf3后出来"},21:{t:"idea",s:"Be7出象"},22:{t:"idea",s:"Rae1车到e线"},23:{t:"idea",s:"Rb8车到b线"},24:{t:"idea",s:"Nd1马调动"},25:{t:"idea",s:"Re8车到e线，双方大致均势"},},lesson:"双方大致均势"},
{name:"变化5",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Bc5 Be3 Qf6 c3 Nge7 Bb5 0-0 0-0 d6 Nc6 bc Bc5 cb Bd4 Qg6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Bc5出象"},8:{t:"idea",s:"Be3出象保护d4"},9:{t:"idea",s:"Qf6后出来攻击d4和f2"},10:{t:"idea",s:"c3巩固"},11:{t:"idea",s:"Nge7出马"},12:{t:"idea",s:"Bb5象钉住黑马"},13:{t:"good",s:"O-O黑方先易位"},14:{t:"good",s:"O-O白方也易位"},15:{t:"idea",s:"d6稳固"},16:{t:"idea",s:"Nxc6马吃黑马"},17:{t:"idea",s:"bxc6兵吃回"},18:{t:"idea",s:"Bxc5吃掉黑象"},19:{t:"idea",s:"cxb5兵吃白象"},20:{t:"idea",s:"Bxd4白象占中心"},21:{t:"idea",s:"Qg6后到攻击位，双方均势"},},lesson:"双方均势"},
{name:"变6 科帕耶夫着法1",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Nf6 Nc6 bc e5 Qe7 Qe2 Nd5 c4 Ba6 Qe4 Nb6 Bd3 Bc4 Bc4 d5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Nf6出马"},8:{t:"key",s:"Nxc6！科帕耶夫着法，吃掉黑马换取中心优势"},9:{t:"idea",s:"bxc6兵吃回"},10:{t:"idea",s:"e5推兵攻击黑马"},11:{t:"idea",s:"Qe7后出来防守"},12:{t:"idea",s:"Qe2后对后，控制e线"},13:{t:"idea",s:"Nd5马到中心强点"},14:{t:"idea",s:"c4推兵赶走黑马"},15:{t:"idea",s:"Ba6想兑换白象"},16:{t:"idea",s:"Qe4后到中心"},17:{t:"idea",s:"Nb6马回到b6"},18:{t:"idea",s:"Bd3出象"},19:{t:"idea",s:"Bxc4兑换"},20:{t:"idea",s:"Bxc4白象吃回"},21:{t:"idea",s:"d5黑方反击中心，大致均势"},},lesson:"双方大致均势"},
{name:"变7 科帕耶夫着法2",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Nf6 Nc6 bc e5 Qe7 Qe2 Nd5 Nd2 Nf4 Qe4 Ng6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"Nxc6科帕耶夫着法"},9:{t:"idea",s:"bxc6吃回"},10:{t:"idea",s:"e5攻击黑马"},11:{t:"idea",s:"Qe7后出来"},12:{t:"idea",s:"Qe2后对后"},13:{t:"idea",s:"Nd5马到强点"},14:{t:"idea",s:"Nd2白马出来另一种路线"},15:{t:"idea",s:"Nf4攻击白后"},16:{t:"idea",s:"Qe4后退开"},17:{t:"idea",s:"Ng6马到活跃位置，后期黑方可以走d5局面较好"},},lesson:"后期黑方可以走d5局面较好"},
{name:"变8 拉斯克着法",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Bc5 Be3 Qf6 c3 Nge7 Nc2 b6 Bc5 bc Ne3 Bb7",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Bc5出象"},8:{t:"idea",s:"Be3出象"},9:{t:"idea",s:"Qf6后出来攻击"},10:{t:"idea",s:"c3巩固"},11:{t:"idea",s:"Nge7出马"},12:{t:"key",s:"Nc2拉斯克着法——白马退到c2，准备Ne3"},13:{t:"idea",s:"b6准备出象到大斜线"},14:{t:"idea",s:"Bxc5兑换象"},15:{t:"idea",s:"bxc5吃回"},16:{t:"idea",s:"Ne3白马到中心"},17:{t:"idea",s:"Bb7象到大斜线，控制对角线，双方均势"},},lesson:"7......b6起兵，方便黑象出来形成大斜线总觉：双方总体均势"},
{name:"变9",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 0-0 d5 ed Bh3 Bf3 0-0-0",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Bc5出象攻击d4"},8:{t:"idea",s:"Be3保护马"},9:{t:"idea",s:"Qf6后攻击d4和f2"},10:{t:"idea",s:"c3巩固"},11:{t:"idea",s:"Nge7出马"},12:{t:"idea",s:"Bc4出象瞄准f7"},13:{t:"idea",s:"Ne5黑马跳到强点"},14:{t:"idea",s:"Be2象退开"},15:{t:"idea",s:"Qg6后到攻击位"},16:{t:"good",s:"O-O白方易位"},17:{t:"idea",s:"d5反击中心"},18:{t:"idea",s:"exd5吃兵"},19:{t:"idea",s:"Bh3攻击g2"},20:{t:"idea",s:"Bf3挡住"},21:{t:"good",s:"O-O-O反方向易位，双方对攻"},},lesson:""},
{name:"变10（陷阱）",moves:"e4 e5 Nf3 Nc6 d4 ed Nd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 0-0 Qe4 Nb5 Qc6 Bc5 Qc5 Qd4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"d4苏格兰开局"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"Nxd4马占中心"},7:{t:"idea",s:"Bc5出象"},8:{t:"idea",s:"Be3保护"},9:{t:"idea",s:"Qf6后出来"},10:{t:"idea",s:"c3巩固"},11:{t:"idea",s:"Nge7出马"},12:{t:"idea",s:"Bc4出象"},13:{t:"idea",s:"Ne5黑马跳到强点"},14:{t:"idea",s:"Be2象退开"},15:{t:"idea",s:"Qg6后到攻击位"},16:{t:"good",s:"O-O易位"},17:{t:"bad",s:"Qxe4?? 贪吃e4兵是大错！"},18:{t:"idea",s:"Nb5！白马跳出，同时威胁Nc7叉车和a7"},19:{t:"forced",s:"Qc6后被迫防守"},20:{t:"idea",s:"Bxc5吃掉黑象"},21:{t:"forced",s:"Qxc5只能后吃回"},22:{t:"key",s:"Qd4！白后出来兑后，黑方丢了一个象。教训：不能贪吃忽略对方的战术"},},lesson:"黑方失棋子"},
]},
{cat:"twoknights",name:"双马防御",icon:"♞♞",color:"#8e44ad",desc:"1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6",vars:[
{name:"变化1",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 ed Na5 Bb5+ c6 dc bc Be2 h6 Nf3 e4 Ne5 Bd6 d4 ed Nd3 Qc7",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7弱点"},5:{t:"key",s:"Nf6！双马防御——黑方出马反攻e4，而不是像意大利那样出象"},6:{t:"key",s:"Ng5！白马和象配合攻击f7，这是最直接的攻击方案"},7:{t:"key",s:"d5！黑方用弃兵来阻挡白方攻击f7，非常勇敢"},8:{t:"idea",s:"exd5吃掉黑兵"},9:{t:"idea",s:"Na5马攻击白象，赶走它"},10:{t:"idea",s:"Bb5+将军，打乱黑方节奏"},11:{t:"idea",s:"c6挡住将军，同时攻击白象"},12:{t:"idea",s:"dxc6吃兵"},13:{t:"idea",s:"bxc6兵吃回，打开b线"},14:{t:"idea",s:"Be2象退回安全位置"},15:{t:"idea",s:"h6赶走白马"},16:{t:"forced",s:"Nf3马被迫退回"},17:{t:"idea",s:"e4推兵攻击白马，黑方抢占空间"},18:{t:"idea",s:"Ne5马到e5强点"},19:{t:"idea",s:"Bd6出象攻击白马"},20:{t:"idea",s:"d4白方推兵"},21:{t:"idea",s:"exd3吃过路兵"},22:{t:"idea",s:"Nxd3白马到d3"},23:{t:"idea",s:"Qc7黑方出子快，线路畅通，弃兵有补偿"},},lesson:"4.白马和象配合攻击f7兵，黑方防守要准确黑方用兵来阻挡白方对f7兵的攻击4.··· 黑方用弃兵来阻挡白方对f7的攻击总结：黑方少一兵，但出子速度明显快于白方，黑方子力活跃，线路畅通，黑方弃兵有补偿"},
{name:"变化2",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 ed Na5 Bb5+ c6 dc bc Be2 h6 Nf3 e4 Ne5 Bd6 f4 ef Nf3 0-0 d4 c5 0-0 Re8",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"Ng5攻击f7"},7:{t:"idea",s:"d5弃兵阻挡"},8:{t:"idea",s:"exd5吃兵"},9:{t:"idea",s:"Na5攻击白象"},10:{t:"idea",s:"Bb5+将军"},11:{t:"idea",s:"c6挡将"},12:{t:"idea",s:"dxc6吃兵"},13:{t:"idea",s:"bxc6吃回"},14:{t:"idea",s:"Be2象退回"},15:{t:"idea",s:"h6赶马"},16:{t:"idea",s:"Nf3退马"},17:{t:"idea",s:"e4推兵"},18:{t:"idea",s:"Ne5马到强点"},19:{t:"idea",s:"Bd6出象"},20:{t:"idea",s:"f4白方用f兵支持e5马"},21:{t:"idea",s:"exf3吃过路兵"},22:{t:"idea",s:"Nxf3夺回"},23:{t:"good",s:"O-O黑方易位"},24:{t:"idea",s:"d4推中心"},25:{t:"idea",s:"Re8车到e线，各有顾虑"},},lesson:"总结：各有顾虑"},
{name:"变化3",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 d4 ed e5 d5 Bb5 Ne4 Nd4 Bd7 Bc6 bc 0-0 Be7 f3 Nc5 f4 Ne4 Nc3 Nc3 bc",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"d4白方选择打开中心而不是Ng5"},7:{t:"idea",s:"exd4吃兵"},8:{t:"idea",s:"e5推兵攻击黑马"},9:{t:"idea",s:"d5反击白象"},10:{t:"idea",s:"Bb5象退到b5钉住马"},11:{t:"idea",s:"Ne4马跳到中心"},12:{t:"idea",s:"Nxd4白马吃回兵"},13:{t:"idea",s:"Bd7出象"},14:{t:"idea",s:"Bxc6兑换"},15:{t:"idea",s:"bxc6兵吃回"},16:{t:"good",s:"O-O白方易位"},17:{t:"idea",s:"Be7出象"},18:{t:"idea",s:"f3赶走黑马"},19:{t:"idea",s:"Nc5马退到好位置"},20:{t:"idea",s:"f4继续推进"},21:{t:"idea",s:"Nxe4黑马反吃"},22:{t:"idea",s:"Nc3出马"},23:{t:"idea",s:"Nxc3吃掉白马"},24:{t:"idea",s:"bxc3吃回，白方略好"},},lesson:"总结：白方较好"},
{name:"变化4",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 d4 ed e5 d5 Bb5 Ne4 Nd4 Bd7 Bc6 bc 0-0 Bc5 f3 Ng5 Be3 Bb6 f4 Ne4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"d4打开中心"},7:{t:"idea",s:"exd4吃兵"},8:{t:"idea",s:"e5推兵攻击马"},9:{t:"idea",s:"d5反击"},10:{t:"idea",s:"Bb5钉住马"},11:{t:"idea",s:"Ne4马跳中心"},12:{t:"idea",s:"Nxd4吃回兵"},13:{t:"idea",s:"Bd7出象"},14:{t:"idea",s:"Bxc6兑换"},15:{t:"idea",s:"bxc6吃回"},16:{t:"good",s:"O-O易位"},17:{t:"idea",s:"Bc5出象"},18:{t:"idea",s:"f3赶黑马"},19:{t:"idea",s:"Ng5马到g5，瞄准f2和h3"},20:{t:"idea",s:"Be3出象"},21:{t:"idea",s:"Bb6黑象退开"},22:{t:"idea",s:"f4用f兵冲击"},23:{t:"idea",s:"Ne4马到中心。白方用e兵f兵冲击王翼，黑方用c兵d兵反击后翼，形成对攻"},},lesson:"总结：白方用e兵f兵冲击，从王翼进攻黑方用c兵d兵冲击，从后翼反击，形成对攻。由于黑方没有王车易位因此黑方较好"},
{name:"变化5 Ng5方案",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 ed Na5 Bb5 c6 dc bc Be2 h6 Nf3 e4 Ne5 Bd6 d4 ed Nd3 Qc7 h3 0-0 0-0 c5 b3 c4 bc Nc4 Nd2 Be6 Nc4 Bc4 Bf3 Rae8 Be3 Ne4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"Ng5攻击f7"},7:{t:"idea",s:"d5弃兵"},8:{t:"idea",s:"exd5吃兵"},9:{t:"idea",s:"Na5攻击白象"},10:{t:"idea",s:"Bb5将军（不退象，而是走Bb5）"},11:{t:"idea",s:"c6挡将"},12:{t:"idea",s:"dxc6吃兵"},13:{t:"idea",s:"bxc6吃回"},14:{t:"idea",s:"Be2象退回"},15:{t:"idea",s:"h6赶马"},16:{t:"idea",s:"Nf3退马"},17:{t:"idea",s:"e4推兵"},18:{t:"idea",s:"Ne5到强点"},19:{t:"idea",s:"Bd6出象"},20:{t:"idea",s:"d4推兵"},21:{t:"idea",s:"exd3吃过路兵"},22:{t:"idea",s:"Nxd3到d3"},23:{t:"idea",s:"Qc7出后"},24:{t:"idea",s:"h3预防Bg4"},25:{t:"good",s:"O-O黑方易位"},26:{t:"good",s:"O-O白方也易位"},27:{t:"idea",s:"c5推兵争空间"},28:{t:"idea",s:"b3支持中心"},29:{t:"idea",s:"c4反击"},30:{t:"idea",s:"bxc4吃兵"},31:{t:"idea",s:"Nxc4马到活跃位置"},32:{t:"idea",s:"Nd2白马出来"},33:{t:"idea",s:"Be6出象"},34:{t:"idea",s:"Nxc4兑换"},35:{t:"idea",s:"Bxc4吃回"},36:{t:"idea",s:"Bf3出象"},37:{t:"idea",s:"Rae8车到e线"},38:{t:"idea",s:"Be3出象"},39:{t:"idea",s:"Ne4黑方一直保持攻势，双方互有机会"},},lesson:"总结：这是双马防御中最大的变化黑棋弃兵之后一直保持局面的优势双方互有机会"},
{name:"变化6 黑方Ng5方案1",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 ed Na5 Bb5 c6 dc bc Be2 h6 Nf3 e4 Ne5 Bd6 d4 ed Nd3 Qc7 b3 0-0 Bb2 Ne4 Nc3 f5 h3 Ba6 0-0",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"Ng5攻击f7"},7:{t:"idea",s:"d5弃兵"},8:{t:"idea",s:"exd5吃兵"},9:{t:"idea",s:"Na5攻击白象"},10:{t:"idea",s:"Bb5将军"},11:{t:"idea",s:"c6挡将"},12:{t:"idea",s:"dxc6吃兵"},13:{t:"idea",s:"bxc6吃回"},14:{t:"idea",s:"Be2象退回"},15:{t:"idea",s:"h6赶马"},16:{t:"idea",s:"Nf3退马"},17:{t:"idea",s:"e4推兵"},18:{t:"idea",s:"Ne5到强点"},19:{t:"idea",s:"Bd6出象"},20:{t:"idea",s:"d4推兵"},21:{t:"idea",s:"exd3吃过路兵"},22:{t:"idea",s:"Nxd3到d3"},23:{t:"idea",s:"Qc7出后"},24:{t:"idea",s:"b3选择稳健路线"},25:{t:"good",s:"O-O黑方易位"},26:{t:"idea",s:"Bb2象到大斜线"},27:{t:"idea",s:"Nxe4黑方吃兵"},28:{t:"idea",s:"Nc3白马发展"},29:{t:"idea",s:"f5巩固e4马"},30:{t:"idea",s:"h3预防"},31:{t:"idea",s:"Ba6出象"},32:{t:"good",s:"O-O白方易位，白棋稍好因为黑方进攻不足"},},lesson:"总结：这个变化中，黑方在弃兵之后后续的进攻不足，白棋稍好"},
{name:"变化7 黑方Ng5方案2",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 ed Na5 Bb5 c6 dc bc Be2 h6 Nf3 e4 Ne5 Bd6 f4 ef Nf3 0-0 d4 Re8 0-0 c5 Nc3 cd Qd4 Nc6 Qh4 Rb8 Kh1 Rb4 Qe1 Ba6 Qd1",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"Ng5攻击f7"},7:{t:"idea",s:"d5弃兵"},8:{t:"idea",s:"exd5吃兵"},9:{t:"idea",s:"Na5攻击白象"},10:{t:"idea",s:"Bb5将军"},11:{t:"idea",s:"c6挡将"},12:{t:"idea",s:"dxc6吃兵"},13:{t:"idea",s:"bxc6吃回"},14:{t:"idea",s:"Be2象退回"},15:{t:"idea",s:"h6赶马"},16:{t:"idea",s:"Nf3退马"},17:{t:"idea",s:"e4推兵"},18:{t:"idea",s:"Ne5到强点"},19:{t:"idea",s:"Bd6出象"},20:{t:"idea",s:"f4用f兵支持"},21:{t:"idea",s:"exf3吃过路兵"},22:{t:"idea",s:"Nxf3夺回"},23:{t:"good",s:"O-O黑方易位"},24:{t:"idea",s:"d4推中心"},25:{t:"idea",s:"Re8车到e线"},26:{t:"good",s:"O-O白方也易位"},27:{t:"idea",s:"c5推兵"},28:{t:"idea",s:"Nc3出马"},29:{t:"idea",s:"cxd4吃兵"},30:{t:"idea",s:"Qxd4后到中心"},31:{t:"idea",s:"Nc6马回来"},32:{t:"idea",s:"Qh4后到攻击位"},33:{t:"idea",s:"Rb8车到b线"},34:{t:"idea",s:"Kh1预防"},35:{t:"idea",s:"Rxb4黑车反击"},36:{t:"idea",s:"Qe1白后退"},37:{t:"idea",s:"Ba6出象"},38:{t:"idea",s:"Qd1黑方弃兵抢攻保持攻势，局面均势"},},lesson:"总结：黑方弃兵抢攻保持了一定的攻势局面均势"},
{name:"变化8 黑方h6变化",moves:"e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 ed b5 Bf1 h6 Nf7 Kf7 dc Bc5 Be2 Bf2 Kf2 Ne4 Kf1 Rf8 d3 Kg8 Bf3 Bg4 Qe2 Bf3 gf Ng5 Bg5 Qg5 Nd2",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bc4瞄准f7"},5:{t:"idea",s:"Nf6双马防御"},6:{t:"idea",s:"Ng5攻击f7"},7:{t:"idea",s:"d5弃兵"},8:{t:"idea",s:"exd5吃兵"},9:{t:"key",s:"b5！大胆弃兵，直接攻击白象，不给白方喘息时间"},10:{t:"idea",s:"Bxf1象退回"},11:{t:"idea",s:"h6赶走白马"},12:{t:"key",s:"Nxf7！白马牺牲，吃f7兵"},13:{t:"forced",s:"Kxf7国王被迫吃马"},14:{t:"idea",s:"dxc6吃兵"},15:{t:"idea",s:"Bc5黑方出象瞄准f2"},16:{t:"idea",s:"Be2白象终于出来"},17:{t:"key",s:"Bxf2+！黑方牺牲象攻击白王"},18:{t:"forced",s:"Kxf2国王被迫吃象"},19:{t:"idea",s:"Nxe4+叉王和后"},20:{t:"forced",s:"Kf1王只能躲"},21:{t:"idea",s:"Rf8+车将军打开进攻"},22:{t:"idea",s:"d3推兵"},23:{t:"idea",s:"Kg8王回到安全位置"},24:{t:"idea",s:"Bf3白象出来"},25:{t:"idea",s:"Bg4出象攻击白后"},26:{t:"idea",s:"Qe2防守"},27:{t:"idea",s:"Bxf3兑换"},28:{t:"idea",s:"gxf3吃回"},29:{t:"idea",s:"Ng5黑马反攻"},30:{t:"idea",s:"Bxg5吃马"},31:{t:"idea",s:"Qxg5后吃回"},32:{t:"idea",s:"Nd2白方子力出动，白棋应对得当局面白方好"},},lesson:"总结：这个变化中黑棋棋子强攻但是若白棋应对得局面白方好"},
]},
{cat:"french",name:"法兰西防御",icon:"🇫🇷",color:"#c0392b",desc:"1.e4 e6 2.d4 d5",vars:[
{name:"2 尼姆佐维奇",moves:"e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bc3 bc Ne7 Qg4 0-0 Bd3 Nbc6 Qh5 Ng6 Nf3 Qc7 Ng5 h6 Nf7 Qf7 Qg6 Qg6 Bg6 cd cd Nd4 Be3 Nf5 Bc5 Rd8 h4 b6 Bb4 Bd7 0-0-0",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御——黑方用e6支持d5反击中心"},2:{t:"idea",s:"d4建立中心双兵"},3:{t:"idea",s:"d5挑战白方中心"},4:{t:"idea",s:"Nc3保护e4兵"},5:{t:"key",s:"Bb4！尼姆佐维奇变例——象钉住白马，如果马走了e4就没保护了"},6:{t:"idea",s:"e5白方推兵占空间，但中心变得封闭"},7:{t:"idea",s:"c5黑方从侧面攻击白方中心"},8:{t:"idea",s:"a3赶走钉住白马的黑象"},9:{t:"idea",s:"Bxc3+黑方用象换掉白马，破坏白方兵形"},10:{t:"idea",s:"bxc3用兵吃回，白方兵形被破但有双象"},11:{t:"idea",s:"Ne7出马准备调到更好位置"},12:{t:"key",s:"Qg4！白后出来攻击g7，非常激进的变化"},13:{t:"good",s:"O-O黑方赶紧易位保护王"},14:{t:"idea",s:"Bd3出象准备攻王翼"},15:{t:"idea",s:"Nbc6发展马"},16:{t:"idea",s:"Qh5后转到h5继续威胁王翼"},17:{t:"idea",s:"Ng6黑马到g6防守王翼"},18:{t:"idea",s:"Nf3出马"},19:{t:"idea",s:"Qc7后出来准备反击"},20:{t:"idea",s:"Ng5白马跳向王翼进攻"},21:{t:"idea",s:"h6赶走白马"},22:{t:"key",s:"Nxf7！白马牺牲，炸开黑方王翼防线"},23:{t:"idea",s:"Qxf7后吃马"},24:{t:"idea",s:"Qxg6白后吃g6，兑后"},25:{t:"idea",s:"Qxg6兑后"},26:{t:"idea",s:"Bxg6白象到g6位置很活跃"},27:{t:"idea",s:"cxd4吃兵"},28:{t:"idea",s:"cxd4夺回"},29:{t:"idea",s:"Nxd4黑马吃中心兵"},30:{t:"idea",s:"Be3出象"},31:{t:"idea",s:"Nf5马到活跃位置"},32:{t:"idea",s:"Bxc5白象吃兵"},33:{t:"idea",s:"Rd8车出来"},34:{t:"idea",s:"h4推兵"},35:{t:"idea",s:"b6稳固"},36:{t:"idea",s:"Bb4白象活跃"},37:{t:"idea",s:"Bd7出象"},38:{t:"good",s:"O-O-O白方长易位，双方形成对攻局面"},},lesson:"备注尼姆佐维奇方案中白棋在第7回合选择走Qg4,这是一个十分激烈的变化，双方形成对攻"},
{name:"3 封闭式变例",moves:"e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Be7 Qe7 f4 0-0 Nf3 c5 dc Nc6 Bd3 f6 ef Qf6 g3 Nc5 0-0 Bd7 Qd2 Nd3 cd e5 Rad1 Bh3 Rf2 d4 Ne4 Qf5 Nfg5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4中心推进"},3:{t:"idea",s:"d5挑战中心"},4:{t:"idea",s:"Nc3保护e4"},5:{t:"idea",s:"Nf6出马攻击e4"},6:{t:"key",s:"Bg5封闭式变例——白象钉住黑马，限制黑方发展"},7:{t:"idea",s:"Be7出象准备解除钉住"},8:{t:"idea",s:"e5推兵获取空间，赶走黑马"},9:{t:"idea",s:"Nfd7马被迫退到不活跃位置"},10:{t:"idea",s:"Bxe7用象换掉黑象"},11:{t:"idea",s:"Qxe7后吃回"},12:{t:"idea",s:"f4白方在王翼建立兵链，准备进攻"},13:{t:"good",s:"O-O黑方赶紧易位"},14:{t:"idea",s:"Nf3出马"},15:{t:"key",s:"c5！黑方反击白方中心d4兵——法兰西防御的关键反击"},16:{t:"idea",s:"dxc5吃兵"},17:{t:"idea",s:"Nc6出马发展子力"},18:{t:"idea",s:"Bd3出象"},19:{t:"idea",s:"f6！黑方推f兵挑战e5，打开局面"},20:{t:"idea",s:"exf6吃掉黑兵"},21:{t:"idea",s:"Qxf6后吃回"},22:{t:"idea",s:"g3稳固王翼"},23:{t:"idea",s:"Nxc5黑马吃回兵"},24:{t:"good",s:"O-O白方易位"},25:{t:"idea",s:"Bd7出象"},26:{t:"idea",s:"Qd2后出来"},27:{t:"idea",s:"Nxd3黑马吃白象"},28:{t:"idea",s:"cxd3兵吃回"},29:{t:"idea",s:"e5黑方推兵瓦解白方中心"},30:{t:"idea",s:"Rad1车到d线"},31:{t:"idea",s:"Bh3出象攻击g2"},32:{t:"idea",s:"Rf2车保护"},33:{t:"idea",s:"d4推兵反击"},34:{t:"idea",s:"Ne4马到中心"},35:{t:"idea",s:"Qf5后到活跃位置"},36:{t:"idea",s:"Nfg5白方保持平衡，双方均势"},},lesson:"备注这个变化中双方先交换了黑格象黑棋进一步瓦解白棋中心连兵局面均势"},
{name:"4 塔拉什黑c5变例",moves:"e4 e6 d4 d5 Nd2 c5 ed ed Ngf3 Nc6 Bb5 Bd6 dc Bc5 0-0 Nge7 Nb3 Bd6 Re1 0-0 Bg5 Bg4 Be2 Re8 c3 h6 Bh4 Qb6 Nfd4 Be2 Re2 Nd4 Nd4 Nc6 Nf5 Bf8",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4中心推进"},3:{t:"idea",s:"d5挑战中心"},4:{t:"key",s:"Nd2塔拉什变例——马放到d2而不是c3，不堵住c兵"},5:{t:"key",s:"c5！黑方立刻反击中心d4兵"},6:{t:"idea",s:"exd5兑换中心"},7:{t:"idea",s:"exd5黑兵吃回"},8:{t:"idea",s:"Ngf3出王翼马"},9:{t:"idea",s:"Nc6发展马"},10:{t:"idea",s:"Bb5象出来钉住黑马"},11:{t:"idea",s:"Bd6出象"},12:{t:"idea",s:"dxc5吃兵"},13:{t:"idea",s:"Bxc5吃回"},14:{t:"good",s:"O-O白方易位"},15:{t:"idea",s:"Nge7出马"},16:{t:"idea",s:"Nb3攻击黑象"},17:{t:"idea",s:"Bd6象退开"},18:{t:"idea",s:"Re1车到e线"},19:{t:"good",s:"O-O黑方也易位"},20:{t:"idea",s:"Bg5出象钉住"},21:{t:"idea",s:"Bg4出象"},22:{t:"idea",s:"Be2白象调动"},23:{t:"idea",s:"Re8车到e线"},24:{t:"idea",s:"c3稳固"},25:{t:"idea",s:"h6赶象"},26:{t:"idea",s:"Bh4象退开保持钉住"},27:{t:"idea",s:"Qb6后出来"},28:{t:"idea",s:"Nfd4白马到中心"},29:{t:"idea",s:"Bxe2兑换"},30:{t:"idea",s:"Rxe2车吃回"},31:{t:"idea",s:"Nxd4兑换"},32:{t:"idea",s:"Nxd4马吃回"},33:{t:"idea",s:"Nc6马回来"},34:{t:"idea",s:"Nf5马到强力前哨"},35:{t:"idea",s:"Bf8黑方稳固，双方经过兑换后局面均势"},},lesson:"备注塔拉什变例中黑棋选择较开放的c5 双方经过一系列子力交换，局面均势"},
{name:"5 塔拉什黑Nf6变例",moves:"e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cd cd f6 ef Nf6 Nf3 Bd6 0-0 Qc7 Nc3 a6 Bg5 0-0 Rc1 Bd7 Re1 Ng4 g3 h6 Be3 Rf6 Bb1 Be8 Nh4 Bh5 Qd3 g5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4中心推进"},3:{t:"idea",s:"d5挑战中心"},4:{t:"idea",s:"Nd2塔拉什变例"},5:{t:"idea",s:"Nf6黑方选择出马而不是c5"},6:{t:"idea",s:"e5推兵赶走黑马"},7:{t:"idea",s:"Nfd7马被迫退到d7"},8:{t:"idea",s:"Bd3出象"},9:{t:"idea",s:"c5反击d4"},10:{t:"idea",s:"c3巩固d4"},11:{t:"idea",s:"Nc6发展马"},12:{t:"idea",s:"Ne2出马"},13:{t:"idea",s:"cxd4吃兵"},14:{t:"idea",s:"cxd4夺回"},15:{t:"key",s:"f6！黑方推f兵挑战白方e5兵——法兰西防御的标志性反击"},16:{t:"idea",s:"exf6吃兵"},17:{t:"idea",s:"Nxf6马吃回，到活跃位置"},18:{t:"idea",s:"Nf3白马发展"},19:{t:"idea",s:"Bd6出象"},20:{t:"good",s:"O-O白方易位"},21:{t:"idea",s:"Qc7后出来"},22:{t:"idea",s:"Nc3白马到c3"},23:{t:"idea",s:"a6预防Nb5"},24:{t:"idea",s:"Bg5钉住马"},25:{t:"good",s:"O-O黑方也易位"},26:{t:"idea",s:"Rc1车到c线"},27:{t:"idea",s:"Bd7出象"},28:{t:"idea",s:"Re1车到e线"},29:{t:"idea",s:"Ng4黑马反攻"},30:{t:"idea",s:"g3防守"},31:{t:"idea",s:"h6赶象"},32:{t:"idea",s:"Be3象退开"},33:{t:"idea",s:"Rxf6！黑车牺牲打开进攻"},34:{t:"idea",s:"Bb1白象退开"},35:{t:"idea",s:"Be8调动"},36:{t:"idea",s:"Nh4白马出击"},37:{t:"idea",s:"Bh5出象"},38:{t:"idea",s:"Qd3白后出来"},39:{t:"idea",s:"g5黑方主动在王翼寻求进攻，取得攻势"},},lesson:"总结这个变化局面相对封闭黑棋主动在王翼寻求进攻取得 一定攻势"},
{name:"6 兑换变例",moves:"e4 e6 d4 d5 ed ed Nf3 Nf6 Bd3 Bd6 0-0 0-0 Bg5 Bg4 Nbd2 Nbd7 c3 c6 Qc2 Qc7 Rae1 Rae8 h3 Bh5 Nh4 Bf4 Bf4 Qf4 Nf5 Kh8 g3 Qc7",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e6法兰西防御"},2:{t:"idea",s:"d4中心推进"},3:{t:"idea",s:"d5挑战中心"},4:{t:"key",s:"exd5兑换变例——白方选择最平稳的路线，兑换中心兵"},5:{t:"idea",s:"exd5黑方吃回，中心对称"},6:{t:"idea",s:"Nf3出马"},7:{t:"idea",s:"Nf6出马"},8:{t:"idea",s:"Bd3出象到活跃位置"},9:{t:"idea",s:"Bd6出象"},10:{t:"good",s:"O-O白方易位"},11:{t:"good",s:"O-O黑方也易位"},12:{t:"idea",s:"Bg5钉住黑马"},13:{t:"idea",s:"Bg4黑象也钉住白马"},14:{t:"idea",s:"Nbd2发展马"},15:{t:"idea",s:"Nbd7发展马"},16:{t:"idea",s:"c3巩固中心"},17:{t:"idea",s:"c6同样巩固中心"},18:{t:"idea",s:"Qc2后出来"},19:{t:"idea",s:"Qc7后也出来，局面完全对称"},20:{t:"idea",s:"Rae1车到e线"},21:{t:"idea",s:"Rae8黑车也到e线"},22:{t:"idea",s:"h3赶走黑象"},23:{t:"idea",s:"Bh5象退开"},24:{t:"idea",s:"Nh4白马跳向王翼"},25:{t:"idea",s:"Bxf4白象换掉黑象"},26:{t:"idea",s:"Bxf4"},27:{t:"idea",s:"Qxf4后吃回"},28:{t:"idea",s:"Nf5马到强力位置"},29:{t:"idea",s:"Kh8预防"},30:{t:"idea",s:"g3稳固"},31:{t:"idea",s:"Qc7后回来，双方阵型对称，大体均势"},},lesson:"总结兑换变例白棋选择了非常平稳的招法，局面只有一条开放且双方阵型对称，大体均势"},
]},
{cat:"spanish",name:"西班牙开局",icon:"🇪🇸",color:"#e67e22",desc:"1.e4 e5 2.Nf3 Nc6 3.Bb5",vars:[
{name:"1 现代变例黑Bc5",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 0-0 Bc5 c3 b5 Bb3 d6 a4 Bg4 h3 Bf3 Qf3 0-0 d3 Na5 Bc2 b4 Nd2 Rb8 Re1 h6 Rb1 b3 Bd1 Qd7 Ra1 Nh7 Qg3",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"key",s:"Bb5！西班牙开局——象钉住保护e5的黑马，间接威胁e5兵"},5:{t:"idea",s:"a6赶走白象，这是莫菲防御"},6:{t:"idea",s:"Ba4象退到a4保持钉住"},7:{t:"idea",s:"Nf6出马攻击e4"},8:{t:"good",s:"O-O白方先易位，暂不着急吃e5"},9:{t:"idea",s:"Bc5黑方选择积极出象，争夺中心"},10:{t:"idea",s:"c3准备d4推中心"},11:{t:"idea",s:"b5赶走白象"},12:{t:"idea",s:"Bb3象退到b3安全位置，保持对f7的压力"},13:{t:"idea",s:"d6稳固中心"},14:{t:"idea",s:"a4白方后翼反击"},15:{t:"idea",s:"Bg4象出来钉住白马"},16:{t:"idea",s:"h3赶走黑象"},17:{t:"idea",s:"Bxf3被迫兑换"},18:{t:"idea",s:"Qxf3后吃回"},19:{t:"good",s:"O-O黑方易位"},20:{t:"idea",s:"d3稳健发展"},21:{t:"idea",s:"Na5马到a5攻击白象"},22:{t:"idea",s:"Bc2象退回"},23:{t:"idea",s:"b4推兵争空间"},24:{t:"idea",s:"Nd2白马调动"},25:{t:"idea",s:"Rb8车出来"},26:{t:"idea",s:"Re1车到e线"},27:{t:"idea",s:"h6预防Bg5"},28:{t:"idea",s:"Rb1车到b线"},29:{t:"idea",s:"b3黑方后翼扩张"},30:{t:"idea",s:"Bd1白象调位"},31:{t:"idea",s:"Qd7后出来"},32:{t:"idea",s:"Ra1车调动"},33:{t:"idea",s:"Nh7马退回准备调整"},34:{t:"idea",s:"Qg3白后攻击王翼，白方通过调整取得稍好局面"},},lesson:"现代变例黑方选择比较积极的Be5与白棋争夺中心，但白棋能通过力调整取得稍好的局面"},
{name:"2 兑换变例黑Qd6",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Bc6 dc 0-0 Qd6 Na3 Be6 Qe2 f6 Rd1 0-0-0 d4 Bg4 Be3 ed Rd4 Qe7 Nc4 Rd4 Bd4 c5 Bc3 Qe6 b3 Ne7 Re1 Nc6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bb5西班牙开局"},5:{t:"idea",s:"a6赶走白象"},6:{t:"key",s:"Bxc6！兑换变例——白方用象换马，破坏黑方兵形"},7:{t:"idea",s:"dxc6用d兵吃回，打开d线给后和象"},8:{t:"good",s:"O-O白方易位"},9:{t:"idea",s:"Qd6后出来保护e5"},10:{t:"idea",s:"Na3白马到a3准备跳到c4"},11:{t:"idea",s:"Be6出象发展"},12:{t:"idea",s:"Qe2后到e线"},13:{t:"idea",s:"f6巩固e5"},14:{t:"idea",s:"Rd1车到d线"},15:{t:"good",s:"O-O-O黑方长易位"},16:{t:"idea",s:"d4白方推进中心"},17:{t:"idea",s:"Bg4出象"},18:{t:"idea",s:"Be3出象"},19:{t:"idea",s:"exd4吃兵"},20:{t:"idea",s:"Rxd4车到中心"},21:{t:"idea",s:"Qe7后调位"},22:{t:"idea",s:"Nc4马到好位置"},23:{t:"idea",s:"Rxd4兑换车"},24:{t:"idea",s:"Bxd4象吃回"},25:{t:"idea",s:"c5反击"},26:{t:"idea",s:"Bc3象退开"},27:{t:"idea",s:"Qe6后出来"},28:{t:"idea",s:"b3稳固"},29:{t:"idea",s:"Ne7出马"},30:{t:"idea",s:"Re1车到e线"},31:{t:"idea",s:"Nc6马回来，黑方有双象优势，互有机会"},},lesson:"兑换变例白棋用象换黑马黑方稳住局面还有双象的优势局面互有机会"},
{name:"3 兑换变例黑Bg4",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Bc6 dc 0-0 Bg4 h3 h5 d3 Qf6 Nbd2 Ne7 Re1 Ng6 d4 Bd6 hg hg Nh2 Rh2 Qg4 Qh4 Qh4 Rh4 Nf3",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bb5西班牙开局"},5:{t:"idea",s:"a6赶走白象"},6:{t:"idea",s:"Bxc6兑换变例"},7:{t:"idea",s:"dxc6用d兵吃回"},8:{t:"good",s:"O-O白方易位"},9:{t:"key",s:"Bg4！最凶狠的变化——象钉住白马，准备猛烈进攻"},10:{t:"idea",s:"h3赶象"},11:{t:"idea",s:"h5！黑方不退象，继续保持攻势"},12:{t:"idea",s:"d3稳固"},13:{t:"idea",s:"Qf6后出来加入攻击"},14:{t:"idea",s:"Nbd2发展马防守"},15:{t:"idea",s:"Ne7出马"},16:{t:"idea",s:"Re1车到e线"},17:{t:"idea",s:"Ng6黑马到g6准备攻王"},18:{t:"idea",s:"d4白方推中心反击"},19:{t:"idea",s:"Bd6出象"},20:{t:"idea",s:"hxg4吃象"},21:{t:"idea",s:"hxg4黑方吃回"},22:{t:"key",s:"Nxh2！白马牺牲进攻"},23:{t:"idea",s:"Rxh2车吃回"},24:{t:"idea",s:"Qg4后攻击"},25:{t:"idea",s:"Qh4反攻"},26:{t:"idea",s:"Qxh4兑后"},27:{t:"idea",s:"Rxh4车吃回"},28:{t:"idea",s:"Nf3白方防守得当，局面将转化成均势"},},lesson:"这是兑换变例中黑棋最凶狠的变化一直保持弃黑象，白棋防守得当局面将转化成均势"},
{name:"4 兑换变例黑f6",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Bc6 dc 0-0 f6 d4 ed Nd4 c5 Ne2 Qd1 Rd1 Bd7 Nbc3 0-0-0 Be3 Re8 Rd2 Bc6 Rad1 b6 f3 Ne7 Nf4 Ng6 Nh5 Ne5 b3 c4 Nd5 Kb7 Kf2 a5 Nhf4",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bb5西班牙开局"},5:{t:"idea",s:"a6赶走白象"},6:{t:"idea",s:"Bxc6兑换变例"},7:{t:"idea",s:"dxc6吃回"},8:{t:"good",s:"O-O易位"},9:{t:"idea",s:"f6用f兵巩固e5，但限制了王翼马的发展"},10:{t:"idea",s:"d4打开中心"},11:{t:"idea",s:"exd4吃兵"},12:{t:"idea",s:"Nxd4马占中心"},13:{t:"idea",s:"c5攻击白马"},14:{t:"idea",s:"Ne2马退到e2"},15:{t:"idea",s:"Qxd1兑后"},16:{t:"idea",s:"Rxd1车吃回"},17:{t:"idea",s:"Bd7出象"},18:{t:"idea",s:"Nbc3发展马"},19:{t:"good",s:"O-O-O黑方长易位"},20:{t:"idea",s:"Be3出象"},21:{t:"idea",s:"Re8车到e线"},22:{t:"idea",s:"Rd2车叠双"},23:{t:"idea",s:"Bc6出象到大斜线"},24:{t:"idea",s:"Rad1车占d线"},25:{t:"idea",s:"b6稳固"},26:{t:"idea",s:"f3巩固"},27:{t:"idea",s:"Ne7出马"},28:{t:"idea",s:"Nf4马到攻击位"},29:{t:"idea",s:"Ng6黑马防守"},30:{t:"idea",s:"Nh5马到h5"},31:{t:"idea",s:"Nxe5黑方反击"},32:{t:"idea",s:"b3稳固"},33:{t:"idea",s:"c4推兵"},34:{t:"idea",s:"Nd5马到中心强点"},35:{t:"idea",s:"Kb7王走开"},36:{t:"idea",s:"Kf2王出来"},37:{t:"idea",s:"a5推兵"},38:{t:"idea",s:"Nhf4白棋稍占主动"},},lesson:"黑方选择f6稳固阵型，导致自己空间较小白棋稍占主动"},
{name:"5 开放变例",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 0-0 Ne4 d4 b5 Bb3 d5 de Be6 c3 Be7 Nbd2 Nc5 Bc2 Bg4 Re1 Qd7 Nf1 Rd8 Ne3 Bh5 Nf5 0-0 Ne7 Ne7 b4 Ne4 Be4 de Qd7 Rd7 Ng5 Bg6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bb5西班牙开局"},5:{t:"idea",s:"a6赶走白象"},6:{t:"idea",s:"Ba4象退到a4"},7:{t:"idea",s:"Nf6出马"},8:{t:"good",s:"O-O白方易位"},9:{t:"key",s:"Nxe4！开放变例——黑方直接吃掉e4兵"},10:{t:"idea",s:"d4白方立刻反击中心"},11:{t:"idea",s:"b5赶走白象"},12:{t:"idea",s:"Bb3象退回"},13:{t:"idea",s:"d5黑方反击"},14:{t:"idea",s:"dxe5吃兵"},15:{t:"idea",s:"Be6出象"},16:{t:"idea",s:"c3巩固"},17:{t:"idea",s:"Be7出象"},18:{t:"idea",s:"Nbd2白马发展"},19:{t:"idea",s:"Nc5马到好位置"},20:{t:"idea",s:"Bc2象调位"},21:{t:"idea",s:"Bg4出象"},22:{t:"idea",s:"Re1车到e线"},23:{t:"idea",s:"Qd7后出来"},24:{t:"idea",s:"Nf1白马准备调到e3"},25:{t:"idea",s:"Rd8车出来"},26:{t:"idea",s:"Ne3马到e3"},27:{t:"idea",s:"Bh5象调位"},28:{t:"idea",s:"Nf5马到强力前哨"},29:{t:"good",s:"O-O黑方也易位"},30:{t:"idea",s:"Nxe7+马将军吃象"},31:{t:"idea",s:"Nxe7马吃回"},32:{t:"idea",s:"b4追马"},33:{t:"idea",s:"Nxe4黑马吃兵"},34:{t:"idea",s:"Bxe4白象吃回"},35:{t:"idea",s:"dxe4吃回"},36:{t:"idea",s:"Qxd7兑后"},37:{t:"idea",s:"Rxd7车吃回"},38:{t:"idea",s:"Ng5白马出击"},39:{t:"idea",s:"Bg6黑方先得兵但白棋随后可以得回，大致均势"},},lesson:"开放变例黑方先得到白兵但白棋随后便可得回双方大致均势"},
{name:"6 齐果林变例",moves:"e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 0-0 Be7 Re1 b5 Bb3 d6 c3 0-0 h3 Na5 Bc2 c5 d4 Qc7 Nbd2 cd cd Nc6 Nb3 a5 Be3 a4 Nbd2 Bd7 Rc1 Qb7 Qe2 Rfe8 a3 g6",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nc6保护e5"},4:{t:"idea",s:"Bb5西班牙开局"},5:{t:"idea",s:"a6赶走白象"},6:{t:"idea",s:"Ba4象退开"},7:{t:"idea",s:"Nf6出马"},8:{t:"good",s:"O-O易位"},9:{t:"idea",s:"Be7出象——齐果林变例，最稳健的发展"},10:{t:"idea",s:"Re1车到e线保护e4兵"},11:{t:"idea",s:"b5赶白象"},12:{t:"idea",s:"Bb3象退回"},13:{t:"idea",s:"d6稳固中心"},14:{t:"idea",s:"c3准备d4"},15:{t:"good",s:"O-O黑方也易位，双方都安全了"},16:{t:"idea",s:"h3预防Bg4钉住白马"},17:{t:"idea",s:"Na5马到a5攻击白象"},18:{t:"idea",s:"Bc2象退回"},19:{t:"idea",s:"c5从侧面攻击白方中心"},20:{t:"idea",s:"d4白方推进中心"},21:{t:"idea",s:"Qc7后出来"},22:{t:"idea",s:"Nbd2发展马"},23:{t:"idea",s:"cxd4吃兵"},24:{t:"idea",s:"cxd4夺回"},25:{t:"idea",s:"Nc6马回到活跃位置"},26:{t:"idea",s:"Nb3白马到b3"},27:{t:"idea",s:"a5推兵"},28:{t:"idea",s:"Be3出象"},29:{t:"idea",s:"a4推兵赶白马"},30:{t:"idea",s:"Nbd2白马退开"},31:{t:"idea",s:"Bd7出象"},32:{t:"idea",s:"Rc1车到c线"},33:{t:"idea",s:"Qb7后移动"},34:{t:"idea",s:"Qe2后出来"},35:{t:"idea",s:"Rfe8车到e线"},36:{t:"idea",s:"a3稳固"},37:{t:"idea",s:"g6黑方保持对中心的压力，这是西班牙开局最经典的主变，双方机会均等"},},lesson:"齐果林变例是西班牙开局的主变黑方保持对中心的压力双方机会均等"},
]},
{cat:"russian",name:"俄罗斯防御",icon:"🇷🇺",color:"#34495e",desc:"1.e4 e5 2.Nf3 Nf6",vars:[
{name:"俄罗斯开局1",moves:"e4 e5 Nf3 Nf6 d4 ed e5 Ne4 Qd4 d5 ed Nd6 Bd3 Nc6 Qf4 g6 Nc3 Bg7 Be3 0-0 0-0-0 Be6 Bc5",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"key",s:"Nf6！俄罗斯防御——黑方不保护e5，而是反攻e4"},4:{t:"key",s:"d4！打破对称局面，白方主动打开中心"},5:{t:"idea",s:"exd4吃兵"},6:{t:"idea",s:"e5推兵攻击黑马"},7:{t:"idea",s:"Ne4马到中心"},8:{t:"idea",s:"Qxd4白后吃回兵，中心强大"},9:{t:"idea",s:"d5反击中心"},10:{t:"idea",s:"exd6吃过路兵"},11:{t:"idea",s:"Nxd6马到d6"},12:{t:"idea",s:"Bd3出象到活跃位置，瞄准王翼"},13:{t:"idea",s:"Nc6出马同时攻击白后"},14:{t:"idea",s:"Qf4后退到f4，保持攻击"},15:{t:"idea",s:"g6准备出象到g7大斜线"},16:{t:"idea",s:"Nc3发展马"},17:{t:"idea",s:"Bg7象到大斜线，非常活跃"},18:{t:"idea",s:"Be3出象发展子力"},19:{t:"good",s:"O-O黑方易位"},20:{t:"good",s:"O-O-O白方长易位，准备王翼攻击"},21:{t:"idea",s:"Be6出象发展"},22:{t:"idea",s:"Bc5白象控制强力斜线，白方子力活跃，获得优势"},},lesson:"3.这着棋容易改变对称形式打破平衡，并使双方子力活跃7.针对黑马离开王翼防守位置，出动白象到d3是合理的11.白方中心无兵，大子非常活跃，极具开放局面特点。现在白方对黑方在d路和a2-f8斜线均有牵制，白方获得优势。改走白马也是白优"},
{name:"俄罗斯开局2",moves:"e4 e5 Nf3 Nf6 d4 Ne4 Bd3 d5 Ne5 Bd6 0-0 0-0 c4 c6 Nc3",result:"",notes:{0:{t:"idea",s:"e4控制中心"},1:{t:"idea",s:"e5争夺中心"},2:{t:"idea",s:"Nf3攻击e5"},3:{t:"idea",s:"Nf6俄罗斯防御"},4:{t:"idea",s:"d4打开中心"},5:{t:"idea",s:"Nxe4黑马吃掉e4兵"},6:{t:"idea",s:"Bd3出象"},7:{t:"idea",s:"d5巩固中心马位"},8:{t:"idea",s:"Nxe5白马吃e5"},9:{t:"idea",s:"Bd6出象攻击白马"},10:{t:"good",s:"O-O白方易位"},11:{t:"good",s:"O-O黑方也易位"},12:{t:"idea",s:"c4攻击黑方d5兵"},13:{t:"idea",s:"c6巩固中心"},14:{t:"idea",s:"Nc3发展马，白略优——中心无兵但子力很活跃"},},lesson:"基本像第二种变着，白略优"},
]},
];

/* ═══════════════ UI COMPONENTS ═══════════════ */
/* UI */
function MoveArrow({from,to,sq,flipped,piece}){
  const fc=(flipped?7-from[1]:from[1]),fr=(flipped?7-from[0]:from[0]);
  const tc=(flipped?7-to[1]:to[1]),tr=(flipped?7-to[0]:to[0]);
  const fx=fc*sq+sq/2,fy=fr*sq+sq/2,tx=tc*sq+sq/2,ty=tr*sq+sq/2;
  const stroke="rgba(0,104,55,0.4)",sw=sq*0.14;
  const isKnight=piece&&piece.toLowerCase()==="n";
  // arrowhead: triangle at destination
  const headLen=sq*0.32,headW=sq*0.28;
  let lastDx,lastDy;
  if(isKnight){
    const dr=tr-fr,dc=tc-fc,adr=Math.abs(dr),adc=Math.abs(dc);
    let mx,my;
    if(adr>adc){mx=fx;my=ty;}else{mx=tx;my=fy;}
    lastDx=tx-mx;lastDy=ty-my;
    const len=Math.sqrt(lastDx*lastDx+lastDy*lastDy);
    const ux=lastDx/len,uy=lastDy/len;
    const bx=tx-ux*headLen,by=ty-uy*headLen;
    const px=-uy,py=ux;
    return <g>
      <polyline points={`${fx},${fy} ${mx},${my} ${bx},${by}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>
      <polygon points={`${bx-px*headW/2},${by-py*headW/2} ${tx},${ty} ${bx+px*headW/2},${by+py*headW/2}`} fill={stroke}/>
    </g>;
  }
  const dx=tx-fx,dy=ty-fy,len=Math.sqrt(dx*dx+dy*dy);
  const ux=dx/len,uy=dy/len,px=-uy,py=ux;
  const bx=tx-ux*headLen,by=ty-uy*headLen;
  return <g>
    <line x1={fx} y1={fy} x2={bx} y2={by} stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    <polygon points={`${bx-px*headW/2},${by-py*headW/2} ${tx},${ty} ${bx+px*headW/2},${by+py*headW/2}`} fill={stroke}/>
  </g>;
}
function Board({fen,size=480,lastMove=null,flipped=false,interactive=false,playerWhite=true,onMove=null,wrongSquare=null,showArrow=true,hintSquares=null}){
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
    if(slides.length>0)playSound(isCapture?"capture":"move");
    setSelected(null); // clear selection on board change
    prevFenRef.current=fen;prevBoardRef.current=board;
  },[fen]);
  const isPlayerPiece=(p)=>p&&(playerWhite?p===p.toUpperCase():p===p.toLowerCase());
  const toBoard=(cx,cy)=>{const rect=boardRef.current?.getBoundingClientRect();if(!rect)return null;const x=cx-rect.left,y=cy-rect.top;const vc=Math.floor(x/sq),vi=Math.floor(y/sq);if(vc<0||vc>7||vi<0||vi>7)return null;return{r:flipped?7-vi:vi,c:flipped?7-vc:vc};};
  const pending=useRef(null); // {r,c,piece,startX,startY} — mousedown recorded but not yet dragging
  const handledByEnd=useRef(false); // prevent click firing after handleEnd
  const DRAG_THRESHOLD=5;
  const handleStart=(e,r,c)=>{if(!interactive)return;handledByEnd.current=false;const p=board[r][c];if(p&&isPlayerPiece(p)){e.preventDefault();const t=e.touches?e.touches[0]:e;pending.current={r,c,piece:p,startX:t.clientX,startY:t.clientY};return;}// tapped on non-own square while piece is selected → treat as move target
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

/* ═══════════════ STUDY + PRACTICE SCREEN ═══════════════ */
function StudyScreen({variation,onBack,color}){
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
        if(ne>=1){
          // show text hint
          const noteHint=variation.notes?.[step];
          const oops=["不对哦～","换一个试试！","再想想！"];
          const hintText=noteHint?`💡 ${noteHint.s}`:oops[Math.floor(Math.random()*oops.length)];
          setDrillMsg({type:"wrong",text:hintText});
        }
        if(ne>=2){
          // after 2 wrong: flash the correct squares on board
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
  },[step,max,positions,drillWaiting,moves]);
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
  const modeResetProps={onClick:m=>()=>{setMode(m);setStep(0);setQuizActive(null);setQuizAnswer(null);setScore({correct:0,total:0});setDrillMsg(null);setWrongSq(null);setDrillWaiting(false);setDrillErrors(0);setHintSquares(null);}};
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
  const controlBtns=<>{mode==="study"&&<div style={{display:"flex",gap:5,marginTop:10}}>
    <Btn onClick={()=>setStep(0)} disabled={step===0}>⏮</Btn>
    <Btn onClick={()=>{setStep(s=>Math.max(0,s-1));}} disabled={step===0}>◀</Btn>
    <Btn onClick={()=>setAuto(a=>!a)} accent={color}>{auto?"⏸":"▶"}</Btn>
    <Btn onClick={goNext} disabled={step>=max}>▶</Btn>
    <Btn onClick={()=>setStep(max)} disabled={step>=max}>⏭</Btn>
    <Btn onClick={()=>setFlipped(f=>!f)}>🔄</Btn>
    <Btn onClick={()=>setShowArrow(a=>!a)} accent={showArrow?color:undefined}>📍</Btn>
  </div>}
  {(mode==="drill"||mode==="practice")&&<div style={{display:"flex",gap:5,marginTop:6}}>
    <Btn onClick={resetDrill}>⏮</Btn>
    <Btn onClick={()=>setFlipped(f=>!f)}>🔄</Btn>
    <Btn onClick={()=>setShowArrow(a=>!a)} accent={showArrow?color:undefined}>📍</Btn>
  </div>}</>;
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
function Btn({children,onClick,disabled,accent}){return <button onClick={onClick} disabled={disabled} style={{width:50,height:44,borderRadius:10,border:"1.5px solid #d5d0c8",background:accent&&!disabled?accent:"#fff",color:accent&&!disabled?"#fff":disabled?"#ccc":"#555",fontSize:18,fontWeight:700,cursor:disabled?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:disabled?.5:1,transition:"all .15s"}}>{children}</button>;}

/* ═══════════════ CATEGORY + HOME ═══════════════ */
function CatScreen({cat,onBack,onSelect}){return <div style={{minHeight:"100vh",background:"linear-gradient(175deg,#faf9f6,#ede9e3)",fontFamily:"'Nunito',sans-serif",padding:"12px 16px 32px",display:"flex",flexDirection:"column",alignItems:"center"}}>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<div style={{width:"100%",maxWidth:540,display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
<button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#888",padding:"2px 6px"}}>←</button>
<div><h2 style={{margin:0,fontSize:20,color:"#2d2d3a",fontWeight:900}}>{cat.icon} {cat.name}</h2><p style={{margin:"2px 0 0",fontSize:12,color:"#999"}}>{cat.desc}</p></div></div>
<div style={{width:"100%",maxWidth:540,display:"flex",flexDirection:"column",gap:6}}>
{cat.vars.map((v,i)=><button key={i} onClick={()=>onSelect(v)} style={{background:"#fff",border:"1.5px solid #e8e4de",borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,transition:"all .15s",minHeight:56}}
onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform="translateX(3px)";}}
onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8e4de";e.currentTarget.style.transform="translateX(0)";}}>
<div style={{width:30,height:30,borderRadius:8,background:cat.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:cat.color,flexShrink:0}}>{i+1}</div>
<div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:"#2d2d3a"}}>{v.name}</div>
<div style={{fontSize:11,color:"#aaa",marginTop:1}}>{Math.ceil(v.moves.split(" ").length/2)}回合{v.result?` · ${v.result==="1-0"?"白胜":v.result==="0-1"?"黑胜":v.result}`:""}{v.quiz?` · 🎯 ${v.quiz.length}题`:""}</div></div>
<span style={{color:"#ccc",fontSize:18}}>›</span></button>)}</div></div>;}

function Home({onSelect}){return <div style={{minHeight:"100vh",background:"linear-gradient(175deg,#faf9f6,#ede9e3)",fontFamily:"'Nunito',sans-serif",padding:"28px 16px 32px",display:"flex",flexDirection:"column",alignItems:"center"}}>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<div style={{width:52,height:52,borderRadius:14,background:"#2d2d3a",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(45,45,58,.3)",marginBottom:8}}><span style={{fontSize:28}}>♞</span></div>
<h1 style={{margin:"0 0 4px",fontSize:26,fontWeight:900,color:"#2d2d3a"}}>开局训练营</h1>
<p style={{margin:"0 0 20px",fontSize:15,color:"#999",fontWeight:600}}>学开局 · 练开局 · 记住开局 🎯</p>
<div style={{width:"100%",maxWidth:540,display:"flex",flexDirection:"column",gap:8}}>
{DATA.map(cat=><button key={cat.cat} onClick={()=>onSelect(cat)} style={{background:"#fff",border:"1.5px solid #e8e4de",borderRadius:14,padding:"16px 18px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14,transition:"all .2s",boxShadow:"0 1px 4px rgba(0,0,0,.03)",minHeight:68}}
onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform="translateY(-2px)";}}
onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8e4de";e.currentTarget.style.transform="translateY(0)";}}>
<div style={{width:48,height:48,borderRadius:12,background:cat.color+"12",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{cat.icon}</div>
<div style={{flex:1}}><div style={{fontWeight:800,fontSize:16,color:"#2d2d3a"}}>{cat.name}</div><div style={{fontSize:13,color:"#999",marginTop:2}}>{cat.desc}</div></div>
<div style={{background:cat.color+"15",borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:700,color:cat.color,flexShrink:0}}>{cat.vars.length}个变化</div></button>)}</div>
<div style={{marginTop:20,padding:"12px 16px",borderRadius:12,background:"#fff",border:"1px solid #e8e4de",maxWidth:540,width:"100%",display:"flex",justifyContent:"space-around"}}>
<div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:"#2d2d3a"}}>{DATA.reduce((s,c)=>s+c.vars.length,0)}</div><div style={{fontSize:11,color:"#aaa",fontWeight:600}}>总变化</div></div>
<div style={{width:1,background:"#eee"}}/>
<div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:"#2d2d3a"}}>{DATA.reduce((s,c)=>s+c.vars.filter(v=>v.quiz).length,0)}</div><div style={{fontSize:11,color:"#aaa",fontWeight:600}}>可练习</div></div>
<div style={{width:1,background:"#eee"}}/>
<div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:"#d35400"}}>📖+🎯</div><div style={{fontSize:11,color:"#aaa",fontWeight:600}}>学+练</div></div></div></div>;}

/* ═══════════════ MAIN APP ═══════════════ */
export default function App(){
  const[screen,setScreen]=useState("home");
  const[cat,setCat]=useState(null);
  const[vari,setVari]=useState(null);
  if(screen==="study"&&vari&&cat)return <StudyScreen variation={vari} color={cat.color} onBack={()=>setScreen("cat")}/>;
  if(screen==="cat"&&cat)return <CatScreen cat={cat} onBack={()=>setScreen("home")} onSelect={v=>{setVari(v);setScreen("study");}}/>;
  return <Home onSelect={c=>{setCat(c);setScreen("cat");}}/>;
}
