import React,{useEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Link2,ExternalLink,Trash2,Plus,Pencil,ArrowUp,ArrowDown,RotateCcw,Download,Upload,X} from 'lucide-react';
import {BEAUTY_SEED_DRILLS} from './beautySeedDrills.js';
import './CareLibrary.css';

const DEFAULT_LABELS=['마사지','이완','폼롤러','도구','SNPE'];
const VOICE_LEVEL_NAMES=['기초','음정','음색','기교','표현'];
// Source: Voice Flow drill catalog, exported 2026-11-06. Stable IDs prevent duplicate seeding.
const VOICE_SEED_DRILLS=[{"level":1,"sort":0,"en":"Appoggio","ko":"아포지오 · 호흡 지지"},{"level":1,"sort":1,"en":"Breath–Voice Coordination","ko":"호흡·성대 협응"},{"level":1,"sort":2,"en":"F–V Transition","ko":"F→V 전환"},{"level":1,"sort":3,"en":"S–Z Transition","ko":"S→Z 전환"},{"level":1,"sort":4,"en":"Lip Trill","ko":"립트릴"},{"level":1,"sort":5,"en":"Tongue Trill","ko":"텅트릴"},{"level":1,"sort":6,"en":"Straw Phonation","ko":"빨대 발성"},{"level":1,"sort":7,"en":"Water Resistance Phonation","ko":"물저항 발성"},{"level":1,"sort":8,"en":"Gentle Humming","ko":"허밍"},{"level":1,"sort":9,"en":"Easy Onset","ko":"부드러운 발성 시작"},{"level":1,"sort":10,"en":"Gentle Offset","ko":"부드러운 발성 종료"},{"level":1,"sort":11,"en":"Humming to Vowel","ko":"음→아 연결"},{"level":2,"sort":0,"en":"Single Note Matching","ko":"피아노 단음 따라 하기"},{"level":2,"sort":1,"en":"Pitch Accuracy","ko":"음정 정확도"},{"level":2,"sort":2,"en":"Semitone Steps","ko":"반음씩 상행·하행"},{"level":2,"sort":3,"en":"Interval Jumps","ko":"3도·5도·옥타브 도약"},{"level":2,"sort":4,"en":"Pitch Glide","ko":"피치 글라이드"},{"level":2,"sort":5,"en":"Siren","ko":"사이렌"},{"level":2,"sort":6,"en":"Range Expansion","ko":"음역 확장"},{"level":3,"sort":0,"en":"Chest Register","ko":"흉성"},{"level":3,"sort":1,"en":"Head Register","ko":"두성"},{"level":3,"sort":2,"en":"Mix Coordination","ko":"믹스 보이스"},{"level":3,"sort":3,"en":"Register Transition","ko":"성구 전환"},{"level":3,"sort":4,"en":"Vowel Resonance","ko":"모음·공명 조절"},{"level":3,"sort":5,"en":"Bright–Dark Tone","ko":"밝고 어두운 음색"},{"level":3,"sort":6,"en":"Light–Full Tone","ko":"가볍고 묵직한 음색"},{"level":3,"sort":7,"en":"M–N–NG Resonance","ko":"비음·공명 탐색"},{"level":4,"sort":0,"en":"Crescendo–Decrescendo","ko":"크레셴도·디크레셴도"},{"level":4,"sort":1,"en":"Messa di Voce","ko":"메사 디 보체"},{"level":4,"sort":2,"en":"Scale Agility","ko":"스케일 민첩성"},{"level":4,"sort":3,"en":"Arpeggio","ko":"아르페지오"},{"level":4,"sort":4,"en":"Melisma","ko":"멜리스마"},{"level":4,"sort":5,"en":"Legato","ko":"레가토"},{"level":4,"sort":6,"en":"Staccato","ko":"스타카토"},{"level":4,"sort":7,"en":"Vibrato","ko":"비브라토 조절"},{"level":4,"sort":8,"en":"Dynamic Control","ko":"음량 조절"},{"level":5,"sort":0,"en":"Sustained Tone","ko":"지속음·발성 안정성"},{"level":5,"sort":1,"en":"Long Phrase","ko":"긴 프레이즈·호흡 배분"},{"level":5,"sort":2,"en":"Clear Diction","ko":"자음·모음 딕션"},{"level":5,"sort":3,"en":"Semantic Pausing","ko":"의미 단위 쉼"},{"level":5,"sort":4,"en":"Musical Phrasing","ko":"프레이징"},{"level":5,"sort":5,"en":"Stress & Intonation","ko":"강세·억양"},{"level":5,"sort":6,"en":"Emotional Delivery","ko":"감정 표현"},{"level":5,"sort":7,"en":"Expressive Reading","ko":"표현 낭독"},{"level":5,"sort":8,"en":"Voice to Speech","ko":"발성에서 말하기 연결"}];

