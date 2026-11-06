import React,{useEffect,useMemo,useRef,useState} from 'react';
import CareLibrary,{seedBodyCatalog} from './CareLibrary.jsx';
import {createClient} from '@supabase/supabase-js';
import {ChevronDown,Plus,Pencil,Trash2,ArrowUp,ArrowDown,Link2,Copy,ExternalLink,Download,Upload,RotateCcw,LogOut,Check,X,Settings2} from 'lucide-react';
const sameSnapshot=(a,b)=>{const order=x=>Array.isArray(x)?x.map(order):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,order(x[k])])):x;return JSON.stringify(order(a))===JSON.stringify(order(b))};
const areas=[{id:'face',name:'Face Care'},{id:'lower',name:'하체'},{id:'upper',name:'상체'}];
const groups=[{id:'massage',name:'마사지'},{id:'stretch',name:'스트레치'},{id:'bodyweight',name:'맨몸근력'},{id:'machine',name:'기계근력'}];
const KEY='body-care-studio-v1',MAX=5;
const DEFAULT_LEVEL_NAMES=['마사지','이완','폼롤러','도구','SNPE'];
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
const normalize=obj=>({version:1,beautyCatalogSeedVersion:Number(obj?.beautyCatalogSeedVersion)||0,levelNames:obj?.levelNames&&typeof obj.levelNames==='object'&&!Array.isArray(obj.levelNames)?Object.fromEntries(Object.entries(obj.levelNames).filter(([k])=>areas.some(a=>groups.some(g=>k===levelKey(a.id,g.id)))).map(([k,v])=>[k,safeLevels(v)])):{},items:Array.isArray(obj?.items)?obj.items.filter(x=>x&&typeof x==='object'&&x.id).map((x,i)=>({
 id:String(x.id),area:areas.some(a=>a.id===x.area)?x.area:'upper',
 group:groups.some(g=>g.id===x.group)?x.group:'massage',level:Number.isInteger(Number(x.level))&&Number(x.level)>=1&&Number(x.level)<=5?Number(x.level):1,
 title:String(x.title||x.en||x.ko||'').slice(0,120),en:String(x.en||x.title||'').slice(0,120),ko:String(x.ko||'').slice(0,120),note:String(x.note||'').slice(0,2000),
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
 <h1>Body Care</h1><p>마사지부터 근력까지, 몸을 위한 개인 라이브러리</p>
 <div className="auth-tabs"><button type="button" className={!signup?'active':''} onClick={()=>setSignup(false)}>로그인</button><button type="button" className={signup?'active':''} onClick={()=>setSignup(true)}>회원가입</button></div>
 <input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" required/>
 <input type="password" minLength={6} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" required/>
 <button className="primary" type="submit" disabled={busy}>{busy?'처리 중…':signup?'회원가입':'이메일 로그인'}</button>
 {(alert||message)&&<p role="status" className="alert">{alert||message}</p>}
 <a className="public-preview-link" href="?preview=1">로그인 없이 보기 · 샘플 화면</a>
 </form></main>
}

export function BodyCarePreview(){
 const [area,setArea]=useState('lower'),[group,setGroup]=useState('stretch');
 const demo=useMemo(()=>seedBodyCatalog({version:1,items:[],levelNames:{},beautyCatalogSeedVersion:0}),[]);
 return <div className="app">
  <header className="header"><div className="brand"><span className="symbol">✦</span><div><strong>BODY CARE</strong></div></div>
   <div className="header-right"><label className="area-switch"><span className="sr-only">부위 선택</span><select value={area} onChange={e=>setArea(e.target.value)}>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={15}/></label></div>
  </header>
  <main className="content care-content"><div className="public-demo-note">샘플 화면 · 읽기 전용 · 개인 데이터 비공개</div><CareLibrary data={demo} onUpdate={()=>{}} area={area} group={group} sync="체험 모드" readOnly/></main>
  <nav className="bottom-nav" aria-label="운동 카테고리">{groups.map(g=><button key={g.id} className={group===g.id?'active':''} onClick={()=>setGroup(g.id)}>{g.name}</button>)}</nav>
 </div>;
}

export default function App(){
 const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(!db),[loaded,setLoaded]=useState(!db);
 const [data,setData]=useState(()=>seedBodyCatalog(normalize(read(KEY,initial())))),[area,setArea]=useState(areas[0].id),[group,setGroup]=useState('massage'),[level,setLevel]=useState(1);
 const [levelRename,setLevelRename]=useState(null),[levelDraft,setLevelDraft]=useState('');
 const pressTimer=useRef(null),longPressRef=useRef(false);
 const [editing,setEditing]=useState(false),[archived,setArchived]=useState(false),[editItem,setEditItem]=useState(null);
 const [expanded,setExpanded]=useState(null),[activeVideo,setActiveVideo]=useState({}),[videoDraft,setVideoDraft]=useState('');
 const [notice,setNotice]=useState(''),[sync,setSync]=useState(db?'로그인 대기':'기기 저장'),[saving,setSaving]=useState(false);
 const uploaded=useRef(null),importInput=useRef(null),loadedUser=useRef(null),saveVersion=useRef(0),serverBaseline=useRef(null),blockedSave=useRef(false);
 const userId=session?.user?.id;
 const localKey=userId?KEY+'-'+userId:KEY;
 const show=msg=>{setNotice(msg)};
 useEffect(()=>{if(!db)return;let live=true;db.auth.getSession().then(({data,error})=>{if(live){if(error)show(error.message);setSession(data?.session||null);setAuthReady(true)}}).catch(e=>{if(live){show(e.message);setAuthReady(true)}});
 const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{if(live)setSession(s)});
 return()=>{live=false;subscription.unsubscribe()}},[]);
 useEffect(()=>{
  if(!db)return;
  if(!userId){setLoaded(false);loadedUser.current=null;serverBaseline.current=null;blockedSave.current=false;setData(initial());return;}
  let live=true;setLoaded(false);serverBaseline.current=null;blockedSave.current=false;setSync('불러오는 중');
  (async()=>{try{
   const {data:remote,error}=await db.from('body_care_studio_data').select('payload').eq('user_id',userId).maybeSingle();
   if(error)throw error;if(!live)return;
   const local=read(localKey,null);
   serverBaseline.current=remote?.payload??null;
    const next=seedBodyCatalog(normalize(remote?.payload?.items?remote.payload:local||initial()));
   setData(next);persist(localKey,next);loadedUser.current=userId;setLoaded(true);setSync('동기화됨');
  }catch(e){if(live){setData(seedBodyCatalog(normalize(read(localKey,initial()))));loadedUser.current=null;setLoaded(false);blockedSave.current=true;setSync('불러오기 실패 · 저장 차단');show('서버 읽기 실패로 저장을 막았어 · 기기 데이터는 보존됨: '+e.message)}}})();
  return()=>{live=false};
 },[userId]);
 useEffect(()=>{
  if(!loaded)return;
  persist(localKey,data);
  if(!db||!userId||loadedUser.current!==userId||blockedSave.current)return;
  const n=++saveVersion.current;
  setSaving(true);setSync('저장 중');
  const timer=setTimeout(async()=>{
   try{
    const {data:row,error:readError}=await db.from('body_care_studio_data').select('payload').eq('user_id',userId).maybeSingle();
    if(readError)throw readError;
    if(saveVersion.current!==n||loadedUser.current!==userId)return;
    if(!sameSnapshot(row?.payload??null,serverBaseline.current)){
     blockedSave.current=true;setSaving(false);setSync('서버 변경 감지 · 저장 중단');
     show('다른 기기 변경을 감지해 덮어쓰지 않았어. 현재 데이터는 기기에 보존했어. JSON 백업을 해줘.');
     return;
    }
    const {error}=await db.from('body_care_studio_data').upsert({user_id:userId,payload:data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error)throw error;
    serverBaseline.current=data;
    if(saveVersion.current===n){setSaving(false);setSync('동기화됨')}
   }catch(e){if(saveVersion.current===n){setSaving(false);setSync('저장 실패');show('클라우드 저장 실패 · 기기 백업 유지: '+e.message)}}
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
  try{const raw=JSON.parse(await file.text());if(!['body-care-studio-v1','body-care-studio-v2'].includes(raw.format)||!Array.isArray(raw.items))throw new Error('Body Care Studio 백업 파일이 아니야.');
   const incoming=normalize(raw);
   if(!confirm('백업 항목을 현재 목록에 병합할까? 같은 ID 항목은 현재 값을 유지해.'))return;
   update(d=>{const existing=new Set(d.items.map(x=>x.id));for(const row of incoming.items)if(!existing.has(row.id))d.items.push(row);d.levelNames={...incoming.levelNames,...d.levelNames}});
   show('백업 가져오기 완료');
  }catch(e){show('가져오기 실패: '+e.message)}
 };
 if(!authReady)return <div className="loading">로그인 확인 중…</div>;
 if(db&&!session)return <Auth message={notice}/>;
 if(!loaded)return <div className="loading">내 목록 불러오는 중…</div>;
 return <div className="app">
  <header className="header"><div className="brand"><span className="symbol">✦</span><div><strong>BODY CARE</strong></div></div>
   <div className="header-right">
    <button type="button" className="icon-btn" title="전체 JSON 다운로드" aria-label="전체 JSON 다운로드" onClick={makeBackup}><Download size={17}/></button>
    <button type="button" className="icon-btn" title="전체 JSON 가져오기" aria-label="전체 JSON 가져오기" onClick={()=>importInput.current?.click()}><Upload size={17}/></button>
    <input ref={importInput} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];e.target.value='';importBackup(file)}}/>
    {db&&<button type="button" className="icon-btn" aria-label="로그아웃" title="로그아웃" onClick={()=>db.auth.signOut()}><LogOut size={17}/></button>}
    <label className="area-switch"><span className="sr-only">장르 선택</span><select aria-label="장르 선택" value={area} onChange={e=>{setArea(e.target.value);setExpanded(null);setArchived(false);setEditing(false);setLevel(1);setLevelRename(null)}}>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={15}/></label>
   </div></header>
  <main className="content care-content"><CareLibrary data={data} onUpdate={update} area={area} group={group} sync={sync}/></main>
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
