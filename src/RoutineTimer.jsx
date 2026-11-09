import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,Pause,SkipBack,SkipForward,RotateCcw,Plus,Save,Trash2,ChevronDown,Check,X,ExternalLink} from 'lucide-react';
import {normalizeVideoIds} from './videoLimits.js';
import './RoutineTimer.css';
const newId=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
const faceColors=['#ab8bd6','#8366c5','#80acd9','#638bd1','#bcb1ec','#7c9ac9','#9f81d8','#92bbec'];
const voiceColors=['#55b9a7','#85d4bb','#41a4a6','#a1d9d4','#72c7be','#4cbb93','#91b6b6','#b4e4cf'];
const butterColors=['#e4c55c','#f0d98a','#d5ad48','#f7e5b0','#d9c06e','#eccb72','#e3b859','#f4dfa1'];
const nameOf=r=>r.en||r.title||r.ko||'동작';
const fmt=n=>{const s=Math.max(0,Math.ceil(n));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const deviceToken=()=>{
 try{
  const key='body-care-timer-device-v2';
  let id=sessionStorage.getItem(key);
  if(!id){id=newId()+'-'+newId();sessionStorage.setItem(key,id)}
  return id;
 }catch{return newId()+'-'+newId()}
};
// Interpret a server snapshot using the last authoritative server update time.
const resolveRemote=(row)=>{
 const raw=row?.state||{},steps=Array.isArray(raw.steps)?raw.steps:[];
 if(!steps.length)return {...raw,steps:[],index:0,remaining:60,playing:false,complete:false};
 let index=Math.max(0,Math.min(steps.length-1,Number(raw.index)||0));
 let remaining=Math.max(0,Number.isFinite(Number(raw.remaining))?Number(raw.remaining):(Number(steps[index].seconds)||60));
 let complete=!!raw.complete;
 const leaseLive=row?.lease_until&&Date.parse(row.lease_until)>Date.now();
 if(raw.playing&&!complete&&leaseLive){
  let elapsed=Math.max(0,(Date.now()-Date.parse(row.updated_at))/1000);
  while(elapsed>0&&!complete){
   if(elapsed<remaining){remaining-=elapsed;break}
   elapsed-=remaining;
   if(index>=steps.length-1){remaining=0;complete=true;break}
   if(raw.autoNext===false){remaining=0;break}
   index++;remaining=Math.max(5,Number(steps[index].seconds)||60);
  }
 }
 return {...raw,steps,index,remaining,complete,playing:!!raw.playing&&!!leaseLive&&!complete&&remaining>0};
};
const readDraft=key=>{
 try{
  const raw=JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null');
  if(!raw||!Array.isArray(raw.steps))return null;
  const steps=raw.steps.filter(s=>s&&typeof s.videoId==='string'&&/^[\w-]{11}$/.test(s.videoId)).map(s=>({...s,seconds:Math.max(5,Math.min(3600,Number(s.seconds)||60))}));
  if(!steps.length)return null;
  const index=Math.max(0,Math.min(steps.length-1,Number(raw.index)||0));
  return {steps,index,remaining:Math.max(0,Math.min(steps[index].seconds,Number(raw.remaining)||0)),selectedId:String(raw.selectedId||''),draftName:String(raw.draftName||''),complete:!!raw.complete,autoNext:raw.autoNext!==false,tone:raw.tone!==false};
 }catch{return null}
};
export default function RoutineTimer({data,onUpdate,area,group,readOnly=false,theme='face',embedded=false,userId='',onRecordSeconds=()=>{},database=null}) {
 const colors=theme==='gym'?butterColors:['voice','strength'].includes(theme)?voiceColors:faceColors;
 const draftKey='body-care-timer-draft:v1:'+String(userId||'guest')+':'+area+':'+group+':'+theme;
 const initialDraft=useMemo(()=>readDraft(draftKey),[draftKey]);
 const [visible,setVisible]=useState(embedded),[selecting,setSelecting]=useState(false),[checked,setChecked]=useState([]);
 const [stepsExpanded,setStepsExpanded]=useState(false),[videoExpanded,setVideoExpanded]=useState(false);
 const [expandedLevels,setExpandedLevels]=useState([]);
 const [selectedId,setSelectedId]=useState(initialDraft?.selectedId||''),[draftName,setDraftName]=useState(initialDraft?.draftName||'');
 const [steps,setSteps]=useState(initialDraft?.steps||[]),[index,setIndex]=useState(initialDraft?.index||0),[remaining,setRemaining]=useState(initialDraft?.remaining??60);
 const [playing,setPlaying]=useState(false),[autoNext,setAutoNext]=useState(initialDraft?.autoNext??true),[tone,setTone]=useState(initialDraft?.tone??true),[complete,setComplete]=useState(initialDraft?.complete||false);
 const [isOwner,setIsOwner]=useState(!database||!userId),[syncState,setSyncState]=useState(database&&userId?'연결 중':'기기 저장');
 const controller=useRef(!database||!userId),hydrated=useRef(!database||!userId),cloudReady=useRef(true);
 const identity=useMemo(()=>deviceToken()+':'+newId(),[]);
 const sameDevicePrefix=identity.slice(0,identity.lastIndexOf(':'));
 const autoClaiming=useRef(false);
 const remoteRef=useRef(null),viewRemote=useRef(null),sending=useRef(false),sendAgain=useRef(false);
 const latest=useRef(null),applyRemoteRef=useRef(null),saveRemoteRef=useRef(null);
 const timer=useRef(null),deadline=useRef(0),audio=useRef(null);
 const tracking=useRef(null),reportRef=useRef(onRecordSeconds);
 reportRef.current=onRecordSeconds;
 const flushTracking=()=>{
  const state=tracking.current;
  if(!state)return;
  const now=Date.now();
  const seconds=Math.min(state.left,Math.max(0,(now-state.last)/1000));
  state.last=now;state.left=Math.max(0,state.left-seconds);
  if(seconds>0)reportRef.current(theme,seconds);
  if(state.left<=0)tracking.current=null;
 };
 const beginTracking=seconds=>{tracking.current={last:Date.now(),left:Math.max(0,seconds)}};
 const flushRef=useRef(flushTracking);flushRef.current=flushTracking;
 const activeRemaining=()=>playing?Math.max(0,(deadline.current-performance.now())/1000):remaining;
 latest.current={steps,index,remaining:activeRemaining(),playing,selectedId,draftName,complete,autoNext,tone};
 const restoreState=(snapshot)=>{
  if(!snapshot)return;
  stop();
  const entries=Array.isArray(snapshot.steps)?snapshot.steps:[];
  setSteps(entries);setIndex(Math.max(0,Math.min(entries.length-1,Number(snapshot.index)||0)));
  setRemaining(Math.max(0,Number(snapshot.remaining)||0));
  setSelectedId(String(snapshot.selectedId||''));
  setDraftName(String(snapshot.draftName||''));
  setComplete(!!snapshot.complete);
  setAutoNext(snapshot.autoNext!==false);setTone(snapshot.tone!==false);
  setSelecting(false);
 };
 applyRemoteRef.current=restoreState;
 const cloudKey=area+':'+theme;
 const sendRemote=async()=>{
  if(!database||!userId||!cloudReady.current||!controller.current||!hydrated.current)return;
  if(sending.current){sendAgain.current=true;return}
  sending.current=true;
  try{
   const snapshot={...latest.current,remaining:Math.ceil(latest.current.remaining)};
   const {data:row,error}=await database.rpc('body_care_timer_command',{
    p_area:area,p_category:theme,p_command:'save',p_device:identity,p_state:snapshot
   });
   if(error)throw error;
   remoteRef.current=row;setSyncState('동기화됨');
  }catch(e){
   controller.current=false;setIsOwner(false);setSyncState('연결 실패 · 기기 임시 저장');
   setPlaying(false);tracking.current=null;
  }finally{
   sending.current=false;
   if(sendAgain.current){sendAgain.current=false;if(controller.current)saveRemoteRef.current?.()}
  }
 };
 saveRemoteRef.current=sendRemote;
 const loadRemote=async(initial=false)=>{
  if(!database||!userId)return;
  try{
   const {data:row,error}=await database.from('body_care_timer_sessions')
    .select('*').eq('user_id',userId).eq('area',area).eq('category',theme).maybeSingle();
   if(error)throw error;
   if(!row){
    if(initial||!cloudReady.current){
     const {data:newRow,error:claimError}=await database.rpc('body_care_timer_command',{
      p_area:area,p_category:theme,p_command:'claim',p_device:identity,p_state:latest.current
     });
     if(claimError)throw claimError;
     if(!newRow?.owner_token||newRow.owner_token!==identity)return;
     cloudReady.current=true;remoteRef.current=newRow;controller.current=true;hydrated.current=true;
     setIsOwner(true);setSyncState('동기화됨');
    }
    return;
   }
   cloudReady.current=true;remoteRef.current=row;
   const leaseActive=Date.parse(row.lease_until||'')>Date.now();
   const isMine=row.owner_token===identity&&leaseActive;
   // A previous mount on this phone may have released control, but its saved
   // server snapshot must survive. Reclaim only if the controller is not active,
   // or its token belongs to this same browser session.
   const samePhone=row.owner_token===sameDevicePrefix||
     String(row.owner_token||'').startsWith(sameDevicePrefix+':');
   if(!isMine&&(!leaseActive||!row.owner_token||samePhone)&&!autoClaiming.current){
    autoClaiming.current=true;
    try{
     const {data:claimed,error:claimError}=await database.rpc('body_care_timer_command',{
      p_area:area,p_category:theme,p_command:'claim',p_device:identity,p_state:null
     });
     if(claimError)throw claimError;
     const snapshot=resolveRemote(row);
     applyRemoteRef.current({...snapshot,playing:false});
     remoteRef.current=claimed;viewRemote.current=null;
     controller.current=true;hydrated.current=true;
     setIsOwner(true);setSyncState('동기화됨 · 자동 이어받기');
     setTimeout(()=>saveRemoteRef.current?.(),150);
     return;
    }finally{autoClaiming.current=false}
   }
   if(isMine){
    if(!controller.current){
     const snap=resolveRemote(row);
     applyRemoteRef.current({...snap,playing:false});
    }
    controller.current=true;hydrated.current=true;
    viewRemote.current=null;setIsOwner(true);setSyncState('동기화됨');
    return;
   }
   if(controller.current){
    controller.current=false;
    tracking.current=null;
    setPlaying(false);
   }
   const changed=viewRemote.current?.revision!==row.revision;
   viewRemote.current=row;
   hydrated.current=true;setIsOwner(false);setSyncState('다른 기기와 동기화됨');
   if(changed){
    const snap=resolveRemote(row);
    applyRemoteRef.current({...snap,playing:false});
   }
  }catch(e){
   // Preserve the previous local timer until its SQL table is available.
   cloudReady.current=false;
   hydrated.current=true;
   controller.current=true;setIsOwner(true);
   setSyncState('SQL 연결 전 · 기기 저장만 가능');
  }
 };
 const loadRef=useRef(loadRemote);loadRef.current=loadRemote;
 useEffect(()=>{
  if(!database||!userId)return;
  let mounted=true;
  loadRef.current(true);
  const poll=setInterval(()=>{if(mounted)loadRef.current(false)},1800);
  const heartbeat=setInterval(()=>{if(mounted&&controller.current)saveRemoteRef.current?.()},3000);
  return()=>{
   mounted=false;clearInterval(poll);clearInterval(heartbeat);
   if(controller.current&&cloudReady.current){
    const snapshot={...latest.current,remaining:Math.ceil(latest.current.remaining),playing:false};
    database.rpc('body_care_timer_command',{
     p_area:area,p_category:theme,p_command:'release',p_device:identity,p_state:snapshot
    }).then(()=>{}).catch(()=>{});
   }
  };
 },[database,userId,cloudKey,identity]);
 const signature=JSON.stringify({steps,index,remaining:playing?null:Math.ceil(remaining),playing,selectedId,draftName,complete,autoNext,tone});
 useEffect(()=>{
  if(!database||!userId||!controller.current||!hydrated.current)return;
  const job=setTimeout(()=>saveRemoteRef.current?.(),350);
  return()=>clearTimeout(job);
 },[signature,cloudKey]);
 useEffect(()=>{
  if(!database||!userId)return;
  const refresh=setInterval(()=>{
   if(controller.current||!viewRemote.current)return;
   const state=resolveRemote(viewRemote.current);
   setIndex(old=>old===state.index?old:state.index);
   setRemaining(state.remaining);setComplete(!!state.complete);
  },250);
  return()=>clearInterval(refresh);
 },[database,userId,cloudKey]);
 const takeOver=async()=>{
  if(!database||!userId){controller.current=true;setIsOwner(true);return}
  try{
   const {data:row,error}=await database.rpc('body_care_timer_command',{
    p_area:area,p_category:theme,p_command:'claim',p_device:identity,p_state:null
   });
   if(error)throw error;
   const previous=viewRemote.current||remoteRef.current||row;
   const snap=resolveRemote(previous);
   applyRemoteRef.current({...snap,playing:false});
   controller.current=true;hydrated.current=true;viewRemote.current=null;remoteRef.current=row;
   setIsOwner(true);setSyncState('동기화됨');
   setTimeout(()=>saveRemoteRef.current?.(),100);
  }catch(e){setSyncState('연결 실패 · '+e.message)}
 };

 const routines=useMemo(()=>(data.routines||[]).filter(x=>x.area===area&&x.group===group),[data.routines,area,group]);
 const catalog=useMemo(()=>(data.items||[]).filter(x=>x.area===area&&x.group===group&&!x.archived).sort((a,b)=>(a.level||1)-(b.level||1)||(a.sort||0)-(b.sort||0)),[data.items,area,group]);
 const available=useMemo(()=>catalog.flatMap(row=>normalizeVideoIds(row.videos).map((id,n)=>({key:row.id+':'+id,itemId:row.id,videoId:id,title:nameOf(row),level:row.level||1,videoNumber:n+1}))),[catalog]);
 const chosen=useMemo(()=>steps[index], [steps,index]);
 useEffect(()=>{setVideoExpanded(false)},[index,chosen?.videoId]);
 const levels=useMemo(()=>Array.from({length:5},(_,i)=>i+1).map(level=>({level,rows:catalog.filter(row=>(row.level||1)===level&&normalizeVideoIds(row.videos).length>0)})),[catalog]);
 const stop=()=>{flushTracking();tracking.current=null;setPlaying(false);if(timer.current){clearInterval(timer.current);timer.current=null}};
 const sound=()=>{if(!tone)return;try{audio.current=audio.current||new (window.AudioContext||window.webkitAudioContext)();const ctx=audio.current;ctx.resume();const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.frequency.value=740;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.09,ctx.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.18);oscillator.connect(gain).connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.19)}catch{}};
 useEffect(()=>()=>{flushRef.current();tracking.current=null;if(timer.current)clearInterval(timer.current)},[]);
 // Keep an unsaved routine while switching tabs. Restored timers are paused.
 useEffect(()=>{
  try{
   if(!steps.length){localStorage.removeItem(draftKey);sessionStorage.removeItem(draftKey);return}
   const snapshot=JSON.stringify({steps,index,remaining:Math.ceil(remaining),selectedId,draftName,complete,autoNext,tone});
   localStorage.setItem(draftKey,snapshot);
   sessionStorage.setItem(draftKey,snapshot);
  }catch{}
 },[draftKey,steps,index,Math.ceil(remaining),selectedId,draftName,complete,autoNext,tone]);
 const setRoutine=rows=>{stop();setSteps(rows.map(x=>({...x,seconds:Math.max(5,Number(x.seconds)||60)})));setIndex(0);setRemaining(Math.max(5,Number(rows[0]?.seconds)||60));setComplete(false);setSelecting(false);setVisible(true)};
 const chooseSaved=id=>{setSelectedId(id);const match=routines.find(r=>r.id===id);if(match){setRoutine(match.steps);setDraftName(match.name)}else{stop();setSteps([]);setIndex(0);setRemaining(60);setDraftName('');setComplete(false)}};
 const togglePicker=()=>{stop();setSelecting(x=>!x);setChecked([]);setExpandedLevels([])};
 const finishSelection=()=>{const defaultSeconds=theme==='voice'?120:300;const result=available.filter(v=>checked.includes(v.key)).map(v=>({...v,seconds:defaultSeconds}));if(!result.length)return;setSelectedId('');setDraftName('');setRoutine(result)};
 const save=()=>{const name=draftName.trim();if(!name||!steps.length)return;const id=selectedId||newId();onUpdate(d=>{d.routines=Array.isArray(d.routines)?d.routines:[];const value={id,name,area,group,steps:steps.map(s=>({itemId:s.itemId,videoId:s.videoId,title:s.title,seconds:s.seconds}))};const i=d.routines.findIndex(r=>r.id===id);if(i<0)d.routines.push(value);else d.routines[i]=value});setSelectedId(id)};
 const remove=()=>{if(!selectedId||!window.confirm('저장된 루틴을 삭제할까? 기존 동작과 영상은 유지돼.'))return;onUpdate(d=>{d.routines=(d.routines||[]).filter(r=>r.id!==selectedId)});setSelectedId('');setDraftName('')};
 const advance=()=>{flushTracking();tracking.current=null;sound();if(index>=steps.length-1){stop();setComplete(true);setRemaining(0);return}const next=index+1;setIndex(next);setRemaining(steps[next].seconds);if(autoNext){deadline.current=performance.now()+steps[next].seconds*1000;beginTracking(steps[next].seconds)}else stop()};
 const advanceRef=useRef(advance);advanceRef.current=advance;
 useEffect(()=>{if(!playing)return;deadline.current=performance.now()+remaining*1000;timer.current=setInterval(()=>{const left=Math.max(0,(deadline.current-performance.now())/1000);if(left<=0)advanceRef.current();else{setRemaining(left);if(tracking.current&&Date.now()-tracking.current.last>=10000)flushTracking()}},100);return()=>{clearInterval(timer.current);timer.current=null}},[playing,index]);
 const togglePlay=()=>{if(complete){setIndex(0);setRemaining(steps[0]?.seconds||60);setComplete(false);beginTracking(steps[0]?.seconds||60);setPlaying(true)}else if(playing){setRemaining(Math.max(0,(deadline.current-performance.now())/1000));stop()}else if(steps.length){beginTracking(remaining);setPlaying(true)}};
 const jump=n=>{stop();const at=Math.max(0,Math.min(steps.length-1,n));setIndex(at);setRemaining(steps[at]?.seconds||60);setComplete(false)};
 const updateDuration=(n,raw)=>{const minutes=Number(raw);if(!Number.isFinite(minutes)||minutes<=0)return;const value=Math.min(3600,Math.max(5,Math.round(minutes*60)));setSteps(old=>old.map((s,i)=>i===n?{...s,seconds:value}:s));if(n===index){stop();setRemaining(value);setComplete(false)}};
 const total=steps.reduce((n,x)=>n+x.seconds,0);
 const elapsed=complete?total:steps.slice(0,index).reduce((n,x)=>n+x.seconds,0)+(chosen?chosen.seconds-remaining:0);
 const radius=96,circ=2*Math.PI*radius,part=chosen?Math.max(0,Math.min(1,remaining/chosen.seconds)):0;
 return <section className={'routine-root routine-'+theme} >
  {!embedded&&<div className="routine-heading"><strong>루틴 타이머</strong><button type="button" onClick={()=>setVisible(x=>!x)}>{visible?'접기':'열기'} <ChevronDown size={16}/></button></div>}
  {visible&&<>
   <div className="routine-top"><select disabled={!isOwner} aria-label="저장된 루틴 선택" value={selectedId} onChange={e=>chooseSaved(e.target.value)}><option value="">저장된 루틴 선택</option>{routines.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    <button type="button" disabled={!isOwner} className={selecting&&checked.length?"routine-finish-top":"routine-purple"} onClick={()=>selecting&&checked.length?finishSelection():togglePicker()}>{selecting&&checked.length?<><Check size={16}/> 선택 완료 ({checked.length})</>:<><Plus size={16}/> 영상 선택</>}</button></div>
   {selecting&&<div className="routine-picker">
    <div className="routine-pickhead"><strong>영상 선택 · Lv.1~5 전체</strong><button type="button" onClick={()=>setSelecting(false)} aria-label="선택 닫기"><X size={17}/></button></div>
    {!available.length&&<p>현재 탭에 등록된 유튜브 영상이 없어.</p>}
    {levels.map(({level,rows})=>{const open=expandedLevels.includes(level);const selectedCount=rows.reduce((n,row)=>n+normalizeVideoIds(row.videos).filter(id=>checked.includes(row.id+":"+id)).length,0);return <div className="routine-level" key={level}>
      <button type="button" className="routine-level-toggle" aria-expanded={open} onClick={()=>setExpandedLevels(prev=>open?prev.filter(n=>n!==level):[...prev,level])}>
       <strong>Lv.{level}</strong><span>{rows.reduce((n,r)=>n+normalizeVideoIds(r.videos).length,0)}개 영상{selectedCount?" · "+selectedCount+"개 선택":""}</span><ChevronDown size={17} className={open?"routine-chevron-open":""}/>
      </button>
      {open&&<div className="routine-level-content">{rows.length?rows.map(row=><div className="routine-source" key={row.id}><strong>{nameOf(row)}</strong>
       {normalizeVideoIds(row.videos).map((videoId,i)=>{const key=row.id+":"+videoId;return <label key={key}><input type="checkbox" checked={checked.includes(key)} onChange={e=>setChecked(v=>e.target.checked?[...v,key]:v.filter(x=>x!==key))}/> 영상 {i+1}<a href={"https://www.youtube.com/watch?v="+videoId} target="_blank" rel="noopener noreferrer" aria-label="영상 열기" onClick={e=>e.stopPropagation()}><ExternalLink size={14}/></a></label>})}</div>):<p>등록된 영상이 없어.</p>}</div>}
     </div>})}
   </div>}
   {!!steps.length&&<div className="routine-player">
    <div className="routine-list-accordion">
     <button type="button" className="routine-list-toggle" aria-expanded={stepsExpanded} onClick={()=>{setStepsExpanded(v=>!v);if(stepsExpanded)setVideoExpanded(false)}}>
      <span className="routine-list-icon"><ChevronDown size={18} className={stepsExpanded?'routine-chevron-open':''}/></span>
      <span className="routine-list-heading"><strong>시퀀스 구성 · {steps.length}개</strong><small>총 {fmt(total)} · 펼쳐서 동작 선택</small></span>
      <ChevronDown size={18} className={stepsExpanded?'routine-chevron-open':''}/>
     </button>
     {stepsExpanded&&<div className="routine-step-list">{steps.map((step,i)=><div className="routine-step-wrapper" key={i}>
     <div className={'routine-step '+(i===index&&!complete?'active':'')} onClick={()=>isOwner&&jump(i)}>
      <i style={{background:colors[i%colors.length]}}/>
      <span>{i<index||complete?'✓ ':''}{step.title}</span>
      <input aria-label={step.title+' 시간(분)'} type="number" disabled={!isOwner} min="0.1" max="60" step="0.1" value={Number((step.seconds/60).toFixed(2))} onClick={e=>e.stopPropagation()} onChange={e=>updateDuration(i,e.target.value)}/><small>분</small>
     </div>
     {i===index&&step.videoId&&<div className="routine-video-accordion">
      <button type="button" className="routine-video-toggle" aria-expanded={videoExpanded} onClick={()=>setVideoExpanded(v=>!v)}>
       <Play size={15}/><span>현재 동작 참고 영상</span><ChevronDown size={16} className={videoExpanded?'routine-chevron-open':''}/>
      </button>
      {videoExpanded&&<div className="routine-embedded-video">
       <iframe key={step.videoId} title={step.title+' 유튜브 참고 영상'} src={'https://www.youtube-nocookie.com/embed/'+step.videoId+'?playsinline=1'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/>
      </div>}
     </div>}
    </div>)}</div>}
    </div>
   {database&&userId&&<div className="routine-sync-status">
     <span>{syncState}{!isOwner&&' · 읽기 전용'}</span>
     {!isOwner&&<button type="button" onClick={takeOver}>이 기기에서 이어받기</button>}
   </div>}
    {!readOnly&&<div className="routine-save"><input aria-label="루틴 이름" disabled={!isOwner} placeholder="루틴 이름 (예: 아침 발성 6분)" value={draftName} onChange={e=>setDraftName(e.target.value)}/><button className="routine-purple" type="button" onClick={save} disabled={!isOwner||!draftName.trim()}><Save size={16}/> 저장</button>{selectedId&&<button type="button" onClick={remove} disabled={!isOwner} aria-label="루틴 삭제"><Trash2 size={17}/></button>}</div>}
   </div>}
  </>}
 </section>;
}
