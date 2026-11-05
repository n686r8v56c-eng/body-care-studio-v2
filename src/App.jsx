import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {ChevronDown,Plus,Pencil,Trash2,ArrowUp,ArrowDown,Link2,Copy,ExternalLink,Download,Upload,RotateCcw,LogOut,Check,X,Settings2} from 'lucide-react';
const areas=[{id:'lower',name:'하체'},{id:'upper',name:'상체'}];
const groups=[{id:'massage',name:'마사지'},{id:'stretch',name:'스트레치'},{id:'bodyweight',name:'맨몸근력'},{id:'machine',name:'기계근력'}];
const KEY='body-care-studio-v1',MAX=5;
const DEFAULT_LEVEL_NAMES=['기초','제어','발음','표현','실전'];
const levelKey=(area,group)=>area+':'+group;
const safeLevels=value=>Array.from({length:5},(_,i)=>typeof value?.[i]==='string'&&value[i].trim()?value[i].trim().slice(0,20):DEFAULT_LEVEL_NAMES[i]);
const url=import.meta.env.VITE_SUPABASE_URL || 'https://kdxvtuldksnsjzjjyqda.supabase.co';
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AFL_RPrGakWmivWWOpA6rw_bWu6A-7B';
const db=url&&anon?createClient(url,anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const initial=()=>({version:1,items:[],levelNames:{}});
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}};
const persist=(key,obj)=>{try{localStorage.setItem(key,JSON.stringify(obj));return true}catch{return false}};
function idFromUrl(raw){
 try{const u=new URL(String(raw||'').trim().replace(/^(?!https?:\/\/)/,'https://'));const host=u.hostname.toLowerCase();
  const id=host==='youtu.be'?u.pathname.split('/')[1]:['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)?(u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1]):'';
  return /^[\w-]{11}$/.test(id||'')?id:'';
 }catch{return ''}
}
function videoList(raw){
 const list=Array.isArray(raw)?raw:[];
 return [...new Set(list.map(v=>typeof v==='string'?(idFromUrl(v)||(/^[\w-]{11}$/.test(v)?v:'')):'').filter(Boolean))].slice(0,MAX);
}
const normalize=obj=>({version:1,levelNames:obj?.levelNames&&typeof obj.levelNames==='object'&&!Array.isArray(obj.levelNames)?Object.fromEntries(Object.entries(obj.levelNames).filter(([k])=>areas.some(a=>groups.some(g=>k===levelKey(a.id,g.id)))).map(([k,v])=>[k,safeLevels(v)])):{},items:Array.isArray(obj?.items)?obj.items.filter(x=>x&&typeof x==='object'&&x.id).map((x,i)=>({
 id:String(x.id),area:areas.some(a=>a.id===x.area)?x.area:'upper',
 group:groups.some(g=>g.id===x.group)?x.group:'massage',level:Number.isInteger(Number(x.level))&&Number(x.level)>=1&&Number(x.level)<=5?Number(x.level):1,
 title:String(x.title||'').slice(0,120),note:String(x.note||'').slice(0,2000),
 videos:videoList(x.videos),sort:Number.isFinite(Number(x.sort))?Number(x.sort):i,archived:!!x.archived
})):[]});
function download(name,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);
}
function Auth({message}){
 const [signup,setSignup]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[alert,setAlert]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setAlert('');
 try{const r=signup?await db.auth.signUp({email:email.trim(),password}):await db.auth.signInWithPassword({email:email.trim(),password});
 if(r.error)throw r.error;if(signup&&!r.data.session)setAlert('이메일 인증 링크를 확인한 후 로그인해 줘.');setPassword('');
 }catch(e){setAlert(e.message)}finally{setBusy(false)}}
 return <main className="auth"><form className="auth-card" onSubmit={submit}>
 <h1>Body Care Studio</h1><p>마사지부터 근력까지, 몸을 위한 개인 라이브러리</p>
 <div className="auth-tabs"><button type="button" className={!signup?'active':''} onClick={()=>setSignup(false)}>로그인</button><button type="button" className={signup?'active':''} onClick={()=>setSignup(true)}>회원가입</button></div>
 <input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" required/>
 <input type="password" minLength={6} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" required/>
 <button className="primary" type="submit" disabled={busy}>{busy?'처리 중…':signup?'회원가입':'이메일 로그인'}</button>
 {(alert||message)&&<p role="status" className="alert">{alert||message}</p>}
 </form></main>
}
export default function App(){
 const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(!db),[loaded,setLoaded]=useState(!db);
 const [data,setData]=useState(()=>normalize(read(KEY,initial()))),[area,setArea]=useState('upper'),[group,setGroup]=useState('massage'),[level,setLevel]=useState(1);
 const [levelRename,setLevelRename]=useState(null),[levelDraft,setLevelDraft]=useState('');
 const pressTimer=useRef(null),longPressRef=useRef(false);
 const [editing,setEditing]=useState(false),[archived,setArchived]=useState(false),[editItem,setEditItem]=useState(null);
 const [expanded,setExpanded]=useState(null),[activeVideo,setActiveVideo]=useState({}),[videoDraft,setVideoDraft]=useState('');
 const [notice,setNotice]=useState(''),[sync,setSync]=useState(db?'로그인 대기':'기기 저장'),[saving,setSaving]=useState(false);
 const [importOpen,setImportOpen]=useState(false);
 const uploaded=useRef(null),loadedUser=useRef(null),saveVersion=useRef(0);
 const userId=session?.user?.id;
 const localKey=userId?KEY+'-'+userId:KEY;
 const show=msg=>{setNotice(msg)};
 useEffect(()=>{if(!db)return;let live=true;db.auth.getSession().then(({data,error})=>{if(live){if(error)show(error.message);setSession(data?.session||null);setAuthReady(true)}}).catch(e=>{if(live){show(e.message);setAuthReady(true)}});
 const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{if(live)setSession(s)});
 return()=>{live=false;subscription.unsubscribe()}},[]);
 useEffect(()=>{
  if(!db)return;
  if(!userId){setLoaded(false);loadedUser.current=null;setData(initial());return;}
  let live=true;setLoaded(false);setSync('불러오는 중');
  (async()=>{try{
   const {data:remote,error}=await db.from('body_care_studio_data').select('payload').eq('user_id',userId).maybeSingle();
   if(error)throw error;if(!live)return;
   const local=read(localKey,null);
   const next=normalize(remote?.payload?.items?remote.payload:local||initial());
   setData(next);persist(localKey,next);loadedUser.current=userId;setLoaded(true);setSync('동기화됨');
  }catch(e){if(live){setData(normalize(read(localKey,initial())));loadedUser.current=userId;setLoaded(true);setSync('연결 실패');show('클라우드 데이터 읽기 실패: '+e.message)}}})();
  return()=>{live=false};
 },[userId]);
 useEffect(()=>{
  if(!loaded)return;
  persist(localKey,data);
  if(!db||!userId||loadedUser.current!==userId)return;
  const n=++saveVersion.current;
  setSaving(true);setSync('저장 중');
  const timer=setTimeout(async()=>{
   const {error}=await db.from('body_care_studio_data').upsert({user_id:userId,payload:data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
   if(saveVersion.current!==n)return;
   setSaving(false);setSync(error?'저장 실패':'동기화됨');if(error)show('클라우드 저장 실패 · 기기 백업 유지: '+error.message);
  },700);
  return()=>clearTimeout(timer);
 },[data,userId,loaded]);
 const update=fn=>setData(prev=>{const next=structuredClone(prev);fn(next);return next});
 const sorted=(items)=>items.sort((a,b)=>a.sort-b.sort||a.title.localeCompare(b.title,'ko'));
 const items=useMemo(()=>sorted(data.items.filter(x=>x.area===area&&x.group===group&&x.level===level&&x.archived===archived)),[data,area,group,level,archived]);
 const levelNames=safeLevels(data.levelNames?.[levelKey(area,group)]);
 const cancelLevelPress=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null}};
 const beginLevelPress=n=>{cancelLevelPress();longPressRef.current=false;pressTimer.current=setTimeout(()=>{longPressRef.current=true;setLevelRename(n);setLevelDraft(levelNames[n-1]);pressTimer.current=null},550)};
 const chooseLevel=n=>{if(longPressRef.current){longPressRef.current=false;return}setLevel(n);setExpanded(null);setEditItem(null)};
 const saveLevelName=e=>{e.preventDefault();const text=levelDraft.trim().slice(0,20);if(!text)return;update(d=>{const key=levelKey(area,group);d.levelNames={...(d.levelNames||{}),[key]:safeLevels(d.levelNames?.[key]).map((name,i)=>i===levelRename-1?text:name)}});setLevelRename(null);show('단계 이름을 저장했어')};
 const allCount=data.items.filter(x=>!x.archived).length;
 const saveItem=({title,note})=>{
  const name=title.trim();if(!name)return show('이름을 입력해 줘.');
  if(editItem?.id){update(d=>{const found=d.items.find(x=>x.id===editItem.id);if(found){found.title=name;found.note=note;}})}
  else update(d=>{d.items.push({id:uid(),title:name,note,area,group,level,sort:1+Math.max(-1,...d.items.filter(x=>x.area===area&&x.group===group&&x.level===level).map(x=>x.sort)),archived:false,videos:[]})});
  setEditItem(null);show('목록 저장 완료');
 };
 const reorder=(id,dir)=>{
  const index=items.findIndex(x=>x.id===id),other=items[index+dir];
  if(!other)return;
  update(d=>{const a=d.items.find(x=>x.id===id),b=d.items.find(x=>x.id===other.id);const t=a.sort;a.sort=b.sort;b.sort=t;});
 };
 const moveArchive=item=>{
  update(d=>{const row=d.items.find(x=>x.id===item.id);if(row)row.archived=!row.archived});
  show(item.archived?'복구했어.':'보관했어. 영상은 그대로 유지돼.');
 };
 const addVideos=(item,raw)=>{
  const matches=String(raw).match(/(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/[^\s,，]+/gi)||[String(raw)];
  const found=matches.map(idFromUrl).filter(Boolean);
  if(!found.length)return show('유효한 유튜브 링크를 입력해 줘.');
  const combined=[...new Set([...item.videos,...found])].slice(0,MAX);
  if(combined.length===item.videos.length)return show(item.videos.length===MAX?'영상은 5개까지 등록 가능해.':'이미 등록된 영상이야.');
  update(d=>{d.items.find(x=>x.id===item.id).videos=combined});
  setVideoDraft('');setActiveVideo(v=>({...v,[item.id]:item.videos.length}));show('영상 등록 완료');
 };
 const deleteVideo=(item,index)=>{
  if(!confirm('이 영상 링크를 삭제할까?'))return;
  update(d=>{d.items.find(x=>x.id===item.id).videos.splice(index,1)});
  setActiveVideo(a=>({...a,[item.id]:0}));
 };
 const makeBackup=()=>{const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,13);download('body-care-studio-'+stamp+'.json',{format:'body-care-studio-v1',exportedAt:new Date().toISOString(),...data});show('JSON 백업 다운로드 완료');};
 const importBackup=async file=>{
  if(!file)return;
  try{const raw=JSON.parse(await file.text());if(raw.format!=='body-care-studio-v1'||!Array.isArray(raw.items))throw new Error('Body Care Studio 백업 파일이 아니야.');
   const incoming=normalize(raw);
   if(!confirm('백업 항목을 현재 목록에 병합할까? 같은 ID 항목은 현재 값을 유지해.'))return;
   update(d=>{const existing=new Set(d.items.map(x=>x.id));for(const row of incoming.items)if(!existing.has(row.id))d.items.push(row);d.levelNames={...incoming.levelNames,...d.levelNames}});
   setImportOpen(false);show('백업 가져오기 완료');
  }catch(e){show('가져오기 실패: '+e.message)}
 };
 if(!authReady)return <div className="loading">로그인 확인 중…</div>;
 if(db&&!session)return <Auth message={notice}/>;
 if(!loaded)return <div className="loading">내 목록 불러오는 중…</div>;
 return <div className="app">
  <header className="header"><div className="brand"><span className="symbol">✦</span><div><strong>BODY CARE STUDIO</strong><small>MOVE · RELEASE · STRENGTHEN</small></div></div>
   <div className="header-right"><label className="area-switch"><span className="sr-only">부위 선택</span><select value={area} onChange={e=>{setArea(e.target.value);setExpanded(null);setArchived(false);setEditing(false);setLevel(1);setLevelRename(null)}}>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={15}/></label>
   {db&&<button className="icon-btn" title="로그아웃" onClick={()=>db.auth.signOut()}><LogOut size={17}/></button>}</div></header>
  <main className="content">
   <section className="heading"><div><h1>{areas.find(x=>x.id===area).name} · {groups.find(x=>x.id===group).name}</h1><p>{items.length}개 항목 · 전체 {allCount}개 · {sync}</p></div></section>
   <nav className="level-tabs" aria-label="관리 단계">{levelNames.map((name,i)=><button type="button" key={i} className={level===i+1?'active':''} onPointerDown={()=>beginLevelPress(i+1)} onPointerUp={cancelLevelPress} onPointerCancel={cancelLevelPress} onPointerLeave={cancelLevelPress} onContextMenu={e=>{e.preventDefault();cancelLevelPress();longPressRef.current=true;setLevelRename(i+1);setLevelDraft(name)}} onClick={()=>chooseLevel(i+1)}><span className="level-number">Lv.{i+1}</span><span className="level-name">{name}</span></button>)}</nav>
   {levelRename!==null&&<div className="level-rename-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setLevelRename(null)}}><form className="level-rename" onSubmit={saveLevelName}><div className="editor-head"><b>Lv.{levelRename} 이름 수정</b><button type="button" aria-label="닫기" onClick={()=>setLevelRename(null)}><X size={17}/></button></div><input autoFocus value={levelDraft} maxLength={20} onChange={e=>setLevelDraft(e.target.value)} aria-label="단계 이름" placeholder="단계 이름" required/><p>Lv. 번호와 단계 개수는 고정돼 있어.</p><button className="primary" type="submit">이름 저장</button></form></div>}
   <div className="toolbar"><button type="button" onClick={makeBackup}><Download size={15}/> JSON 백업</button><button onClick={()=>setImportOpen(v=>!v)}><Upload size={15}/> 가져오기</button>
    <button className={editing?'chosen':''} onClick={()=>{setEditing(v=>!v);setArchived(false)}}><Pencil size={15}/> {editing?'편집 완료':'목록 편집'}</button></div>
   {importOpen&&<div className="importer"><p>이전에 다운로드한 Body Care Studio JSON 백업을 병합해.</p><input type="file" accept="application/json,.json" onChange={e=>importBackup(e.target.files?.[0])}/></div>}
   {editing&&<div className="toolbar"><button onClick={()=>setEditItem({title:'',note:''})}><Plus size={15}/> 항목 추가</button><button onClick={()=>setArchived(v=>!v)}><RotateCcw size={15}/> {archived?'일반 목록':'보관 목록'}</button></div>}
   {editItem&&<ItemForm key={editItem.id||'new'} item={editItem} onSave={saveItem} onClose={()=>setEditItem(null)}/>}
   <div className="list">{items.map((item,index)=>{
    const open=expanded===item.id,active=Math.min(activeVideo[item.id]||0,Math.max(0,item.videos.length-1));
    return <article className="list-item" key={item.id}>
     <div className="item-row"><button className="item-heading" onClick={()=>{setExpanded(open?null:item.id);setVideoDraft('')}} aria-expanded={open}>
      <span className="number">{String(index+1).padStart(2,'0')}</span><span className="item-title">{item.title}</span>{item.videos.length>0&&<span className="counter">{item.videos.length}/5</span>}<ChevronDown className={open?'up':''} size={16}/></button>
      {!editing&&<button title="영상 추가" className="link-btn" onClick={()=>{setExpanded(item.id);setVideoDraft('')}}><Link2 size={17}/></button>}
     </div>
     {editing&&<div className="item-actions"><button disabled={index===0} onClick={()=>reorder(item.id,-1)} title="위로"><ArrowUp size={16}/></button><button disabled={index===items.length-1} onClick={()=>reorder(item.id,1)} title="아래로"><ArrowDown size={16}/></button>
     {!item.archived&&<button onClick={()=>setEditItem(item)}><Pencil size={15}/> 수정</button>}<button onClick={()=>moveArchive(item)}>{item.archived?<RotateCcw size={15}/>:<Trash2 size={15}/>} {item.archived?'복구':'보관'}</button></div>}
     {open&&<div className="detail">
      {item.note&&<p className="item-note">{item.note}</p>}
      {item.videos.length>0?<><div className="video-tabs">{item.videos.map((v,i)=><button key={v} className={i===active?'active':''} onClick={()=>setActiveVideo(a=>({...a,[item.id]:i}))}>{i+1}</button>)}</div>
       <div className="video"><iframe title={item.title+' 영상'} key={item.videos[active]} src={'https://www.youtube-nocookie.com/embed/'+item.videos[active]+'?playsinline=1'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" loading="lazy" allowFullScreen/></div>
       <div className="toolbar"><button onClick={()=>navigator.clipboard?.writeText('https://www.youtube.com/watch?v='+item.videos[active]).then(()=>show('링크 복사 완료')).catch(()=>show('복사 권한을 확인해 줘.'))}><Copy size={15}/> 링크 복사</button>
       <a target="_blank" rel="noreferrer" href={'https://www.youtube.com/watch?v='+item.videos[active]}><ExternalLink size={15}/> 영상 열기</a>
       <button onClick={()=>deleteVideo(item,active)}><Trash2 size={15}/> 영상 삭제</button></div></>:<div className="empty-video">등록한 영상이 없어. 유튜브 링크를 추가해 줘.</div>}
      {item.videos.length<MAX&&<form className="video-form" onSubmit={e=>{e.preventDefault();addVideos(item,videoDraft)}}><input value={videoDraft} onChange={e=>setVideoDraft(e.target.value)} placeholder="유튜브 링크 (최대 5개)"/><button type="submit"><Plus size={15}/> 영상 등록</button></form>}
     </div>}
    </article>
   })}</div>
   {!items.length&&<div className="empty-list">{archived?'보관된 항목이 없어.':'아직 항목이 없어.'}<button onClick={()=>{setEditing(true);setEditItem({title:'',note:''})}}><Plus size={15}/> 첫 항목 만들기</button></div>}
   <p className="footnote">{db?'기기 저장 + 로그인 계정 클라우드 동기화':'현재는 기기 저장 모드야. 클라우드 설정을 하면 로그인 및 기기 간 동기화가 가능해.'} JSON으로 언제든 전체 백업할 수 있어.</p>
   {notice&&<p className="toast" role="status" onClick={()=>setNotice('')}>{notice}<X size={14}/></p>}
  </main>
  <nav className="bottom-nav" aria-label="운동 카테고리">{groups.map(g=><button key={g.id} className={group===g.id?'active':''} onClick={()=>{setGroup(g.id);setExpanded(null);setArchived(false);setEditing(false);setEditItem(null);setLevel(1);setLevelRename(null)}}><span>{g.name}</span></button>)}</nav>
 </div>
}
function ItemForm({item,onSave,onClose}){
 const [title,setTitle]=useState(item.title||''),[note,setNote]=useState(item.note||'');
 return <form className="editor" onSubmit={e=>{e.preventDefault();onSave({title,note})}}>
  <div className="editor-head"><b>{item.id?'항목 수정':'새 항목 추가'}</b><button type="button" title="닫기" onClick={onClose}><X size={17}/></button></div>
  <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="운동 또는 관리 이름" required/>
  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={2000} placeholder="메모 · 주의사항 (선택)"/>
  <button type="submit" className="primary"><Check size={15}/> 저장</button>
 </form>
}
