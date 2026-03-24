export function MoveArrow({from,to,sq,flipped,piece}){
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
