import { useState, useEffect, useRef, useCallback } from "react";

const SpeechRecognition=typeof window!=="undefined"&&(window.SpeechRecognition||window.webkitSpeechRecognition);
export const HAS_VOICE=!!SpeechRecognition;

// Parse Chinese voice input to a chess move notation or navigation command
export function parseVoiceCommand(text){
  const t=text.trim().toLowerCase().replace(/\s+/g,"");
  // Navigation commands — fuzzy
  if(/下一|下步|next|继续/.test(t))return{type:"nav",cmd:"next"};
  if(/上一|回退|back|退一/.test(t))return{type:"nav",cmd:"prev"};
  if(/从头|开头|重新|重来|重置/.test(t))return{type:"nav",cmd:"start"};
  if(/自动|播放|连续/.test(t))return{type:"nav",cmd:"auto"};
  if(/暂停|停止|停下|停一/.test(t))return{type:"nav",cmd:"pause"};
  if(/翻转|换边|反过来|转过来/.test(t))return{type:"nav",cmd:"flip"};
  // Castling — many variations
  if(/长易位|大易位|后翼易位|长的易位/.test(t))return{type:"move",notation:"O-O-O"};
  if(/易位|王车|短易位|小易位/.test(t))return{type:"move",notation:"O-O"};

  // ---- Chess move parsing with high tolerance ----
  // Strip connectors: 到/去/走/吃/叉/打/杀/拿/取/×/x and whitespace
  let s=t.replace(/[到去走吃叉打杀拿取×x capture]/g,"");

  // Piece names — check longest first to avoid partial matches
  const pieceList=[
    ["骑士","N"],["主教","B"],["皇后","Q"],["国王","K"],["城堡","R"],
    ["马儿","N"],["马","N"],["象","B"],["车","R"],["后","Q"],["王","K"],
    ["knight","N"],["bishop","B"],["rook","R"],["queen","Q"],["king","K"]
  ];
  let piece="";
  for(const[cn,en]of pieceList){
    if(s.includes(cn)){piece=en;s=s.replace(cn,"");break;}
  }
  // "兵" = pawn, no notation prefix
  s=s.replace(/兵|小兵|卒/g,"");

  // Column mapping: speech recognition often converts letters to Chinese
  // Multi-char replacements first (longer patterns), then single-char
  const colMulti=[
    ["阿尔法","a"],["alpha","a"],["阿发","a"],["啊","a"],
    ["布拉沃","b"],["bravo","b"],
    ["查理","c"],["charlie","c"],
    ["德尔塔","d"],["delta","d"],
    ["艾克斯","x"],// avoid confusion
    ["爱抚","f"],["艾弗","f"],["哎辅","f"],["唉服","f"],["爱服","f"],["埃弗","f"],["哎服","f"],
    ["爱吃","h"],["哎吃","h"],["艾吃","h"],["爱曲","h"],["哎曲","h"],["艾奇","h"],
  ];
  for(const[k,v]of colMulti)s=s.replace(new RegExp(k,"g"),v);

  const colSingle={
    // A variants
    "诶":"a","哎":"a","矮":"a","唉":"a","挨":"a","嗳":"a","a":"a",
    // B variants
    "比":"b","逼":"b","必":"b","笔":"b","壁":"b","碧":"b","币":"b","毕":"b","b":"b",
    // C variants
    "西":"c","思":"c","斯":"c","撕":"c","丝":"c","司":"c","死":"c","四":"c","c":"c",
    // D variants
    "地":"d","第":"d","的":"d","弟":"d","帝":"d","迪":"d","低":"d","底":"d","滴":"d","d":"d",
    // E variants
    "一":"e","义":"e","已":"e","亦":"e","衣":"e","以":"e","依":"e","伊":"e","椅":"e","易":"e","亿":"e","e":"e",
    // F variants
    "付":"f","服":"f","副":"f","负":"f","附":"f","复":"f","富":"f","福":"f","夫":"f","腹":"f","f":"f",
    // G variants
    "鸡":"g","记":"g","基":"g","几":"g","机":"g","吉":"g","级":"g","急":"g","极":"g","集":"g","季":"g","纪":"g","计":"g","寄":"g","技":"g","g":"g",
    // H variants
    "吃":"h","尺":"h","齿":"h","池":"h","迟":"h","持":"h","赤":"h","h":"h",
  };
  // Replace single Chinese chars that map to columns (only if not already a-h)
  let result="";
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(colSingle[ch]&&!/[a-h]/.test(ch)){result+=colSingle[ch];}
    else{result+=ch;}
  }
  s=result;

  // Row mapping: Chinese number words → digits
  const rowMap={"一":"1","二":"2","三":"3","四":"4","五":"5","六":"6","七":"7","八":"8",
    "壹":"1","贰":"2","叁":"3","肆":"4","伍":"5","陆":"6","柒":"7","捌":"8",
    "两":"2","俩":"2","仨":"3"};
  result="";
  for(let i=0;i<s.length;i++){
    const ch=s[i];result+=rowMap[ch]||ch;
  }
  s=result;

  // Clean out any remaining non-useful chars
  s=s.replace(/[^a-h1-8nbrqk]/g,"");

  // Try to find column + row pattern
  const m=s.match(/([a-h])([1-8])/);
  if(m){
    return{type:"move",notation:piece+m[1]+m[2]};
  }

  // Fallback: if we have piece + just a column (ambiguous), still try
  const mc=s.match(/([a-h])/);
  if(piece&&mc){
    // Can't determine row, skip
  }
  return null;
}

export function useVoice(onCommand){
  const[listening,setListening]=useState(false);
  const[voiceText,setVoiceText]=useState("");
  const recRef=useRef(null);
  const start=useCallback(()=>{
    if(!HAS_VOICE||recRef.current)return;
    const rec=new SpeechRecognition();
    rec.lang="zh-CN";rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=3;
    rec.onresult=(e)=>{
      let final="",interim="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript;
        if(e.results[i].isFinal){final+=t;}else{interim+=t;}
      }
      if(interim)setVoiceText(interim);
      if(final){
        setVoiceText(final);
        // Try all alternatives for better matching
        const lastResult=e.results[e.results.length-1];
        let cmd=null;
        for(let a=0;a<lastResult.length;a++){
          cmd=parseVoiceCommand(lastResult[a].transcript);
          if(cmd)break;
        }
        if(cmd)onCommand(cmd);
        setTimeout(()=>setVoiceText(""),1500);
      }
    };
    rec.onerror=(e)=>{if(e.error!=="no-speech"&&e.error!=="aborted"){setListening(false);recRef.current=null;}};
    rec.onend=()=>{if(recRef.current){try{rec.start();}catch(e){setListening(false);recRef.current=null;}}};
    try{rec.start();recRef.current=rec;setListening(true);}catch(e){setListening(false);}
  },[onCommand]);
  const stop=useCallback(()=>{if(recRef.current){const r=recRef.current;recRef.current=null;r.stop();setListening(false);setVoiceText("");}},[]);
  const toggle=useCallback(()=>{listening?stop():start();},[listening,start,stop]);
  useEffect(()=>()=>{if(recRef.current){recRef.current.stop();recRef.current=null;}},[]);
  return{listening,voiceText,toggle};
}
