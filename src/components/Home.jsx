import { DATA } from "../data/openings";

export function Home({onSelect}){return <div style={{minHeight:"100vh",background:"linear-gradient(175deg,#faf9f6,#ede9e3)",fontFamily:"'Nunito',sans-serif",padding:"28px 16px 32px",display:"flex",flexDirection:"column",alignItems:"center"}}>
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
