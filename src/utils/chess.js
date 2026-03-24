export const START="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const f2c=f=>f.charCodeAt(0)-97, r2r=r=>8-parseInt(r), c2f=c=>String.fromCharCode(97+c), r2R=r=>String(8-r);

export function parseFEN(fen){const b=Array(8).fill(null).map(()=>Array(8).fill(null));const p=fen.split(" "),rows=p[0].split("/");for(let r=0;r<8;r++){let c=0;for(const ch of rows[r]){if(/\d/.test(ch))c+=parseInt(ch);else{b[r][c]=ch;c++;}}}return{board:b,turn:p[1]||"w",castling:p[2]||"-",ep:p[3]||"-"};}

export function boardToFEN(b,t,ca,ep){let f="";for(let r=0;r<8;r++){let e=0;for(let c=0;c<8;c++){if(b[r][c]){if(e>0){f+=e;e=0;}f+=b[r][c];}else e++;}if(e>0)f+=e;if(r<7)f+="/";}return`${f} ${t} ${ca} ${ep} 0 1`;}

const clone=b=>b.map(r=>[...r]);

export const isW=p=>p&&p===p.toUpperCase();
const isEn=(p,w)=>p&&(w?p===p.toLowerCase():p===p.toUpperCase());

export function getLegalTargets(b,fr,fc,castling,ep){
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

function canReach(b,fr,fc,tr,tc,pc){const t=pc.toLowerCase(),w=isW(pc),dr=tr-fr,dc=tc-fc,adr=Math.abs(dr),adc=Math.abs(dc);if(t==="p"){const d=w?-1:1,s=w?6:1;if(dc===0&&!b[tr][tc]){if(dr===d)return true;if(fr===s&&dr===2*d&&!b[fr+d][fc])return true;}if(adc===1&&dr===d)return true;return false;}if(t==="n")return(adr===2&&adc===1)||(adr===1&&adc===2);if(t==="k")return adr<=1&&adc<=1;const dirs=t==="b"?[[-1,-1],[-1,1],[1,-1],[1,1]]:t==="r"?[[-1,0],[1,0],[0,-1],[0,1]]:[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];for(const[ddr,ddc]of dirs){for(let s=1;s<8;s++){const nr=fr+ddr*s,nc=fc+ddc*s;if(nr<0||nr>7||nc<0||nc>7)break;if(nr===tr&&nc===tc)return true;if(b[nr][nc])break;}}return false;}

export function resolveMove(fen,mv){const{board:b,turn,castling:ca,ep}=parseFEN(fen);const w=turn==="w";let m=mv.replace(/[+#!?×x]/g,"").trim();
if(m==="O-O"||m==="0-0"){const r=w?7:0;const nb=clone(b);nb[r][6]=nb[r][4];nb[r][4]=null;nb[r][5]=nb[r][7];nb[r][7]=null;let nc=ca.replace(w?/[KQ]/g:/[kq]/g,"")||"-";return{board:nb,from:[r,4],to:[r,6],ca:nc,ep:"-"};}
if(m==="O-O-O"||m==="0-0-0"){const r=w?7:0;const nb=clone(b);nb[r][2]=nb[r][4];nb[r][4]=null;nb[r][3]=nb[r][0];nb[r][0]=null;let nc=ca.replace(w?/[KQ]/g:/[kq]/g,"")||"-";return{board:nb,from:[r,4],to:[r,2],ca:nc,ep:"-"};}
if(/^[a-h][a-h]$/.test(m)){const ff=f2c(m[0]),tf=f2c(m[1]),d=w?-1:1,pn=w?"P":"p";for(let r=0;r<8;r++){if(b[r][ff]!==pn)continue;const tr=r+d;if(tr<0||tr>7||Math.abs(tf-ff)!==1)continue;if(b[tr][tf]&&isEn(b[tr][tf],w)){const nb=clone(b);nb[tr][tf]=pn;nb[r][ff]=null;if(tr===0||tr===7)nb[tr][tf]=w?"Q":"q";return{board:nb,from:[r,ff],to:[tr,tf],ca,ep:"-"};}if(ep!=="-"){const ec=f2c(ep[0]),er=r2r(ep[1]);if(tr===er&&tf===ec){const nb=clone(b);nb[tr][tf]=pn;nb[r][ff]=null;nb[r][tf]=null;return{board:nb,from:[r,ff],to:[tr,tf],ca,ep:"-"};}}}return null;}
if(/^[a-h][a-h][1-8]$/.test(m)){const ff=f2c(m[0]),tf=f2c(m[1]),tr=r2r(m[2]),pn=w?"P":"p",fr=tr+(w?1:-1);if(fr>=0&&fr<=7&&b[fr][ff]===pn){const nb=clone(b);nb[tr][tf]=pn;nb[fr][ff]=null;if(tr===0||tr===7)nb[tr][tf]=w?"Q":"q";return{board:nb,from:[fr,ff],to:[tr,tf],ca,ep:"-"};}return null;}
if(/^[a-h][1-8]$/.test(m)){const tc=f2c(m[0]),tr=r2r(m[1]),pn=w?"P":"p",d=w?-1:1,s=w?6:1;let ne="-";if(b[tr-d]?.[tc]===pn&&!b[tr][tc]){const nb=clone(b);nb[tr][tc]=pn;nb[tr-d][tc]=null;if(tr===0||tr===7)nb[tr][tc]=w?"Q":"q";return{board:nb,from:[tr-d,tc],to:[tr,tc],ca,ep:ne};}if(b[tr-2*d]?.[tc]===pn&&tr-2*d===s&&!b[tr][tc]&&!b[tr-d][tc]){const nb=clone(b);nb[tr][tc]=pn;nb[s][tc]=null;ne=c2f(tc)+r2R(tr-d);return{board:nb,from:[s,tc],to:[tr,tc],ca,ep:ne};}return null;}
if(/^[KQRBN]/.test(m)){const pt=m[0],rest=m.slice(1),dest=rest.slice(-2),dis=rest.slice(0,-2);const tc=f2c(dest[0]),tr=r2r(dest[1]),pc=w?pt:pt.toLowerCase();for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(b[r][c]!==pc)continue;if(!canReach(b,r,c,tr,tc,pc))continue;if(dis.length===1){if(/[a-h]/.test(dis)&&c!==f2c(dis))continue;if(/[1-8]/.test(dis)&&r!==r2r(dis))continue;}else if(dis.length===2){if(c!==f2c(dis[0])||r!==r2r(dis[1]))continue;}const nb=clone(b);nb[tr][tc]=pc;nb[r][c]=null;let nc=ca;if(pt==="K")nc=nc.replace(w?/[KQ]/g:/[kq]/g,"");if(pt==="R"){if(w&&r===7&&c===7)nc=nc.replace("K","");if(w&&r===7&&c===0)nc=nc.replace("Q","");if(!w&&r===0&&c===7)nc=nc.replace("k","");if(!w&&r===0&&c===0)nc=nc.replace("q","");}if(nc==="")nc="-";return{board:nb,from:[r,c],to:[tr,tc],ca:nc,ep:"-"};}return null;}
return null;}

export function computePositions(moves){const pos=[{fen:START,lastMove:null}];let cur=START;for(let i=0;i<moves.length;i++){const prev=parseFEN(cur);const r=resolveMove(cur,moves[i]);if(!r)break;const piece=prev.board[r.from[0]][r.from[1]];const nt=i%2===0?"b":"w";const nf=boardToFEN(r.board,nt,r.ca,r.ep);pos.push({fen:nf,lastMove:{from:r.from,to:r.to,piece}});cur=nf;}return pos;}
