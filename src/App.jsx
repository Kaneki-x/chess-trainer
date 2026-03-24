import { useState } from "react";
import { StudyScreen } from "./components/StudyScreen";
import { CatScreen } from "./components/CatScreen";
import { Home } from "./components/Home";

export default function App(){
  const[screen,setScreen]=useState("home");
  const[cat,setCat]=useState(null);
  const[vari,setVari]=useState(null);
  if(screen==="study"&&vari&&cat)return <StudyScreen variation={vari} color={cat.color} onBack={()=>setScreen("cat")}/>;
  if(screen==="cat"&&cat)return <CatScreen cat={cat} onBack={()=>setScreen("home")} onSelect={v=>{setVari(v);setScreen("study");}}/>;
  return <Home onSelect={c=>{setCat(c);setScreen("cat");}}/>;
}
