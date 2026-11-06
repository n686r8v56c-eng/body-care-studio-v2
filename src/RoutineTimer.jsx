import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,Pause,SkipBack,SkipForward,RotateCcw,Plus,Save,Trash2,ChevronDown,Check,X,ExternalLink} from 'lucide-react';
import {normalizeVideoIds} from './videoLimits.js';
import './RoutineTimer.css';
const newId=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
const faceColors=['#ab8bd6','#8366c5','#80acd9','#638bd1','#bcb1ec','#7c9ac9','#9f81d8','#92bbec'];
const voiceColors=['#55b9a7','#85d4bb','#41a4a6','#a1d9d4','#72c7be','#4cbb93','#91b6b6','#b4e4cf'];
const nameOf=r=>r.en||r.title||r.ko||'동작';
const fmt=n=>{const s=Math.max(0,Math.ceil(n));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
export default function RoutineTimer({data,onUpdate,area,group,readOnly=false,theme='face',embedded=false}){
 const colors=theme==='voice'?voiceColors:faceColors;
 const [visible,setVisible]=useState(embedded),[selecting,setSelecting]=useState(false),[checked,setChecked]=useState([]);
 const [selectedId,setSelectedId]=useState(''),[draftName,setDraftName]=useState('');
 const [steps,setSteps]=useState([]),[index,setIndex]=useState(0),[remaining,setRemaining]=useState(60);
 const [playing,setPlaying]=useState(false),[autoNext,setAutoNext]=useState(true),[tone,setTone]=useState(true),[complete,setComplete]=useState(false);
 const timer=useRef(null),deadline=useRef(0),audio=useRef(null);
 const routines=useMemo(()=>(data.routines||[]).filter(x=>x.area===area&&x.group===group),[data.routines,area,group]);
 const catalog=useMemo(()=>(data.items||[]).filter(x=>x.area===area&&x.group===group&&!x.archived).sort((a,b)=>(a.level||1)-(b.level||1)||(a.sort||0)-(b.sort||0)),[data.items,area,group]);
 const available=useMemo(()=>catalog.flatMap(row=>normalizeVideoIds(row.videos).map((id,n)=>({key:row.id+':'+id,itemId:row.id,videoId:id,title:nameOf(row),level:row.level||1,videoNumber:n+1}))),[catalog]);
 const chosen=useMemo(()=>steps[index], [steps,index]);
 const stop=()=>{setPlaying(false);if(timer.current){clearInterval(timer.current);timer.current=null}};
 const sound=()=>{if(!tone)return;try{audio.current=audio.current||new (window.AudioContext||window.webkitAudioContext)();const ctx=audio.current;ctx.resume();const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.frequency.value=740;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.09,ctx.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.18);oscillator.connect(gain).connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.19)}catch{}};
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 useEffect(()=>{stop();setVisible(embedded);setSelecting(false);setChecked([]);setSelectedId('');setSteps([]);setIndex(0);setRemaining(60);setComplete(false)},[area,group]);
 const setRoutine=rows=>{stop();setSteps(rows.map(x=>({...x,seconds:Math.max(5,Number(x.seconds)||60)})));setIndex(0);setRemaining(Math.max(5,Number(rows[0]?.seconds)||60));setComplete(false);setSelecting(false);setVisible(true)};
 const chooseSaved=id=>{setSelectedId(id);const match=routines.find(r=>r.id===id);if(match){setRoutine(match.steps);setDraftName(match.name)}else{stop();setSteps([]);setIndex(0);setRemaining(60);setDraftName('');setComplete(false)}};
 const finishSelection=()=>{const result=available.filter(v=>checked.includes(v.key)).map(v=>({...v,seconds:60}));if(!result.length)return;setSelectedId('');setDraftName('');setRoutine(result)};
 const save=()=>{const name=draftName.trim();if(!name||!steps.length)return;const id=selectedId||newId();onUpdate(d=>{d.routines=Array.isArray(d.routines)?d.routines:[];const value={id,name,area,group,steps:steps.map(s=>({itemId:s.itemId,videoId:s.videoId,title:s.title,seconds:s.seconds}))};const i=d.routines.findIndex(r=>r.id===id);if(i<0)d.routines.push(value);else d.routines[i]=value});setSelectedId(id)};
 const remove=()=>{if(!selectedId||!window.confirm('저장된 루틴을 삭제할까? 기존 동작과 영상은 유지돼.'))return;onUpdate(d=>{d.routines=(d.routines||[]).filter(r=>r.id!==selectedId)});setSelectedId('');setDraftName('')};
 const advance=()=>{sound();if(index>=steps.length-1){stop();setComplete(true);setRemaining(0);return}const next=index+1;setIndex(next);setRemaining(steps[next].seconds);if(autoNext){deadline.current=performance.now()+steps[next].seconds*1000}else stop()};
 const advanceRef=useRef(advance);advanceRef.current=advance;
 useEffect(()=>{if(!playing)return;deadline.current=performance.now()+remaining*1000;timer.current=setInterval(()=>{const left=Math.max(0,(deadline.current-performance.now())/1000);if(left<=0)advanceRef.current();else setRemaining(left)},100);return()=>{clearInterval(timer.current);timer.current=null}},[playing,index]);
 const togglePlay=()=>{if(complete){setIndex(0);setRemaining(steps[0]?.seconds||60);setComplete(false);setPlaying(true)}else if(playing){setRemaining(Math.max(0,(deadline.current-performance.now())/1000));stop()}else if(steps.length)setPlaying(true)};
 const jump=n=>{stop();const at=Math.max(0,Math.min(steps.length-1,n));setIndex(at);setRemaining(steps[at]?.seconds||60);setComplete(false)};
 const updateDuration=(n,raw)=>{const value=Math.min(3600,Math.max(5,Number(raw)||60));setSteps(old=>old.map((s,i)=>i===n?{...s,seconds:value}:s));if(n===index){stop();setRemaining(value);setComplete(false)}};
 const total=steps.reduce((n,x)=>n+x.seconds,0);
 const elapsed=complete?total:steps.slice(0,index).reduce((n,x)=>n+x.seconds,0)+(chosen?chosen.seconds-remaining:0);
 const radius=96,circ=2*Math.PI*radius,part=chosen?remaining/chosen.seconds:0;
 return <section className={'routine-root '+(theme==='voice'?'routine-voice':'routine-face')} >
  {!embedded&&<div className="routine-heading"><strong>루틴 타이머</strong><button type="button" onClick={()=>setVisible(x=>!x)}>{visible?'접기':'열기'} <ChevronDown size={16}/></button></div>}
  {visible&&<>
   <div className="routine-top"><select aria-label="저장된 루틴 선택" value={selectedId} onChange={e=>chooseSaved(e.target.value)}><option value="">저장된 루틴 선택</option>{routines.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    <button type="button" className="routine-purple" onClick={()=>{stop();setSelecting(x=>!x);setChecked([])}}><Plus size={16}/> 영상 선택</button></div>
   {selecting&&<div className="routine-picker">
    <div className="routine-pickhead"><strong>영상 선택 · Lv.1~5 전체</strong><button type="button" onClick={()=>setSelecting(false)} aria-label="선택 닫기"><X size={17}/></button></div>
    {!available.length&&<p>현재 탭에 등록된 유튜브 영상이 없어.</p>}
    {catalog.filter(row=>normalizeVideoIds(row.videos).length).map(row=><div className="routine-source" key={row.id}><strong>Lv.{row.level} · {nameOf(row)}</strong>
     {normalizeVideoIds(row.videos).map((videoId,i)=>{const key=row.id+':'+videoId;return <label key={key}><input type="checkbox" checked={checked.includes(key)} onChange={e=>setChecked(v=>e.target.checked?[...v,key]:v.filter(x=>x!==key))}/> 영상 {i+1}<a href={'https://www.youtube.com/watch?v='+videoId} target="_blank" rel="noopener noreferrer" aria-label="영상 열기" onClick={e=>e.stopPropagation()}><ExternalLink size={14}/></a></label>})}</div>)}
    <button type="button" className="routine-purple routine-finish" disabled={!checked.length} onClick={finishSelection}><Check size={16}/> 선택 완료 ({checked.length})</button>
   </div>}
   {!!steps.length&&<div className="routine-player">
    <div className="routine-pie"><svg viewBox="0 0 240 240" role="img" aria-label="단계별 색상 파이 타이머">
     {steps.map((s,i)=>{const before=steps.slice(0,i).reduce((n,x)=>n+x.seconds,0)/total;const length=s.seconds/total;return <circle key={i} cx="120" cy="120" r={radius} fill="none" stroke={colors[i%colors.length]} strokeWidth="32" strokeDasharray={Math.max(0,circ*length-3)+' '+circ} strokeDashoffset={-circ*before} transform="rotate(-90 120 120)" opacity={(i<index||complete)?0.18:0.9}/>})}
     <circle cx="120" cy="120" r="67" fill="none" stroke={colors[index%colors.length]} strokeWidth="8" strokeDasharray={circ*part*67/96+' 421'} transform="rotate(-90 120 120)" opacity=".9"/>
     <text x="120" y="112" textAnchor="middle" fontSize="33" fill="currentColor" fontWeight="700">{fmt(remaining)}</text><text x="120" y="136" textAnchor="middle" fontSize="12" fill="currentColor">{complete?'완료':index+1+' / '+steps.length}</text>
    </svg></div>
    <div className="routine-current"><strong>{complete?'루틴 완료!':chosen?.title}</strong><small>{complete?'모든 연습을 마쳤어':index+1<steps.length?'다음 · '+steps[index+1].title:'마지막 연습'}</small></div>
    <div className="routine-controls"><button type="button" onClick={()=>jump(index-1)} aria-label="이전"><SkipBack size={20}/></button><button type="button" className="routine-purple" onClick={togglePlay}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'일시정지':complete?'다시 시작':'시작'}</button><button type="button" onClick={()=>jump(index+1)} aria-label="다음"><SkipForward size={20}/></button><button type="button" onClick={()=>jump(0)} aria-label="초기화"><RotateCcw size={18}/></button></div>
    <div className="routine-options"><label><input type="checkbox" checked={autoNext} onChange={e=>setAutoNext(e.target.checked)}/> 자동 다음</label><label><input type="checkbox" checked={tone} onChange={e=>setTone(e.target.checked)}/> 알림음</label><span>총 {fmt(total)} · 진행 {fmt(elapsed)}</span></div>
    <div className="routine-step-list">{steps.map((s,i)=><div className={'routine-step '+(i===index&&!complete?'active':'')} key={i} onClick={()=>jump(i)}><i style={{background:colors[i%colors.length]}}/><span>{i<index||complete?'✓ ':''}{s.title}</span><input aria-label={s.title+' 시간(초)'} type="number" min="5" max="3600" value={s.seconds} onClick={e=>e.stopPropagation()} onChange={e=>updateDuration(i,e.target.value)}/><small>초</small><a href={'https://www.youtube.com/watch?v='+s.videoId} target="_blank" rel="noopener noreferrer" aria-label={s.title+' 영상 열기'} onClick={e=>e.stopPropagation()}><ExternalLink size={15}/></a></div>)}</div>
    {!readOnly&&<div className="routine-save"><input aria-label="루틴 이름" placeholder="루틴 이름 (예: 아침 발성 6분)" value={draftName} onChange={e=>setDraftName(e.target.value)}/><button className="routine-purple" type="button" onClick={save} disabled={!draftName.trim()}><Save size={16}/> 저장</button>{selectedId&&<button type="button" onClick={remove} aria-label="루틴 삭제"><Trash2 size={17}/></button>}</div>}
   </div>}
  </>}
 </section>;
}
