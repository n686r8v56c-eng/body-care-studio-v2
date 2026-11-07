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
// Keep video references separate from the video inbox and from technique images.
const parseVideoUrl=value=>{
 try{
  const u=new URL(String(value||'').trim());
  if(!['http:','https:'].includes(u.protocol))return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  let id='';
  if(host==='youtu.be')id=u.pathname.split('/')[1];
  else if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)){
   id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1];
  }
  return /^[\w-]{11}$/.test(id||'')?{id,url:'https://www.youtube.com/watch?v='+id}:null;
 }catch{return null}
};
const timeSeconds=value=>{
 const v=String(value||'').trim();
 if(!v)return 0;
 if(/^\d+$/.test(v))return Number(v);
 if(!/^\d{1,3}:[0-5]\d(?::[0-5]\d)?$/.test(v))return null;
 return v.split(':').reduce((n,x)=>n*60+Number(x),0);
};
const timeLabel=n=>{
 const sec=Math.max(0,Math.floor(Number(n)||0));
 return sec>=3600?[Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(x=>String(x).padStart(2,'0')).join(':'):String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
};
function TechniqueReferences({technique,onUpdate}){
 const refs=technique.references||[];
 const [adding,setAdding]=useState(false);
 const [selectedRef,setSelectedRef]=useState(null);
 const [showPlayer,setShowPlayer]=useState(false);
 const [seekVersion,setSeekVersion]=useState(0);
 const active=refs.find(x=>x.id===selectedRef)||refs[0]||null;
 const activeVideo=active?parseVideoUrl(active.url):null;
 const [draft,setDraft]=useState({url:'',title:'',start:'',end:'',memo:''});
 const [error,setError]=useState('');
 const reset=()=>{setDraft({url:'',title:'',start:'',end:'',memo:''});setError('');setAdding(false)};
 const save=e=>{
  e.preventDefault();
  const vid=parseVideoUrl(draft.url),start=timeSeconds(draft.start),end=draft.end.trim()?timeSeconds(draft.end):null;
  if(!vid){setError('유효한 YouTube 영상 URL을 붙여넣어 줘.');return}
  if(start===null||!Number.isSafeInteger(start)||start<0||end!==null&&(!Number.isSafeInteger(end)||end<=start)){setError('시간은 03:21 또는 초 단위로, 종료는 시작보다 늦게 적어 줘.');return}
  if(refs.some(x=>parseVideoUrl(x.url)?.id===vid.id&&x.start===start)){setError('같은 영상의 같은 시작 시간이 이미 연결되어 있어.');return}
  onUpdate(d=>{
   const row=(d.coreTechniques||[]).find(x=>x.id===technique.id);
   if(row){row.references=Array.isArray(row.references)?row.references:[];row.references.push({id:uid(),url:vid.url,title:draft.title.trim().slice(0,150)||'참고 영상',start,end,memo:draft.memo.trim().slice(0,500)})}
  });setSelectedRef(null);setShowPlayer(false);reset();
 };
 const remove=id=>{
  if(!window.confirm('이 기술에 연결된 참고 영상만 삭제할까? 원본 영상과 기술은 유지돼.'))return;
  onUpdate(d=>{const row=(d.coreTechniques||[]).find(x=>x.id===technique.id);if(row){row.references=(row.references||[]).filter(x=>x.id!==id);row.removedReferenceIds=[...new Set([...(row.removedReferenceIds||[]),id])]}});
  if(active?.id===id){setSelectedRef(null);setShowPlayer(false)}
 };
 return <section style={{borderTop:'1px solid #ebe5f0',marginTop:12,paddingTop:12}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
   <strong style={{fontSize:14}}>참고 영상 ({refs.length})</strong>
   <button type="button" style={{...btn,fontSize:12,padding:'7px 9px'}} onClick={()=>{setAdding(v=>!v);setError('')}}>{adding?'취소':'+ 영상 추가'}</button>
  </div>
  {refs.length===0&&!adding&&<p style={{opacity:.65,fontSize:12}}>아직 연결된 참고 영상이 없어.</p>}
  {refs.length>0&&<>
   <div role="tablist" aria-label={technique.name+' 참고 영상 선택'} style={{display:'flex',gap:7,overflowX:'auto',WebkitOverflowScrolling:'touch',padding:'10px 0',scrollSnapType:'x proximity'}}>
    {refs.map((ref,i)=><button type="button" role="tab" aria-selected={active?.id===ref.id} key={ref.id} onClick={()=>{setSelectedRef(ref.id);setShowPlayer(false)}} style={{...btn,flex:'0 0 auto',scrollSnapAlign:'start',fontSize:12,whiteSpace:'nowrap',background:active?.id===ref.id?'#e9ddf7':'transparent',color:active?.id===ref.id?'#624184':'inherit',borderColor:active?.id===ref.id?'#ae8ccf':'#e3d9ed'}}>영상 {i+1}</button>)}
   </div>
   {active&&<div style={{minWidth:0}}>
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
     <strong style={{fontSize:13,overflowWrap:'anywhere'}}>{active.title||'참고 영상'}</strong>
     <button type="button" title="영상의 해당 시점으로 이동" aria-label={'영상 '+timeLabel(active.start)+'부터 재생'} onClick={()=>{setSeekVersion(v=>v+1);setShowPlayer(true)}} style={{border:0,background:'transparent',padding:'6px 2px',fontSize:12,color:'#7950ad',fontWeight:700,textDecoration:'underline',textUnderlineOffset:3,cursor:'pointer'}}>▶ 시작 {timeLabel(active.start)}{active.end!=null?' · 종료 '+timeLabel(active.end):''}</button>
    </div>
    {active.memo&&<p style={{fontSize:12,margin:'5px 0'}}>{active.memo}</p>}
    {activeVideo&&<div style={{width:'100%',aspectRatio:'16 / 9',background:'#eee9f3',borderRadius:10,overflow:'hidden',marginTop:9}}>
     {showPlayer?<iframe key={active.id+'-'+seekVersion} title={(active.title||'참고 영상')+' 재생'} src={'https://www.youtube-nocookie.com/embed/'+activeVideo.id+'?start='+Math.max(0,Number(active.start)||0)+(active.end!=null?'&end='+Math.max(0,Number(active.end)||0):'')+'&playsinline=1&autoplay=1'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" style={{width:'100%',height:'100%',border:0}}/>:<button type="button" onClick={()=>setShowPlayer(true)} style={{width:'100%',height:'100%',border:0,background:'linear-gradient(120deg,#f2e9fa,#ddd1eb)',color:'#69478a',display:'flex',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',fontSize:16,fontWeight:700}}>▶ 영상 {refs.findIndex(x=>x.id===active.id)+1} 재생</button>}
    </div>}
    <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:9}}>
     {activeVideo&&<a href={activeVideo.url+'&t='+Math.max(0,Number(active.start)||0)+'s'} target="_blank" rel="noopener noreferrer" style={{...btn,textDecoration:'none',fontSize:12}}>↗ YouTube에서 열기</a>}
     <button type="button" style={{...btn,fontSize:12}} onClick={()=>remove(active.id)}>영상 연결 삭제</button>
    </div>
   </div>}
  </>}
  {adding&&<form onSubmit={save} style={{display:'grid',gap:8,marginTop:10}}>
   <input autoFocus type="url" required value={draft.url} aria-label="참고 영상 YouTube URL" placeholder="YouTube URL 붙여넣기" onChange={e=>setDraft(v=>({...v,url:e.target.value}))} onPaste={e=>{const value=e.clipboardData.getData('text').trim();if(parseVideoUrl(value)){e.preventDefault();setDraft(v=>({...v,url:value}))}}} style={{fontSize:16,padding:10,minWidth:0,width:'100%',boxSizing:'border-box',borderRadius:9,border:'1px solid #bca6d8'}}/>
   <input value={draft.title} aria-label="참고 영상 제목" placeholder="영상 제목 (선택)" onChange={e=>setDraft(v=>({...v,title:e.target.value}))} style={{fontSize:16,padding:10,minWidth:0,width:'100%',boxSizing:'border-box',borderRadius:9,border:'1px solid #bca6d8'}}/>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
    <label style={{fontSize:12}}>시작 시간<input required value={draft.start} placeholder="03:21" onChange={e=>setDraft(v=>({...v,start:e.target.value}))} style={{fontSize:16,padding:9,minWidth:0,width:'100%',boxSizing:'border-box',borderRadius:9,border:'1px solid #bca6d8'}}/></label>
    <label style={{fontSize:12}}>종료 시간 (선택)<input value={draft.end} placeholder="04:23" onChange={e=>setDraft(v=>({...v,end:e.target.value}))} style={{fontSize:16,padding:9,minWidth:0,width:'100%',boxSizing:'border-box',borderRadius:9,border:'1px solid #bca6d8'}}/></label>
   </div>
   <input value={draft.memo} aria-label="참고 영상 메모" placeholder="메모 (선택)" onChange={e=>setDraft(v=>({...v,memo:e.target.value}))} style={{fontSize:16,padding:10,minWidth:0,width:'100%',boxSizing:'border-box',borderRadius:9,border:'1px solid #bca6d8'}}/>
   {error&&<p role="alert" style={{color:'#b34455',fontSize:12,margin:0}}>{error}</p>}
   <button type="submit" style={{...btn,background:'#a18acb',color:'#fff'}}>영상 연결 저장</button>
  </form>}
 </section>;
}

function CoreTechniques({data,onUpdate}){
 const [openCategories,setOpenCategories]=useState([]);
 const [search,setSearch]=useState('');
 const [searchClosed,setSearchClosed]=useState([]);
 const [expanded,setExpanded]=useState([]);
 const [editingImage,setEditingImage]=useState('');
 const [imageDraft,setImageDraft]=useState('');
 const [imageError,setImageError]=useState('');
 const [failedImages,setFailedImages]=useState([]);
 const techniques=data.coreTechniques||[];
 const term=search.trim().toLocaleLowerCase();
 const searchable=t=>[t.name,t.en,t.posture,t.muscles,t.description,t.notes,...(t.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(term);
 const categoryMatches=i=>CORE_CATEGORIES[i].toLocaleLowerCase().includes(term);
 const matchingEntries=i=>techniques.filter(t=>t.category===i&&(!term||categoryMatches(i)||searchable(t)));
 const clearSearch=()=>{setSearch('');setSearchClosed([]);setOpenCategories([])};
 const totalMatches=term?CORE_CATEGORIES.reduce((sum,_,i)=>sum+matchingEntries(i).length,0):techniques.length;
 const toggle=id=>setExpanded(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 const isValidUrl=value=>{try{const u=new URL(String(value).trim());return ['https:','http:'].includes(u.protocol)&&!!u.hostname}catch{return false}};
 const updateImage=(id,value)=>{
  const clean=value.trim();
  if(!isValidUrl(clean)){setImageError('http:// 또는 https:// 이미지 URL을 입력해 줘.');return}
  onUpdate(d=>{const row=(d.coreTechniques||[]).find(x=>x.id===id);if(row){row.imageUrl=clean.slice(0,2000);row.imageRemoved=false}});
  setFailedImages(ids=>ids.filter(x=>x!==id));setEditingImage('');setImageDraft('');setImageError('');
 };
 const deleteImage=id=>{
  onUpdate(d=>{const row=(d.coreTechniques||[]).find(x=>x.id===id);if(row){row.imageUrl='';row.imageRemoved=true}});
  setEditingImage('');setImageDraft('');setImageError('');
 };
 return <section style={{padding:'16px'}}>
  <h2>코어 · 기술 라이브러리</h2>
  <div style={{display:'flex',alignItems:'center',gap:8,border:'1px solid #d9cae8',borderRadius:12,padding:'7px 11px',marginBottom:8,background:'transparent'}}>
   <span aria-hidden="true" style={{color:'#8f76ac',fontSize:18}}>⌕</span>
   <input type="search" aria-label="코어 기술 검색" value={search} onChange={e=>{setSearch(e.target.value);setSearchClosed([])}} placeholder="기술명 · 영문명 · 근육 · 자세 · 태그 검색" style={{flex:1,minWidth:0,border:0,outline:'none',background:'transparent',color:'inherit',fontSize:16,padding:'7px 0'}}/>
   {!!search&&<button type="button" aria-label="검색어 지우기" onClick={clearSearch} style={{...btn,padding:'5px 9px',fontSize:12}}>지우기</button>}
  </div>
  {term&&<p role="status" style={{fontSize:12,color:'#8d78a4',margin:'0 0 12px'}}>검색 결과 {totalMatches}개</p>}
  <div style={{display:'grid',gap:10,marginBottom:16}}>
   {CORE_CATEGORIES.map((name,i)=>{
    const entries=matchingEntries(i);
    if(term&&!entries.length)return null;
    const openCategory=term?!searchClosed.includes(i):openCategories.includes(i);
    return <section key={name} style={{border:'1px solid #e4d9ed',borderRadius:13,overflow:'hidden'}}>
     <button type="button" aria-expanded={openCategory} onClick={()=>term?setSearchClosed(v=>openCategory?[...v,i]:v.filter(x=>x!==i)):setOpenCategories(v=>openCategory?v.filter(x=>x!==i):[...v,i])} style={{width:'100%',padding:'15px 14px',display:'flex',alignItems:'center',gap:12,border:0,background:'transparent',color:'inherit',textAlign:'left',cursor:'pointer'}}>
      <span style={{fontSize:12,color:'#947ead',minWidth:22}}>{String(i+1).padStart(2,'0')}</span>
      <strong style={{fontSize:16,flex:1}}>{name}</strong>
      <span style={{fontSize:12,color:'#927eaa'}}>{entries.length}개</span>
      <span style={{color:'#977eb0',fontSize:17}} aria-hidden="true">{openCategory?'⌃':'⌄'}</span>
     </button>
     {openCategory&&<div style={{borderTop:'1px solid #e9e1ef',padding:'10px',display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:12}}>
      {entries.map(t=>{

    const open=expanded.includes(t.id),hasImage=!!t.imageUrl&&!failedImages.includes(t.id);
    return <article key={t.id} style={{minWidth:0,border:'1px solid #ddd5e7',borderRadius:14,overflow:'hidden',background:'var(--card-bg,transparent)'}}>
     <button type="button" aria-expanded={open} onClick={()=>toggle(t.id)} style={{border:0,padding:0,width:'100%',display:'block',textAlign:'left',background:'transparent',color:'inherit',cursor:'pointer'}}>
      <div style={{aspectRatio:'4 / 3',width:'100%',background:'#f2eff6',display:'flex',justifyContent:'center',alignItems:'center',overflow:'hidden'}}>
       {hasImage?<img src={t.imageUrl} alt={t.name+' 동작 참고 이미지'} loading="lazy" onError={()=>setFailedImages(ids=>ids.includes(t.id)?ids:[...ids,t.id])} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<span style={{fontSize:12,color:'#857990',padding:8,textAlign:'center'}}>사진 추가</span>}
      </div>
      <div style={{padding:'10px 12px 6px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:5,minHeight:52}}>
       <strong style={{fontSize:14,lineHeight:1.4,overflowWrap:'anywhere'}}>{t.name}</strong>
       <span style={{fontSize:17,color:'#927ab8',flexShrink:0}} aria-hidden="true">{open?'⌃':'⌄'}</span>
      </div>
     </button>
     <div style={{padding:'0 8px 9px',display:'flex',gap:5}}>
      <button type="button" style={{...btn,flex:1,padding:'7px 4px',fontSize:12}} onClick={()=>{setEditingImage(editingImage===t.id?'':t.id);setImageDraft('');setImageError('')}}>{t.imageUrl?'사진 변경':'사진 추가'}</button>
      <button type="button" style={{...btn,padding:'7px 8px',fontSize:12}} disabled={!t.imageUrl} onClick={()=>deleteImage(t.id)}>삭제</button>
     </div>
     {editingImage===t.id&&<form style={{padding:'0 9px 10px'}} onSubmit={e=>{e.preventDefault();updateImage(t.id,imageDraft)}}>
      <input autoFocus type="url" value={imageDraft} placeholder="이미지 URL 붙여넣기" aria-label={t.name+' 이미지 URL'} onChange={e=>{setImageDraft(e.target.value);setImageError('')}} onPaste={e=>{const value=e.clipboardData.getData('text').trim();if(isValidUrl(value)){e.preventDefault();updateImage(t.id,value)}}} style={{width:'100%',minWidth:0,boxSizing:'border-box',fontSize:16,padding:9,borderRadius:9,border:'1px solid #bca6d8'}}/>
      {imageError&&<p role="alert" style={{color:'#b34455',fontSize:12,margin:'5px 0'}}>{imageError}</p>}
      <div style={{display:'flex',gap:6,marginTop:6}}><button type="submit" style={{...btn,flex:1,fontSize:12}}>저장</button><button type="button" style={{...btn,fontSize:12}} onClick={()=>{setEditingImage('');setImageError('')}}>취소</button></div>
     </form>}
     {open&&<div style={{padding:'4px 12px 12px',fontSize:13,lineHeight:1.6,borderTop:'1px solid #ebe5f0'}}>
      {t.en&&<p style={{margin:'6px 0'}}><strong>영문명</strong> · {t.en}</p>}
      {t.posture&&<p style={{margin:'6px 0'}}><strong>자세</strong> · {t.posture}</p>}
      {t.muscles&&<p style={{margin:'6px 0'}}><strong>근육</strong> · {t.muscles}</p>}
      {t.description&&<p style={{margin:'8px 0'}}>{t.description}</p>}
      {!!t.tags?.length&&<p style={{opacity:.7}}>{t.tags.join(' · ')}</p>}
      {t.notes&&<p>{t.notes}</p>}
      {hasImage&&<a href={t.imageUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12}}>이미지 원본 열기</a>}
      <TechniqueReferences technique={t} onUpdate={onUpdate}/>
     </div>}
    </article>;
      })}
     </div>}
    </section>;
   })}
  </div>
  {!techniques.length&&<p style={{fontSize:13,opacity:.7}}>아직 등록된 기술이 없어.</p>}
  {term&&totalMatches===0&&<p style={{fontSize:14,opacity:.7,textAlign:'center',padding:'18px 0'}}>일치하는 기술이 없어. 다른 검색어를 입력해 줘.</p>}
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
 return <CoreTechniques data={data} onUpdate={onUpdate}/>;
}
