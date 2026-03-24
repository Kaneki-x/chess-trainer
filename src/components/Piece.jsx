const pieceImg=(p)=>{
  const color=p===p.toUpperCase()?"w":"b";
  const name=p.toLowerCase();
  return `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${color}${name}.png`;
};

export function Pc({p,sz}){
  return <div style={{userSelect:"none",display:"flex",alignItems:"center",justifyContent:"center",width:sz,height:sz}}><img src={pieceImg(p)} alt={p} draggable={false} style={{width:sz*0.88,height:sz*0.88}} /></div>;
}
