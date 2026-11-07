import React,{useEffect,useMemo,useRef,useState} from 'react';
import CareLibrary from './CareLibrary.jsx';
import './RoutineTimer.css';

export const CORE_CATEGORIES=Object.freeze([
 '몸통 굴곡','몸통 신전','몸통 회전','신전 저항','회전 저항','측면 안정화','복합·통합'
]);
const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
const fmt=n=>{const s=Math.max(0,Math.ceil(n));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const btn={padding:'10px 12px',borderRadius:10,border:'1px solid #bca6d8',background:'transparent',color:'inherit',cursor:'pointer'};
const panel={padding:14,border:'1px solid #ddd5e7',borderRadius:12,marginBottom:10};
const nameOf=(id,techniques)=>techniques.find(t=>t.id===id)?.name||'삭제된 기술';
function CoreTechniques({data}){
 const [filter,setFilter]=useState(-1);
 const techniques=data.coreTechniques||[];
 return <section style={{padding:'16px'}}>
  <h2>코어 · 기술 라이브러리</h2>
  <p style={{fontSize:13,opacity:.7}}>영상 인박스와 분리된 기술 공간. 검토·승인된 기술을 분류별로 볼 수 있어. 이미지가 확인되지 않은 기술은 텍스트로 표시돼.</p>
  <div style={{display:'grid',gap:8,marginBottom:14}}>
   {CORE_CATEGORIES.map((name,i)=><button type="button" key={name} onClick={()=>setFilter(filter===i?-1:i)} style={{...btn,textAlign:'left',background:filter===i?'#eee5fb':'transparent',color:filter===i?'#382552':'inherit',display:'flex',justifyContent:'space-between'}}><strong>{i+1}. {name}</strong><span>{techniques.filter(x=>x.category===i).length}개</span></button>)}
  </div>
  {filter!==-1&&<button style={btn} onClick={()=>setFilter(-1)}>전체 보기</button>}
  {techniques.filter(x=>filter===-1||x.category===filter).map(t=><article key={t.id} style={{...panel,display:'flex',gap:12,alignItems:'flex-start'}}>
   {t.imageUrl&&<img src={t.imageUrl} alt="" loading="lazy" style={{height:72,width:84,objectFit:'cover',borderRadius:8}} onError={e=>{e.currentTarget.style.display='none'}}/>}
   <div><strong>{t.name}</strong><p style={{margin:'4px 0',fontSize:12,opacity:.7}}>{CORE_CATEGORIES[t.category]}</p>{t.en&&<p style={{fontSize:12,margin:'4px 0',opacity:.65}}>{t.en}</p>}
    {t.posture&&<p style={{fontSize:12,margin:'4px 0'}}><strong>자세</strong> · {t.posture}</p>}
    {t.muscles&&<p style={{fontSize:12,margin:'4px 0'}}><strong>근육</strong> · {t.muscles}</p>}
    {t.description&&<p style={{fontSize:13,margin:'6px 0'}}>{t.description}</p>}
    {!!t.tags?.length&&<p style={{fontSize:12,opacity:.7}}>{t.tags.join(' · ')}</p>}
    {t.notes&&<p style={{fontSize:13}}>{t.notes}</p>}</div>
  </article>)}
  {!techniques.length&&<p style={{fontSize:13,opacity:.7}}>아직 등록된 기술이 없어. 타임라인 분석 뒤 승인된 기술만 추가할 예정이야.</p>}
 </section>;
}
function CoreTimer({data,onUpdate}){
 const techniques=data.coreTechniques||[];
 const routines=data.coreRoutines||[];
 const [routineId,setRoutineId]=useState('');
 const [name,setName]=useState('');
 const [steps,setSteps]=useState([]);
 const [adding,setAdding]=useState(false);
 const [index,setIndex]=useState(0);
 const [remaining,setRemaining]=useState(60);
 const [playing,setPlaying]=useState(false);
 const [done,setDone]=useState(false);
 const endAt=useRef(0),lastTick=useRef(0),playingRef=useRef(false),stepsRef=useRef(steps),indexRef=useRef(index);
 stepsRef.current=steps;indexRef.current=index;playingRef.current=playing;
 const saveElapsed=seconds=>{
  const amount=Math.max(0,Math.min(3600,Math.round(seconds)));
  if(amount<1)return;
  onUpdate(d=>{d.coreLogs=d.coreLogs||[];d.coreLogs.push({id:uid(),date:day(),seconds:amount})});
 };
 const pause=()=>{
  if(!playingRef.current)return;
  const now=Date.now();saveElapsed((now-lastTick.current)/1000);
  setRemaining(Math.max(0,(endAt.current-now)/1000));setPlaying(false);playingRef.current=false;
 };
 useEffect(()=>{
  if(!playing)return;
  const handle=()=>{
   const now=Date.now(),left=Math.max(0,(endAt.current-now)/1000);
   setRemaining(left);
   if(left<=0){
    saveElapsed((now-lastTick.current)/1000);
    setPlaying(false);playingRef.current=false;
    const next=indexRef.current+1;
    if(next<stepsRef.current.length){
     indexRef.current=next;setIndex(next);
     const duration=stepsRef.current[next].seconds;
     lastTick.current=now;endAt.current=now+duration*1000;
     setRemaining(duration);setPlaying(true);playingRef.current=true;
    }else setDone(true);
   }
  };
  const clock=setInterval(handle,200);
  return()=>clearInterval(clock);
 },[playing,index]);
 useEffect(()=>()=>{if(playingRef.current&&lastTick.current){saveElapsed((Date.now()-lastTick.current)/1000)}},[]);
 const total=steps.reduce((n,s)=>n+s.seconds,0);
 const selectRoutine=id=>{
  pause();const item=routines.find(r=>r.id===id);setRoutineId(id);setName(item?.name||'');
  const list=item?.steps?.map(s=>({...s}))||[];
  setSteps(list);setIndex(0);setRemaining(list[0]?.seconds||60);setDone(false);
 };
 const add=id=>{
  pause();const next=[...steps,{techniqueId:id,seconds:60}];setSteps(next);
  if(steps.length===0){setIndex(0);setRemaining(60)}
  setRoutineId('');setDone(false);setAdding(false);
 };
 const edit=(i,patch)=>{
  pause();const next=steps.map((s,n)=>n===i?{...s,...patch}:s);
  setSteps(next);setRoutineId('');if(i===index&&patch.seconds)setRemaining(patch.seconds);
 };
 const remove=i=>{
  pause();const next=steps.filter((_,n)=>n!==i);setSteps(next);setRoutineId('');
  setIndex(0);setRemaining(next[0]?.seconds||60);setDone(false);
 };
 const move=(i,dir)=>{pause();const j=i+dir;if(j<0||j>=steps.length)return;const next=[...steps];[next[i],next[j]]=[next[j],next[i]];setSteps(next);setIndex(0);setRemaining(next[0]?.seconds||60);setRoutineId('')};
 const start=()=>{if(!steps.length)return;if(done){setDone(false);setIndex(0);indexRef.current=0;setRemaining(steps[0].seconds)}
  lastTick.current=Date.now();endAt.current=lastTick.current+(done?steps[0].seconds:remaining)*1000;setPlaying(true);playingRef.current=true};
 const skip=()=>{pause();const n=index+1;if(n<steps.length){setIndex(n);setRemaining(steps[n].seconds)}else{setDone(true);setRemaining(0)}};
 const save=()=>{if(!steps.length||!name.trim())return;const id=routineId||uid();onUpdate(d=>{d.coreRoutines=d.coreRoutines||[];const value={id,name:name.trim(),steps:steps.map(x=>({...x}))};const at=d.coreRoutines.findIndex(x=>x.id===id);if(at<0)d.coreRoutines.push(value);else d.coreRoutines[at]=value});setRoutineId(id)};
 return <section style={{padding:'16px'}}>
  <h2>코어 · 타이머</h2>
  <p style={{fontSize:13,opacity:.7}}>기술 라이브러리에서 동작을 선택하고 나만의 시퀀스를 만들어.</p>
  <select aria-label="저장된 시퀀스" value={routineId} onChange={e=>selectRoutine(e.target.value)} style={{width:'100%',padding:12,borderRadius:10,marginBottom:12}}><option value="">저장된 시퀀스 선택</option>{routines.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
  <div className="routine-root routine-face" style={{padding:10,borderRadius:16,marginBottom:12}}>
   <div style={{textAlign:'center',padding:'15px 0'}}>
    <div style={{fontSize:13,opacity:.7}}>{steps.length?nameOf(steps[index]?.techniqueId,techniques):'시퀀스를 구성해 줘'}</div>
    <div style={{fontSize:56,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(remaining)}</div>
    <div style={{fontSize:12,opacity:.7}}>총 {steps.length}개 동작 · {fmt(total)}</div>
   </div>
   <div style={{display:'flex',justifyContent:'center',gap:8,flexWrap:'wrap'}}>
    <button style={btn} disabled={!steps.length} onClick={()=>{pause();setIndex(0);setRemaining(steps[0]?.seconds||60);setDone(false)}}>처음</button>
    <button style={{...btn,background:'#a18acb',color:'#fff'}} disabled={!steps.length} onClick={playing?pause:start}>{playing?'일시정지':done?'다시 시작':'시작'}</button>
    <button style={btn} disabled={!steps.length} onClick={skip}>다음</button>
   </div>
  </div>
  <button style={{...btn,width:'100%',marginBottom:12}} onClick={()=>setAdding(v=>!v)}>+ 기술 라이브러리에서 선택</button>
  {adding&&<div style={panel}>
   {CORE_CATEGORIES.map((cat,i)=><div key={cat}>
    <strong style={{fontSize:13}}>{cat}</strong>
    {techniques.filter(t=>t.category===i).map(t=><button style={{...btn,display:'block',width:'100%',textAlign:'left',margin:'6px 0'}} key={t.id} onClick={()=>add(t.id)}>+ {t.name}</button>)}
   </div>)}
   {!techniques.length&&<p>승인·등록된 기술이 생기면 여기에서 선택할 수 있어.</p>}
  </div>}
  {steps.map((s,i)=><div style={{...panel,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:i===index?'rgba(155,125,210,.12)':'transparent'}} key={i}>
   <strong style={{flex:'1 1 130px'}}>{i+1}. {nameOf(s.techniqueId,techniques)}</strong>
   <label style={{fontSize:12}}>초 <input aria-label="동작 시간(초)" type="number" min="5" max="3600" value={s.seconds} onChange={e=>edit(i,{seconds:Math.min(3600,Math.max(5,Number(e.target.value)||60))})} style={{width:64,padding:6}}/></label>
   <button style={btn} aria-label="위로 이동" disabled={i===0} onClick={()=>move(i,-1)}>↑</button>
   <button style={btn} aria-label="아래로 이동" disabled={i===steps.length-1} onClick={()=>move(i,1)}>↓</button>
   <button style={btn} aria-label="동작 제거" onClick={()=>remove(i)}>×</button>
  </div>)}
  <div style={{display:'flex',gap:8}}>
   <input value={name} aria-label="시퀀스 이름" placeholder="시퀀스 이름" onChange={e=>setName(e.target.value)} style={{flex:1,minWidth:0,padding:10,borderRadius:10}}/>
   <button style={btn} disabled={!name.trim()||!steps.length} onClick={save}>시퀀스 저장</button>
  </div>
 </section>;
}
function CoreRecords({logs=[]}){
 const today=day(),current=logs.filter(x=>x.date===today).reduce((n,x)=>n+x.seconds,0);
 const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')});
 return <section style={{padding:16}}>
  <h2>코어 · 기록</h2>
  <div style={panel}><span>오늘의 코어 운동</span><h2 style={{margin:'8px 0'}}>{fmt(current)}</h2></div>
  <h3>최근 7일</h3>
  {dates.map(date=><div key={date} style={{...panel,display:'flex',justifyContent:'space-between'}}><span>{date}</span><strong>{fmt(logs.filter(x=>x.date===date).reduce((n,x)=>n+x.seconds,0))}</strong></div>)}
  <p style={{fontSize:12,opacity:.7}}>타이머에서 실제 진행한 시간만 기록해.</p>
 </section>;
}
export default function CoreStudio({tab,data,onUpdate,sync}){
 if(tab==='inbox')return <section aria-label="코어 영상 인박스">
  <div style={{padding:'14px 16px 4px'}}><h2 style={{margin:'0 0 4px',fontSize:20}}>코어 · 영상 인박스</h2><p style={{margin:'0 0 10px',fontSize:13,opacity:.7}}>영상 링크만 저장해. 기술 분석은 나중에.</p></div>
  <CareLibrary data={data} onUpdate={onUpdate} area="core" group="massage" sync={sync}/>
 </section>;
 if(tab==='timer')return <CoreTimer data={data} onUpdate={onUpdate}/>;
 if(tab==='records')return <CoreRecords logs={data.coreLogs||[]}/>;
 return <CoreTechniques data={data}/>;
}