import {MAX_VIDEOS_PER_ITEM as MAX,normalizeVideoIds} from './videoLimits.js';
const groupKey=(area,group)=>area+':'+group;
const nextId=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
const displayName=row=>row.en||row.title||row.ko||'이름 없음';
const videoId=raw=>{
 try{
  const u=new URL(String(raw).trim().replace(/^(?!https?:\/\/)/,'https://'));
  const host=u.hostname.toLowerCase();
  const id=host==='youtu.be'?u.pathname.split('/')[1]:['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)?(u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1]):null;
  return /^[\w-]{11}$/.test(id||'')?id:null;
 }catch{return null}
};
function download(name,object){
 const blob=new Blob([JSON.stringify(object,null,2)],{type:'application/json;charset=utf-8'});
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),20000);
}
export function seedBodyCatalog(value){
 const items=[...(value?.items||[])],keys=new Set(items.map(x=>x.id));
 if(Number(value?.beautyCatalogSeedVersion)<1){
 for(const area of ['lower','upper']){
  for(const group of ['massage','stretch','bodyweight','machine']){
   for(const [sort,drill] of BEAUTY_SEED_DRILLS.entries()){
    const id='beauty-template:'+area+':'+group+':'+drill.id;
    if(keys.has(id))continue;
    const level=drill.id===51?1:Math.ceil(drill.id/10);
    items.push({id,area,group,level,sort:1000+sort,archived:false,title:drill.en,en:drill.en,ko:drill.ko,note:'',videos:[]});
   }
  }
 }
 }
 // Insert Voice Flow's 45 drills only into Face > Voice (internal group: stretch).
 // Keep pre-existing custom drills, video links, notes and archived state unchanged.
 for(const drill of VOICE_SEED_DRILLS){
  const id='voice-flow:face:stretch:'+drill.level+':'+drill.sort;
  if(keys.has(id)||items.some(x=>x.area==='face'&&x.group==='stretch'&&x.level===drill.level&&String(x.en||x.title||'').trim()===drill.en))continue;
  items.push({id,area:'face',group:'stretch',level:drill.level,sort:drill.sort,archived:false,title:drill.en,en:drill.en,ko:drill.ko,note:'',videos:[]});
 }
 const levelNames={...(value?.levelNames||{})};
 if(!levelNames['face:stretch'])levelNames['face:stretch']=VOICE_LEVEL_NAMES;
 return {...value,items,levelNames,beautyCatalogSeedVersion:1};
}
export default function CareLibrary({data,onUpdate,area,group,sync,readOnly=false}){
 const [level,setLevel]=useState(1);
 const [editingMode,setEditingMode]=useState(false);
 const [showDeleted,setShowDeleted]=useState(false);
 const [opened,setOpened]=useState(null);
 const [active,setActive]=useState({});
 const [editor,setEditor]=useState(null);
 const [draft,setDraft]=useState({en:'',ko:'',level:1,note:''});
 const [message,setMessage]=useState('');

 const [showRecovery,setShowRecovery]=useState(false);
 const [showImport,setShowImport]=useState(false);
 const [levelRename,setLevelRename]=useState(null);
 const [renameText,setRenameText]=useState('');
 const timer=useRef(null),wasLongPress=useRef(false);
 const labels=Array.from({length:5},(_,i)=>data.levelNames?.[groupKey(area,group)]?.[i]||(area==='face'&&group==='stretch'?VOICE_LEVEL_NAMES[i]:DEFAULT_LABELS[i]));
 useEffect(()=>{setLevel(1);setOpened(null);setEditingMode(false);setEditor(null);setShowDeleted(false);setShowRecovery(false)},[area,group]);
 const alertUser=text=>{setMessage(text)};
 const update=fn=>{if(readOnly)return;onUpdate(d=>{fn(d)})};
 const scoped=(data.items||[]).filter(x=>x.area===area&&x.group===group);
 const ordered=scoped.filter(x=>!x.archived).sort((a,b)=>(a.level||1)-(b.level||1)||(a.sort||0)-(b.sort||0)||String(a.id).localeCompare(String(b.id)));
 const visible=ordered.filter(x=>(x.level||1)===level);
 const archived=scoped.filter(x=>x.archived).sort((a,b)=>(a.level||1)-(b.level||1)||(a.sort||0)-(b.sort||0));
 const numberById=new Map(ordered.map((row,i)=>[row.id,i+1]));
 const videosFor=row=>normalizeVideoIds(row?.videos);
 const openNew=()=>{setDraft({en:'',ko:'',level,note:''});setEditor({mode:'add'})};
 const openEdit=row=>{setDraft({en:row.en||row.title||'',ko:row.ko||'',level:row.level||1,note:row.note||''});setEditor({mode:'edit',id:row.id})};
 const submitItem=e=>{
  e.preventDefault();
  const en=draft.en.trim(),ko=draft.ko.trim(),target=Number(draft.level),note=draft.note||'';
  if(!en&&!ko){alertUser('영문 또는 한글 이름을 입력해 줘.');return}
  if(editor?.mode==='edit'){
   update(d=>{
    const row=d.items.find(x=>x.id===editor.id);
    if(!row)return;
    const moving=row.level!==target;
    const end=Math.max(-1,...d.items.filter(x=>x.area===area&&x.group===group&&x.level===target).map(x=>x.sort||0))+1;
    Object.assign(row,{title:en||ko,en,ko,level:target,note,sort:moving?end:row.sort});
   });
  }else{
   const end=Math.max(-1,...scoped.filter(x=>x.level===target).map(x=>x.sort||0))+1;
   update(d=>d.items.push({id:nextId(),area,group,level:target,sort:end,archived:false,title:en||ko,en,ko,note,videos:[]}));
  }
  setLevel(target);setEditor(null);alertUser('동작 목록을 저장했어.');
 };
 const reorder=(row,direction)=>{
  const at=visible.findIndex(x=>x.id===row.id),other=visible[at+direction];
  if(!other)return;
  update(d=>{const first=d.items.find(x=>x.id===row.id),second=d.items.find(x=>x.id===other.id);const old=first.sort;first.sort=second.sort;second.sort=old});
 };
 const archive=row=>{
  if(!confirm(displayName(row)+' 동작을 목록에서 삭제할까? 영상은 그대로 보관돼.'))return;
  update(d=>{const found=d.items.find(x=>x.id===row.id);if(found)found.archived=true});
  setOpened(null);alertUser('목록에서 숨겼어. 편집 모드에서 복구할 수 있어.');
 };
 const restore=row=>{
  update(d=>{const found=d.items.find(x=>x.id===row.id);if(found)found.archived=false});
  alertUser('목록에 복구했어.');
 };
 const addVideos=(row,raw)=>{
  const matches=String(raw||'').match(/(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/[^\s,，]+/gi)||[String(raw||'').trim()];
  const ids=matches.map(videoId).filter(Boolean);
  if(!ids.length){alertUser('올바른 유튜브 주소를 입력해 줘.');return}
  const old=videosFor(row),fresh=[...new Set(ids)].filter(x=>!old.includes(x)).slice(0,MAX-old.length);
  if(!fresh.length){alertUser(old.length===MAX?'영상은 최대 5개까지 등록 가능해.':'이미 등록된 영상이야.');return}
  update(d=>{const found=d.items.find(x=>x.id===row.id);if(found)found.videos=[...old,...fresh]});
  setOpened(row.id);setActive(v=>({...v,[row.id]:old.length}));
  alertUser('영상 '+fresh.length+'개 등록 완료');
 };
 const addFromClipboard=async row=>{
  if(videosFor(row).length>=MAX){setOpened(row.id);alertUser('영상은 최대 5개까지 등록 가능해.');return}
  let pasted='';
  try{
   if(!navigator.clipboard?.readText)throw new Error('clipboard unavailable');
   pasted=await navigator.clipboard.readText();
  }catch{
   // Safari on iOS may deny clipboard reads. Use a temporary native prompt,
   // never leave the old inline link form visible beneath the video.
   pasted=window.prompt('유튜브 링크를 붙여넣어 줘.','')||'';
  }
  if(!pasted.trim())return;
  addVideos(row,pasted);
 };
 const copyLink=async id=>{
  const url='https://www.youtube.com/watch?v='+id;
  try{await navigator.clipboard.writeText(url);alertUser('링크 복사 완료')}
  catch{alertUser('링크 복사가 차단됐어. 영상 열기를 이용해 줘.')}
 };
 const removeVideo=(row,index)=>{
  if(!confirm('이 영상 링크를 삭제할까?'))return;
  update(d=>{const found=d.items.find(x=>x.id===row.id);if(found)found.videos=videosFor(found).filter((_,i)=>i!==index)});
  setActive(v=>({...v,[row.id]:0}));
 };
 const exportBackup=()=>{
  const now=new Date(),stamp=now.toISOString().slice(0,16).replace(/[T:]/g,'-');
  download('body-care-studio-'+stamp+'.json',{format:'body-care-studio-v1',exportedAt:now.toISOString(),...data});
  alertUser('모든 분류와 영상 링크를 JSON으로 백업했어.');
 };
 const importBackup=async file=>{
  if(!file)return;
  try{
   const raw=JSON.parse(await file.text());
   if(!Array.isArray(raw.items)||!['body-care-studio-v1','body-care-studio-v2'].includes(raw.format))throw Error('Body Care Studio 백업 파일이 아니야.');
   if(!confirm('현재 목록을 보존하면서 새 항목만 추가할까?'))return;
   update(d=>{
    const ids=new Set(d.items.map(x=>x.id));
    raw.items.forEach(x=>{if(x?.id&&!ids.has(x.id)&&['upper','lower','face','core'].includes(x.area)&&['massage','stretch','bodyweight','machine'].includes(x.group)){d.items.push({...x,level:Number(x.level)||1,archived:!!x.archived,videos:normalizeVideoIds(x.videos)});ids.add(x.id)}});
    d.levelNames={...(raw.levelNames||{}),...(d.levelNames||{})};
   });setShowImport(false);alertUser('JSON 백업에서 새 항목을 가져왔어.');
  }catch(e){alertUser('백업 가져오기 실패: '+e.message)}
 };
 const chooseLevel=n=>{if(wasLongPress.current){wasLongPress.current=false;return}setLevel(n);setOpened(null)};
 const startPress=n=>{clearTimeout(timer.current);wasLongPress.current=false;timer.current=setTimeout(()=>{wasLongPress.current=true;setLevelRename(n);setRenameText(labels[n-1])},550)};
 const stopPress=()=>clearTimeout(timer.current);
 const saveRename=e=>{
  e.preventDefault();
  const name=renameText.trim().slice(0,20);
  if(!name)return;
  update(d=>{
   const key=groupKey(area,group),current=Array.from({length:5},(_,i)=>d.levelNames?.[key]?.[i]||DEFAULT_LABELS[i]);
   d.levelNames={...(d.levelNames||{}),[key]:current.map((x,i)=>i===levelRename-1?name:x)};
  });
  setLevelRename(null);alertUser('단계 이름 저장 완료');
 };
 const recovered=scoped.filter(x=>videosFor(x).length);
 const totalSavedVideos=recovered.reduce((sum,x)=>sum+videosFor(x).length,0);
 return <div className="stretching-page">
  <div className="care-page-title"><h1>{data.groupNames?.[groupKey(area,group)]||({massage:'마사지',stretch:'스트레치',bodyweight:'맨몸근력',machine:'기계근력'})[group]}</h1></div>
  <div className="stretching-levels" role="tablist" aria-label="바디케어 단계">
   {labels.map((name,i)=><button key={i} type="button" role="tab" aria-selected={level===i+1} className={level===i+1?'active':''}
     onPointerDown={()=>startPress(i+1)} onPointerUp={stopPress} onPointerCancel={stopPress} onPointerLeave={stopPress}
     onContextMenu={e=>{e.preventDefault();stopPress();wasLongPress.current=true;setLevelRename(i+1);setRenameText(name)}}
     onClick={()=>chooseLevel(i+1)}><span>Lv.{i+1}</span><strong>{name}</strong></button>)}
  </div>

  <div className="stretching-list-heading"><strong>LEVEL {level} · {labels[level-1]}</strong>
   <div className="stretching-header-actions"><span>{visible.length} Drill</span>
    <button type="button" disabled={readOnly} onClick={openNew} aria-label="동작 추가" title="동작 추가"><Plus size={17}/></button>
    <button type="button" disabled={readOnly} className={editingMode?'active':''} onClick={()=>setEditingMode(x=>!x)}><Pencil size={15}/> 편집</button>
   </div>
  </div>
  <div className="stretching-drills">{visible.map(row=>{
   const arr=videosFor(row),expanded=opened===row.id,index=Math.min(active[row.id]||0,Math.max(0,arr.length-1));
   return <div className="stretching-drill" key={row.id}>
    <div className="stretching-drill-row">
     <button type="button" className="stretching-drill-toggle" aria-expanded={expanded} onClick={()=>{setOpened(expanded?null:row.id)}}>
      <span className="stretching-drill-number">{String(numberById.get(row.id)).padStart(2,'0')}</span>
      <span className="stretching-drill-name"><strong>{displayName(row)}</strong>{row.ko&&<small>{row.ko}</small>}</span>
      {expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
     </button>
     {editingMode&&!readOnly?<div className="stretching-edit-controls">
      <button type="button" aria-label="위로 이동" disabled={visible[0]?.id===row.id} onClick={()=>reorder(row,-1)}><ArrowUp size={15}/></button>
      <button type="button" aria-label="아래로 이동" disabled={visible.at(-1)?.id===row.id} onClick={()=>reorder(row,1)}><ArrowDown size={15}/></button>
      <button type="button" aria-label="동작 수정" onClick={()=>openEdit(row)}><Pencil size={15}/></button>
      <button type="button" aria-label="동작 삭제" onClick={()=>archive(row)}><Trash2 size={15}/></button>
     </div>:!readOnly&&<button type="button" className="stretching-link-button" aria-label={displayName(row)+' 영상 추가'} onClick={()=>addFromClipboard(row)}><Link2 size={20}/></button>}
    </div>
    {expanded&&<div className="stretching-video-detail">
     {arr.length?<>
      {arr.length>1&&<div className="stretching-video-switch">{arr.map((v,i)=><button type="button" key={v} className={index===i?'active':''} onClick={()=>setActive(a=>({...a,[row.id]:i}))}>영상 {i+1}</button>)}</div>}
      <div className="stretching-video-frame"><iframe title={displayName(row)+' 영상'} key={arr[index]} src={'https://www.youtube-nocookie.com/embed/'+arr[index]+'?playsinline=1'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/></div>
      <div className="stretching-video-actions">
       <button type="button" onClick={()=>copyLink(arr[index])}><Link2 size={15}/> 링크 복사</button>
       <a href={'https://www.youtube.com/watch?v='+arr[index]} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> 영상 열기</a>
       {!readOnly&&<button type="button" onClick={()=>removeVideo(row,index)}><Trash2 size={15}/> 링크 삭제</button>}
       {!readOnly&&arr.length<MAX&&<button type="button" onClick={()=>addFromClipboard(row)}><Plus size={15}/> 영상 추가</button>}
      </div>
     </>:<div className="stretching-no-video"><strong>영상 링크 등록 대기</strong><span>오른쪽 링크 아이콘을 눌러 유튜브 주소를 등록해 줘.</span></div>}
    </div>}
   </div>
  })}</div>
  {!readOnly&&editingMode&&archived.length>0&&<div className="stretching-archive">
   <button type="button" className="stretching-archive-toggle" onClick={()=>setShowDeleted(v=>!v)}>삭제한 목록 {archived.length}개 {showDeleted?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>
   {showDeleted&&archived.map(row=><div className="stretching-archived-row" key={row.id}><span>{displayName(row)} <small>{row.ko}</small></span><button type="button" onClick={()=>restore(row)}><RotateCcw size={15}/> 복구</button></div>)}
  </div>}
  {!readOnly&&<section className="stretching-recovery">
   <button type="button" className="stretching-recovery-toggle" onClick={()=>setShowRecovery(v=>!v)}><span>저장된 영상 확인 · {recovered.length}개 동작 / {totalSavedVideos}개 링크</span>{showRecovery?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>
   {showRecovery&&<div className="stretching-recovery-list"><p>현재 바디케어 계정에 저장된 링크야. 숨긴 항목의 영상도 표시돼.</p>
    {!recovered.length&&<p>등록된 영상 링크가 없어.</p>}
    {recovered.map(row=><div className="stretching-recovery-row" key={row.id}><strong>{displayName(row)}{row.archived?' (목록에서 숨김)':''}</strong><div>{videosFor(row).map((id,i)=><a href={'https://www.youtube.com/watch?v='+id} key={id} target="_blank" rel="noopener noreferrer">영상 {i+1} <ExternalLink size={13}/></a>)}</div></div>)}
   </div>}
  </section>}

  {message&&<div className="stretching-message" role="status">{message}</div>}
  {!readOnly&&editor&&<div className="stretching-modal-backdrop" onClick={()=>setEditor(null)}>
   <form className="stretching-modal" role="dialog" aria-modal="true" aria-label={editor.mode==='add'?'동작 추가':'동작 수정'} onClick={e=>e.stopPropagation()} onSubmit={submitItem}>
    <div className="stretching-modal-title"><strong>{editor.mode==='add'?'동작 추가':'동작 수정'}</strong><button type="button" aria-label="닫기" onClick={()=>setEditor(null)}><X size={19}/></button></div>
    <label>영문 이름<input value={draft.en} onChange={e=>setDraft(d=>({...d,en:e.target.value}))} maxLength={120} placeholder="예: Body Scan" autoFocus/></label>
    <label>한글 이름<input value={draft.ko} onChange={e=>setDraft(d=>({...d,ko:e.target.value}))} maxLength={120} placeholder="예: 신체 긴장 관찰"/></label>
     <label>분류<select value={draft.level} onChange={e=>setDraft(d=>({...d,level:Number(e.target.value)}))}>{labels.map((label,i)=><option key={i} value={i+1}>Lv.{i+1} · {label}</option>)}</select></label>
    <button className="stretching-submit" type="submit">저장</button>
   </form>
  </div>}
  {!readOnly&&levelRename!==null&&<div className="stretching-modal-backdrop" onClick={()=>setLevelRename(null)}>
   <form className="stretching-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()} onSubmit={saveRename}>
    <div className="stretching-modal-title"><strong>Lv.{levelRename} 이름 수정</strong><button type="button" onClick={()=>setLevelRename(null)}><X size={19}/></button></div>
    <label>단계 이름<input autoFocus maxLength={20} value={renameText} onChange={e=>setRenameText(e.target.value)}/></label>
    <p>Lv.1~5 단계는 고정이고 이름만 변경할 수 있어.</p><button type="submit" className="stretching-submit">저장</button>
   </form>
  </div>}
 </div>;
}
