export function CatScreen({cat,onBack,onSelect}){return <div style={{minHeight:"100vh",background:"linear-gradient(175deg,#faf9f6,#ede9e3)",fontFamily:"'Nunito',sans-serif",padding:"12px 16px 32px",display:"flex",flexDirection:"column",alignItems:"center"}}>
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
