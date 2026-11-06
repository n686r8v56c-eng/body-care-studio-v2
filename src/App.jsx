import React,{useEffect,useMemo,useRef,useState} from 'react';
import {MAX_VIDEOS_PER_ITEM as MAX,normalizeVideoIds} from './videoLimits.js';
import CareLibrary,{seedBodyCatalog} from './CareLibrary.jsx';
import RoutineTimer from './RoutineTimer.jsx';
import PracticeRecords from './PracticeRecords.jsx';
import {createClient} from '@supabase/supabase-js';
import {ChevronDown,Plus,Pencil,Trash2,ArrowUp,ArrowDown,Link2,Copy,ExternalLink,Download,Upload,RotateCcw,LogOut,Check,X,Settings2} from 'lucide-react';
const sameSnapshot=(a,b)=>{const order=x=>Array.isArray(x)?x.map(order):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,order(x[k])])):x;return JSON.stringify(order(a))===JSON.stringify(order(b))};
const areas=[{id:'face',name:'Face Care'},{id:'lower',name:'하체'},{id:'upper',name:'상체'}];
const groups=[{id:'massage',name:'마사지'},{id:'stretch',name:'스트레치'},{id:'bodyweight',name:'맨몸근력'},{id:'machine',name:'기계근력'}];
const KEY='body-care-studio-v1';
const DEFAULT_LEVEL_NAMES=['마사지','이완','폼롤러','도구','SNPE'];
const levelKey=(area,group)=>area+':'+group;
const groupLabelKey=(area,group)=>area+':'+group;
const safeGroupNames=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([key,name])=>areas.some(a=>groups.some(g=>key===groupLabelKey(a.id,g.id)))&&typeof name==='string'&&name.trim()).map(([key,name])=>[key,name.trim().slice(0,20)])):{};
const safeLevels=value=>Array.from({length:5},(_,i)=>typeof value?.[i]==='string'&&value[i].trim()?value[i].trim().slice(0,20):DEFAULT_LEVEL_NAMES[i]);
const url=import.meta.env.VITE_SUPABASE_URL || 'https://kdxvtuldksnsjzjjyqda.supabase.co';
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AFL_RPrGakWmivWWOpA6rw_bWu6A-7B';
const db=url&&anon?createClient(url,anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const initial=()=>({version:1,items:[],levelNames:{},groupNames:{},routines:[],practiceLogs:[],bodyPracticeLogs:[]});
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
 return normalizeVideoIds(list.map(v=>typeof v==='string'?(idFromUrl(v)||(/^[\w-]{11}$/.test(v)?v:'')):''));
}
const normalize=obj=>({version:1,bodyPracticeLogs:Array.isArray(obj?.bodyPracticeLogs)?obj.bodyPracticeLogs.filter(x=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x?.date||'')&&['lower','upper'].includes(x?.area)).map(x=>({date:x.date,area:x.area,circulation:Math.max(0,Number(x.circulation)||0),strength:Math.max(0,Number(x.strength)||0),gym:Math.max(0,Number(x.gym)||0)})):[],practiceLogs:Array.isArray(obj?.practiceLogs)?obj.practiceLogs.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x?.date||'')).map(x=>({date:x.date,face:Math.max(0,Number(x.face)||0),voice:Math.max(0,Number(x.voice)||0)})):[],routines:Array.isArray(obj?.routines)?obj.routines.filter(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&Array.isArray(r.steps)).map(r=>({id:r.id,name:r.name.slice(0,100),area:areas.some(a=>a.id===r.area)?r.area:'face',group:groups.some(g=>g.id===r.group)?r.group:'massage',steps:r.steps.filter(s=>s&&typeof s.videoId==='string'&&/^[\w-]{11}$/.test(s.videoId)).map(s=>({itemId:String(s.itemId||''),videoId:s.videoId,title:String(s.title||'').slice(0,120),seconds:Math.min(3600,Math.max(5,Number(s.seconds)||60))}))})):[],beautyCatalogSeedVersion:Number(obj?.beautyCatalogSeedVersion)||0,groupNames:safeGroupNames(obj?.groupNames),levelNames:obj?.levelNames&&typeof obj.levelNames==='object'&&!Array.isArray(obj.levelNames)?Object.fromEntries(Object.entries(obj.levelNames).filter(([k])=>areas.some(a=>groups.some(g=>k===levelKey(a.id,g.id)))).map(([k,v])=>[k,safeLevels(v)])):{},items:Array.isArray(obj?.items)?obj.items.filter(x=>x&&typeof x==='object'&&x.id).map((x,i)=>({
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
 const [timerTab,setTimerTab]=useState(false),[timerKind,setTimerKind]=useState('face'),[recordsTab,setRecordsTab]=useState(false);
 const [practiceLogs,setPracticeLogs]=useState([]),[practiceStorage,setPracticeStorage]=useState('loading');
 const drainingPractice=useRef(false);
 const [levelRename,setLevelRename]=useState(null),[levelDraft,setLevelDraft]=useState('');
 const [groupRename,setGroupRename]=useState(null),[groupDraft,setGroupDraft]=useState('');
 const groupPressTimer=useRef(null),suppressGroupClick=useRef(false);
 const pressTimer=useRef(null),longPressRef=useRef(false);
 const [editing,setEditing]=useState(false),[archived,setArchived]=useState(false),[editItem,setEditItem]=useState(null);
 const [expanded,setExpanded]=useState(null),[activeVideo,setActiveVideo]=useState({}),[videoDraft,setVideoDraft]=useState('');
 const [notice,setNotice]=useState(''),[sync,setSync]=useState(db?'로그인 대기':'기기 저장'),[saving,setSaving]=useState(false);
 const uploaded=useRef(null),importInput=useRef(null),loadedUser=useRef(null),saveVersion=useRef(0),serverBaseline=useRef(null),blockedSave=useRef(false);
 const userId=session?.user?.id;
 const localKey=userId?KEY+'-'+userId:KEY;
 const timerPreferenceKey='body-care-last-timer-kind:'+String(userId||'guest')+':'+area;
 const timerKinds=area==='face'?[{id:'face',name:'Face'},{id:'voice',name:'Voice'}]:[{id:'circulation',name:'순환'},{id:'strength',name:'근력'},{id:'gym',name:'헬스'}];
 const activeTimerKind=timerKinds.some(t=>t.id===timerKind)?timerKind:timerKinds[0].id;
 const selectTimerKind=kind=>{
  setTimerKind(kind);
  try{localStorage.setItem(timerPreferenceKey,kind)}catch{}
 };
 useEffect(()=>{
  try{const kind=localStorage.getItem(timerPreferenceKey);setTimerKind(timerKinds.some(x=>x.id===kind)?kind:timerKinds[0].id)}
  catch{setTimerKind(timerKinds[0].id)}
 },[timerPreferenceKey]);
 const practiceQueueKey='body-care-practice-queue-v1-'+(userId||'guest');
 const legacyPracticeSignature=JSON.stringify(data.practiceLogs||[]);
 const sumPractice=(rows)=>{
  const daily=new Map();
  for(const entry of rows){
   const date=entry.practice_date||entry.date,kind=entry.category;
   if(!date||!['face','voice'].includes(kind))continue;
   const old=daily.get(date)||{date,face:0,voice:0};
   old[kind]+=Number(entry.duration_seconds)||0;
   daily.set(date,old);
  }
  return [...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
 };
 const legacyEntries=(records)=>(records||[]).flatMap(row=>['face','voice'].map(category=>({practice_date:row.date,category,duration_seconds:Number(row[category])||0})));
 const addPractice=(list,kind,seconds,date)=>{
  const result=list.map(x=>({...x}));let row=result.find(x=>x.date===date);
  if(!row){row={date,face:0,voice:0};result.push(row)}
  row[kind]=Math.round(((Number(row[kind])||0)+seconds)*1000)/1000;
  return result;
 };
 const drainPracticeQueue=async()=>{
  if(!db||!userId||drainingPractice.current)return;
  drainingPractice.current=true;
  try{
   while(true){
    const queue=read(practiceQueueKey,[]);
    if(!queue.length)break;
    const event=queue[0];
    const {error}=await db.from('body_care_practice_logs').upsert({
      user_id:userId,entry_key:event.entry_key,practice_date:event.practice_date,
      category:event.category,duration_seconds:event.duration_seconds
    },{onConflict:'user_id,entry_key',ignoreDuplicates:true});
    if(error)throw error;
    persist(practiceQueueKey,read(practiceQueueKey,[]).filter(item=>item.entry_key!==event.entry_key));
   }
  }catch(e){setPracticeStorage('queued');show('연습 기록 전송 대기 · 기기에 임시 보관됨: '+e.message)}
  finally{drainingPractice.current=false}
 };
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
 useEffect(()=>{
  if(!loaded)return;
  let live=true;
  const legacy=data.practiceLogs||[];
  const pending=read(practiceQueueKey,[]);
  setPracticeLogs(sumPractice([...legacyEntries(legacy),...pending]));
  if(!db||!userId){setPracticeStorage('local');return}
  setPracticeStorage('loading');
  (async()=>{
   try{
    if(legacy.length){
     const {error}=await db.rpc('migrate_body_care_practice_logs',{p_logs:legacy});
     if(error)throw error;
    }
    const rows=[];
    for(let offset=0;;offset+=1000){
     const {data:page,error}=await db.from('body_care_practice_logs')
      .select('entry_key,practice_date,category,duration_seconds').eq('user_id',userId)
      .order('practice_date',{ascending:false}).order('entry_key',{ascending:true})
      .range(offset,offset+999);
     if(error)throw error;
     rows.push(...(page||[]));
     if(!page||page.length<1000)break;
    }
    if(!live)return;
    const storedKeys=new Set((rows||[]).map(x=>x.entry_key));
    const notSaved=read(practiceQueueKey,[]).filter(x=>!storedKeys.has(x.entry_key));
    setPracticeLogs(sumPractice([...(rows||[]),...notSaved]));
    setPracticeStorage('sql');
    drainPracticeQueue();
   }catch(e){
    if(!live)return;
    setPracticeStorage('queued');
    setPracticeLogs(sumPractice([...legacyEntries(legacy),...read(practiceQueueKey,[])]));
    show('연습 기록 SQL 연결 대기 · 기존 기록과 새 기록은 보존됨: '+e.message);
   }
  })();
  return()=>{live=false};
 },[loaded,userId,legacyPracticeSignature]);
 useEffect(()=>{
  if(!userId||practiceStorage!=='sql')return;
  const resume=()=>drainPracticeQueue();
  window.addEventListener('online',resume);
  return()=>window.removeEventListener('online',resume);
 },[userId,practiceStorage]);
 const sorted=(items)=>items.sort((a,b)=>a.sort-b.sort||a.title.localeCompare(b.title,'ko'));
 const items=useMemo(()=>sorted(data.items.filter(x=>x.area===area&&x.group===group&&x.level===level&&x.archived===archived)),[data,area,group,level,archived]);
 const levelNames=safeLevels(data.levelNames?.[levelKey(area,group)]);
 const cancelLevelPress=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null}};
 const beginLevelPress=n=>{cancelLevelPress();longPressRef.current=false;pressTimer.current=setTimeout(()=>{longPressRef.current=true;setLevelRename(n);setLevelDraft(levelNames[n-1]);pressTimer.current=null},550)};
 const chooseLevel=n=>{if(longPressRef.current){longPressRef.current=false;return}setLevel(n);setExpanded(null);setEditItem(null)};
 const saveLevelName=e=>{e.preventDefault();const text=levelDraft.trim().slice(0,20);if(!text)return;update(d=>{const key=levelKey(area,group);d.levelNames={...(d.levelNames||{}),[key]:safeLevels(d.levelNames?.[key]).map((name,i)=>i===levelRename-1?text:name)}});setLevelRename(null);show('단계 이름을 저장했어')};
 const groupName=(areaId,g)=>data.groupNames?.[groupLabelKey(areaId,g.id)]||g.name;
 const cancelGroupPress=()=>{if(groupPressTimer.current){clearTimeout(groupPressTimer.current);groupPressTimer.current=null}};
 const beginGroupPress=(g)=>{cancelGroupPress();suppressGroupClick.current=false;groupPressTimer.current=setTimeout(()=>{groupPressTimer.current=null;suppressGroupClick.current=true;setGroupRename({area,group:g.id});setGroupDraft(groupName(area,g))},550)};
 const chooseGroup=id=>{if(suppressGroupClick.current){suppressGroupClick.current=false;return}setGroup(id);setExpanded(null);setArchived(false);setEditing(false);setEditItem(null);setLevel(1);setLevelRename(null)};
 const saveGroupName=e=>{e.preventDefault();if(!groupRename)return;const name=groupDraft.trim().slice(0,20);if(!name)return;update(d=>{d.groupNames={...(d.groupNames||{}),[groupLabelKey(groupRename.area,groupRename.group)]:name}});setGroupRename(null);show('카테고리 이름을 저장했어')};
 useEffect(()=>()=>{if(groupPressTimer.current)clearTimeout(groupPressTimer.current)},[]);
 const allCount=data.items.filter(x=>!x.archived).length;
 const isTimerName=(name)=>/^(timer|타이머|루틴\s*타이머)$/i.test(String(name||'').trim());
 const timerGroup=groups.find(g=>isTimerName(groupName(area,g)));
 const isTimerOpen=!recordsTab&&(timerTab || Boolean(timerGroup&&timerGroup.id===group));
 const isRecordGroup=groups.some(g=>g.id===group&&/^(기록|운동기록|연습기록)$/i.test(groupName(area,g).trim()));
 const isRecordOpen=recordsTab || (area==='face'&&group==='machine'&&!timerTab) || (!timerTab&&isRecordGroup);
 const recordBodyPractice=(kind,seconds)=>{
  if(!['circulation','strength','gym'].includes(kind)||!['lower','upper'].includes(area)||!Number.isFinite(seconds)||seconds<=0)return;
  const now=new Date(),day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  update(d=>{d.bodyPracticeLogs=d.bodyPracticeLogs||[];let row=d.bodyPracticeLogs.find(x=>x.date===day&&x.area===area);if(!row){row={date:day,area,circulation:0,strength:0,gym:0};d.bodyPracticeLogs.push(row)}row[kind]=Math.round(((Number(row[kind])||0)+seconds)*1000)/1000});
 };
 const recordPractice=(kind,seconds)=>{
  if(!['face','voice'].includes(kind)||!Number.isFinite(seconds)||seconds<=0)return;
  const now=new Date(),day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const event={entry_key:uid(),practice_date:day,category:kind,duration_seconds:Math.round(seconds*1000)/1000};
  persist(practiceQueueKey,[...read(practiceQueueKey,[]),event]);
  setPracticeLogs(previous=>addPractice(previous,kind,event.duration_seconds,day));
  if(practiceStorage==='sql')drainPracticeQueue();
 };
 const sourceGroup=(kind)=>{
  // Users may rename bottom tabs: resolve their saved label first, then
  // fall back to stable internal IDs without changing stored video data.
  const labels={
   face:/^(face|페이스|얼굴)$/i,voice:/^(voice|보이스|음성)$/i,
   circulation:/^(순환|순환운동|순환관리|마사지|스트레칭|스트레치)$/i,
   strength:/^(근력|근력운동|맨몸근력|웨이트)$/i,
   gym:/^(헬스|헬스장|기계근력|머신)$/i
  };
  const match=groups.find(g=>g.id!==timerGroup?.id&&labels[kind]?.test(groupName(area,g).trim()));
  if(match)return match.id;
  const fallback={face:'massage',voice:'stretch',circulation:'massage',strength:'bodyweight',gym:'machine'}[kind]||'massage';
  if(fallback!==timerGroup?.id)return fallback;
  return groups.find(g=>g.id!==timerGroup?.id)?.id||fallback;
 };
 const bottomTabs=(
  area==='face'
   ? [...groups,...(!timerGroup?[{id:'__timer'}]:[])]
   : [...groups,...(!timerGroup?[{id:'__timer'}]:[]),...(!groups.some(g=>/^(기록|운동기록|연습기록)$/i.test(groupName(area,g).trim()))?[{id:'__records'}]:[])].sort((a,b)=>{
      const order=g=>{
       if(g.id==='__timer'||isTimerName(groupName(area,g)))return 3;
       if(g.id==='__records')return 4;
       const label=groupName(area,g).trim();
       if(/^(순환|순환운동|순환관리)$/i.test(label))return 0;
       if(/^(근력|근력운동)$/i.test(label))return 1;
       if(/^(헬스|헬스장)$/i.test(label))return 2;
       if(/^(기록|운동기록|연습기록)$/i.test(label))return 4;
       const fallback={massage:0,stretch:1,bodyweight:2,machine:4};
       return fallback[g.id]??4;
      };
      return order(a)-order(b);
     })
 );
 const chooseBottom=(id)=>{if(id==='__records'||(area!=='face'&&/^(기록|운동기록|연습기록)$/i.test(groupName(area,groups.find(g=>g.id===id)||groups[0]).trim()))){setRecordsTab(true);setTimerTab(false);return;}if(area==='face'&&id==='machine'){setRecordsTab(true);setTimerTab(false);setGroup(id);return;}setRecordsTab(false);if(timerGroup?.id===id){setTimerTab(false);setGroup(id);return;}setTimerTab(false);chooseGroup(id)};
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
   update(d=>{const existing=new Set(d.items.map(x=>x.id));for(const row of incoming.items)if(!existing.has(row.id))d.items.push(row);d.levelNames={...incoming.levelNames,...d.levelNames};d.groupNames={...incoming.groupNames,...d.groupNames};d.routines=[...(d.routines||[]),...incoming.routines.filter(r=>!(d.routines||[]).some(existing=>existing.id===r.id))];for(const entry of incoming.practiceLogs){if(!d.practiceLogs.some(x=>x.date===entry.date))d.practiceLogs.push(entry)}});
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
    <label className="area-switch"><span className="sr-only">장르 선택</span><select aria-label="장르 선택" value={area} onChange={e=>{setArea(e.target.value);setTimerTab(false);setRecordsTab(false);setExpanded(null);setArchived(false);setEditing(false);setLevel(1);setLevelRename(null)}}>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={15}/></label>
   </div></header>
  <main className={'content care-content'+(!isTimerOpen&&!isRecordOpen&&area==='face'&&group===sourceGroup('voice')?' voice-library-theme':'')+(!isTimerOpen&&!isRecordOpen&&area!=='face'&&group===sourceGroup('circulation')?' circulation-library-theme':'')+(!isTimerOpen&&!isRecordOpen&&area!=='face'&&group===sourceGroup('strength')?' strength-library-theme':'')+(!isTimerOpen&&!isRecordOpen&&area!=='face'&&group===sourceGroup('gym')?' gym-library-theme':'')}>{isRecordOpen?<PracticeRecords logs={area==='face'?practiceLogs:(data.bodyPracticeLogs||[]).filter(x=>x.area===area)} area={area}/>:isTimerOpen?<div className="body-timer-page"><h1 className="body-timer-title">Timer</h1><div className="body-timer-subtabs" role="tablist" aria-label="타이머 종류">{timerKinds.map(t=><button key={t.id} type="button" role="tab" aria-selected={activeTimerKind===t.id} className={activeTimerKind===t.id?'active '+t.id:''} onClick={()=>selectTimerKind(t.id)}>{t.name}</button>)}</div><RoutineTimer key={userId+':'+area+':'+activeTimerKind+':'+sourceGroup(activeTimerKind)} data={data} onUpdate={update} area={area} group={sourceGroup(activeTimerKind)} theme={activeTimerKind} userId={userId} database={db} onRecordSeconds={area==='face'?recordPractice:recordBodyPractice} embedded/></div>:<CareLibrary data={data} onUpdate={update} area={area} group={group} sync={sync}/>}</main>
  <nav className={'bottom-nav'+(area==='face'?'':' bottom-nav-five')} aria-label="운동 카테고리">{bottomTabs.map(g=>g.id==='__records'?<button key="__records" type="button" className={recordsTab?'active':''} onClick={()=>{setRecordsTab(true);setTimerTab(false)}}>기록</button>:g.id==='__timer'?<button key="__timer" type="button" className={timerTab?'active':''} onClick={()=>{setTimerTab(true);setRecordsTab(false)}}>Timer</button>:<button key={g.id} type="button" className={!timerTab&&!recordsTab&&group===g.id?'active':''} title="길게 눌러 이름 변경" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;beginGroupPress(g)}} onPointerUp={cancelGroupPress} onPointerCancel={cancelGroupPress} onPointerLeave={cancelGroupPress} onContextMenu={e=>{e.preventDefault();cancelGroupPress();suppressGroupClick.current=true;setGroupRename({area,group:g.id});setGroupDraft(groupName(area,g))}} onClick={()=>chooseBottom(g.id)}><span>{area==='face'&&g.id==='machine'?'기록':groupName(area,g)}</span></button>)}</nav>
  {groupRename&&<div className="level-rename-backdrop" role="presentation" onClick={()=>setGroupRename(null)}><form className="level-rename" role="dialog" aria-modal="true" aria-label="하단 카테고리 이름 변경" onClick={e=>e.stopPropagation()} onSubmit={saveGroupName}><strong>하단 카테고리 이름 변경</strong><p>{areas.find(a=>a.id===groupRename.area)?.name} · 이 장르에만 적용돼</p><input autoFocus value={groupDraft} onChange={e=>setGroupDraft(e.target.value)} maxLength={20} aria-label="새 카테고리 이름" required/><div className="rename-actions"><button type="button" onClick={()=>setGroupRename(null)}>취소</button><button type="submit" className="primary" disabled={!groupDraft.trim()}>저장</button></div></form></div>}
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
