import React,{useEffect,useMemo,useRef,useState} from 'react';
import CareLibrary from './CareLibrary.jsx';
import './RoutineTimer.css';

export const YOGA_CATEGORIES=Object.freeze(['전굴','후굴','측굴','회전']);
const GLUTES_YOGA_CATEGORIES=Object.freeze(['의자자세 변형','피라미드 변형','전사자세 변형','한다리서기 변형','Legacy Techniques · Review']);
const BACK_YOGA_CATEGORIES=Object.freeze(['L Sit 변형','One Leg Lotus 변형','Supine','Prone','Legacy Techniques · Review']);
const BACK_MASSAGE_CATEGORIES=Object.freeze(['상부 승모근·목 아래','견갑골 주변','광배근·등 옆','척추기립근 주변']);
const ARMS_YOGA_CATEGORIES=Object.freeze(['Kneeling','Prone','Legacy Techniques · Review']);
const STUDIO_NAMES={core:'코어',glutes:'엉덩이',hips:'고관절',thighs:'허벅지',legs:'다리',back:'등',arms:'팔'};
const LEGS_STRETCH_CATEGORIES=['종아리','발목','발바닥·발가락','정강이·앞종아리','다리 올리기·펌핑'];
const LEGS_MASSAGE_CATEGORIES=['종아리 마사지','발목 주변','발바닥 마사지','정강이 주변','다리 전체 이완'];
const STUDIO_STRENGTH_CATEGORIES={
 legs:LEGS_STRETCH_CATEGORIES,
 glutes:['Quadruped','Supine','Prone','Side-Lying','Half Kneeling','Tall Kneeling','Seated','Bench-Supported','Bilateral Standing','Single-Leg Standing','Split Stance','Kickstand / B-Stance','Step up','Legacy Techniques · Review'],
 hips:['90/90 Sitting','Quadruped','Half-Kneeling Lunge','Supine','Standing','Deep Squat','Side-Kneeling','Prone','Long Sitting','Frog','Z-Shaped Legs'],
 thighs:['안벅지','뒷벅지','앞벅지','Legacy Techniques · Review'],
 // These new studios share the complete technique/routine/timer UI; taxonomy can be finalized later.
 back:['광배근','등 중앙','상부 승모근','척추기립근','흉추 가동성','Legacy Techniques · Review'],
 arms:['이두근','삼두근','전완근','Legacy Techniques · Review']
};
export const CORE_CATEGORIES=Object.freeze([
 '몸통 굴곡','몸통 신전','몸통 회전','신전 저항','회전 저항','측굴 저항','복합·통합','준비동작 · 마무리동작','몸통 측굴'
]);
// Core category order is visual only; saved category indices remain unchanged.
const orderedCategoryEntries=categories=>{
 const order=categories===CORE_CATEGORIES?[0,1,2,8,3,4,5,6,7]
  :categories===STUDIO_STRENGTH_CATEGORIES.hips?[1,9,6,2,0,10,5,8,3,7,4]
  :categories.map((_,i)=>i);
 return order.map(i=>[categories[i],i]);
};
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
function TechniqueReferences({technique,onUpdate,storageKey='coreTechniques'}){
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
   const row=(d[storageKey]||[]).find(x=>x.id===technique.id);
   if(row){row.references=Array.isArray(row.references)?row.references:[];row.references.push({id:uid(),url:vid.url,title:draft.title.trim().slice(0,150)||'참고 영상',start,end,memo:draft.memo.trim().slice(0,500)})}
  });setSelectedRef(null);setShowPlayer(false);reset();
 };
 const remove=id=>{
  if(!window.confirm('이 기술에 연결된 참고 영상만 삭제할까? 원본 영상과 기술은 유지돼.'))return;
  onUpdate(d=>{const row=(d[storageKey]||[]).find(x=>x.id===technique.id);if(row){row.references=(row.references||[]).filter(x=>x.id!==id);row.removedReferenceIds=[...new Set([...(row.removedReferenceIds||[]),id])]}});
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

const THIGH_POSTURE_TAGS=['Supine','Side-Lying','Standing','Machine'];
const thighPostureOf=t=>THIGH_POSTURE_TAGS.find(tag=>(t.tags||[]).includes(tag))||'';
function CoreTechniques({data,onUpdate,database,userId,title='코어',strengthCategories=CORE_CATEGORIES,yogaCategories=YOGA_CATEGORIES,massageCategories=[],modeLabels=['맨몸근력','요가']}){
 const [mode,setMode]=useState('strength');
 const [addingTechnique,setAddingTechnique]=useState(false);
 const [techniqueDraft,setTechniqueDraft]=useState({name:'',en:'',category:0,posture:'',muscles:'',description:'',tags:''});
 const [openCategories,setOpenCategories]=useState([]);
 const [postureFilters,setPostureFilters]=useState({});
 const [search,setSearch]=useState('');
 const [searchClosed,setSearchClosed]=useState([]);
 const [expanded,setExpanded]=useState([]);
 const [editingImage,setEditingImage]=useState('');
 const [imageDraft,setImageDraft]=useState('');
 const [imageError,setImageError]=useState('');
 const [imageMethod,setImageMethod]=useState('');
 const [uploadingImage,setUploadingImage]=useState(false);
 const imageFileInput=useRef(null);
 const [signedImages,setSignedImages]=useState({});
 const [failedImages,setFailedImages]=useState([]);
 const yogaMode=mode==='yoga';
 const massageMode=mode==='massage';
 const categories=massageMode?massageCategories:yogaMode?yogaCategories:strengthCategories;
 const thighMode=title==='허벅지'&&!yogaMode&&!massageMode;
 const techniques=massageMode?(data.coreMassageTechniques||[]):yogaMode?(data.coreYogaTechniques||[]):(data.coreTechniques||[]);
 useEffect(()=>{
  let alive=true;
  const missing=techniques.filter(t=>t.imagePath&&signedImages[t.imagePath]===undefined);
  if(!database||!userId||!missing.length)return;
  Promise.all(missing.map(async t=>{
   const {data:link,error}=await database.storage.from('body-care-technique-images').createSignedUrl(t.imagePath,3600);
   return [t.imagePath,error?'':link?.signedUrl||''];
  })).then(entries=>{if(alive)setSignedImages(previous=>({...previous,...Object.fromEntries(entries)}))});
  return ()=>{alive=false};
 },[database,userId,techniques,signedImages]);
 const term=search.trim().toLocaleLowerCase();
 const searchable=t=>[t.name,t.en,t.posture,t.muscles,t.description,t.notes,...(t.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(term);
 const categoryMatches=i=>categories[i].toLocaleLowerCase().includes(term);
 const matchingEntries=i=>techniques.filter(t=>t.category===i&&(!term||categoryMatches(i)||searchable(t))&&(!thighMode||!postureFilters[i]||thighPostureOf(t)===postureFilters[i]));
 const clearSearch=()=>{setSearch('');setSearchClosed([]);setOpenCategories([])};
 const totalMatches=term?categories.reduce((sum,_,i)=>sum+matchingEntries(i).length,0):techniques.length;
 const switchMode=next=>{setPostureFilters({});setAddingTechnique(false);setTechniqueDraft({name:'',en:'',category:0,posture:'',muscles:'',description:'',tags:''});setMode(next);setSearch('');setSearchClosed([]);setOpenCategories([]);setExpanded([]);setEditingImage('');setImageDraft('');setImageError('');setImageMethod('')};
 const toggle=id=>setExpanded(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 const isValidUrl=value=>{try{const u=new URL(String(value).trim());return ['https:','http:'].includes(u.protocol)&&!!u.hostname}catch{return false}};
 const storageKey=massageMode?'coreMassageTechniques':yogaMode?'coreYogaTechniques':'coreTechniques';
 const saveTechnique=e=>{
  e.preventDefault();
  const label=techniqueDraft.name.trim(),cat=Number(techniqueDraft.category);
  if(!label||!Number.isInteger(cat)||cat<0||cat>=categories.length)return;
  const id=uid();
  onUpdate(d=>{
   d[storageKey]=[...(d[storageKey]||[]),{
    id,name:label.slice(0,120),en:techniqueDraft.en.trim().slice(0,120),category:cat,
    posture:techniqueDraft.posture.trim().slice(0,200),
    muscles:techniqueDraft.muscles.trim().slice(0,400),
    description:techniqueDraft.description.trim().slice(0,1500),
    tags:[...new Set([...(thighMode&&techniqueDraft.postureTag?[techniqueDraft.postureTag]:[]),...techniqueDraft.tags.split(',').map(x=>x.trim()).filter(Boolean).filter(tag=>!thighMode||!THIGH_POSTURE_TAGS.includes(tag)||tag===techniqueDraft.postureTag)])].slice(0,12),
    imageUrl:'',imagePath:'',imageRemoved:false,references:[],removedReferenceIds:[],notes:''
   }];
  });
  setAddingTechnique(false);setTechniqueDraft({name:'',en:'',category:0,posture:'',muscles:'',description:'',tags:''});
  setSearch('');setOpenCategories([cat]);setExpanded([id]);
 };
 const updateImage=(id,value)=>{
  const clean=value.trim();
  if(!isValidUrl(clean)){setImageError('http:// 또는 https:// 이미지 URL을 입력해 줘.');return}
  onUpdate(d=>{const row=(d[storageKey]||[]).find(x=>x.id===id);if(row){row.imageUrl=clean.slice(0,2000);row.imagePath='';row.imageRemoved=false}});
  setFailedImages(ids=>ids.filter(x=>x!==id));setEditingImage('');setImageDraft('');setImageError('');setImageMethod('');
 };
 const deleteImage=id=>{
  onUpdate(d=>{const row=(d[storageKey]||[]).find(x=>x.id===id);if(row){row.imageUrl='';row.imagePath='';row.imageRemoved=true}});
  setEditingImage('');setImageDraft('');setImageError('');setImageMethod('');
 };
 const uploadImage=async(id,file)=>{
  if(!file)return;
  if(!database||!userId){setImageError('로그인 또는 Supabase 연결을 먼저 확인해 줘.');return}
  const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  if(!types[file.type]){setImageError('JPG, PNG, WEBP 형식의 사진만 올릴 수 있어.');return}
  if(file.size>5*1024*1024){setImageError('사진은 최대 5MB까지 올릴 수 있어.');return}
  setImageError('');setUploadingImage(true);
  try{
   const path=userId+'/'+(yogaMode?'yoga':'strength')+'/'+uid()+'.'+types[file.type];
   const {error}=await database.storage.from('body-care-technique-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(error)throw error;
   const signed=await database.storage.from('body-care-technique-images').createSignedUrl(path,3600);
   if(signed.error)throw signed.error;
   setSignedImages(prev=>({...prev,[path]:signed.data.signedUrl}));
   onUpdate(d=>{const row=(d[storageKey]||[]).find(x=>x.id===id);if(row){row.imagePath=path;row.imageUrl='';row.imageRemoved=false}});
   setFailedImages(ids=>ids.filter(x=>x!==id));
   setEditingImage('');setImageMethod('');
  }catch(error){setImageError('업로드 실패: '+(error?.message||'Storage 설정을 확인해 줘.'))}
  finally{setUploadingImage(false)}
 };
 return <section style={{padding:'16px'}}>
  <h2>{title} · 기술 라이브러리</h2>
  <div role="tablist" aria-label={title+" 운동 유형"} style={{display:'grid',gridTemplateColumns:'repeat('+modeLabels.length+',minmax(0,1fr))',gap:8,marginBottom:15}}>
   {[{id:'strength',label:modeLabels[0]},{id:'yoga',label:modeLabels[1]},...(modeLabels[2]?[{id:'massage',label:modeLabels[2]}]:[])].map(t=><button key={t.id} type="button" role="tab" aria-selected={mode===t.id} onClick={()=>switchMode(t.id)} style={{...btn,fontSize:15,fontWeight:700,padding:'12px 8px',background:mode===t.id?'#e9ddf7':'transparent',borderColor:mode===t.id?'#ac8fcd':'#e5ddea',color:mode===t.id?'#65458c':'inherit'}}>{t.label}</button>)}
  </div>
  <div style={{marginBottom:12}}>
   <button type="button" onClick={()=>setAddingTechnique(v=>!v)} style={{...btn,width:'100%',background:addingTechnique?'#f3eafa':'#fff',borderColor:'#c5adde',fontWeight:700,fontSize:14}}>{addingTechnique?'− 기술 등록 닫기':'＋ 새 기술 등록'}</button>
   {addingTechnique&&<form onSubmit={saveTechnique} style={{display:'grid',gap:9,padding:13,marginTop:8,border:'1px solid #e3d7ef',borderRadius:13,background:'#fff'}}>
    <label style={{display:'grid',gap:4,fontSize:13}}>기술명<input required maxLength={120} value={techniqueDraft.name} onChange={e=>setTechniqueDraft(v=>({...v,name:e.target.value}))} placeholder="동작 이름" style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}/></label>
    <label style={{display:'grid',gap:4,fontSize:13}}>대분류<select value={techniqueDraft.category} onChange={e=>setTechniqueDraft(v=>({...v,category:Number(e.target.value)}))} style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}>{orderedCategoryEntries(categories).map(([name,i])=>name==='Legacy Techniques · Review'?null:<option key={name} value={i}>{name}</option>)}</select></label>
    {thighMode&&<label style={{display:'grid',gap:4,fontSize:13}}>시작 자세 태그<select value={techniqueDraft.postureTag||''} onChange={e=>setTechniqueDraft(v=>({...v,postureTag:e.target.value}))} style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}><option value="">선택 안 함</option>{THIGH_POSTURE_TAGS.map(tag=><option key={tag} value={tag}>{tag}</option>)}</select></label>}
    <label style={{display:'grid',gap:4,fontSize:13}}>영문명 (선택)<input maxLength={120} value={techniqueDraft.en} onChange={e=>setTechniqueDraft(v=>({...v,en:e.target.value}))} style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}/></label>
    <label style={{display:'grid',gap:4,fontSize:13}}>자세 (선택)<input maxLength={200} value={techniqueDraft.posture} onChange={e=>setTechniqueDraft(v=>({...v,posture:e.target.value}))} style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}/></label>
    <label style={{display:'grid',gap:4,fontSize:13}}>주요 근육 (선택)<input maxLength={400} value={techniqueDraft.muscles} onChange={e=>setTechniqueDraft(v=>({...v,muscles:e.target.value}))} style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}/></label>
    <label style={{display:'grid',gap:4,fontSize:13}}>기술 설명 (선택)<textarea rows={3} maxLength={1500} value={techniqueDraft.description} onChange={e=>setTechniqueDraft(v=>({...v,description:e.target.value}))} style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}/></label>
    <label style={{display:'grid',gap:4,fontSize:13}}>태그 (쉼표로 구분)<input value={techniqueDraft.tags} onChange={e=>setTechniqueDraft(v=>({...v,tags:e.target.value}))} placeholder="예: 외전, 골반 안정화" style={{fontSize:16,padding:10,border:'1px solid #d7c6e8',borderRadius:9}}/></label>
    <button type="submit" disabled={!techniqueDraft.name.trim()} style={{...btn,background:'#9474c0',color:'#fff',fontWeight:700}}>기술 저장</button>
   </form>}
  </div>
  <div style={{display:'flex',alignItems:'center',gap:8,border:'1px solid #d9cae8',borderRadius:12,padding:'7px 11px',marginBottom:8,background:'transparent'}}>
   <span aria-hidden="true" style={{color:'#8f76ac',fontSize:18}}>⌕</span>
   <input type="search" aria-label={title+" 기술 검색"} value={search} onChange={e=>{setSearch(e.target.value);setSearchClosed([])}} placeholder="기술명 · 영문명 · 근육 · 자세 · 태그 검색" style={{flex:1,minWidth:0,border:0,outline:'none',background:'transparent',color:'inherit',fontSize:16,padding:'7px 0'}}/>
   {!!search&&<button type="button" aria-label="검색어 지우기" onClick={clearSearch} style={{...btn,padding:'5px 9px',fontSize:12}}>지우기</button>}
  </div>
  {term&&<p role="status" style={{fontSize:12,color:'#8d78a4',margin:'0 0 12px'}}>검색 결과 {totalMatches}개</p>}
  <div style={{display:'grid',gap:10,marginBottom:16}}>
   {orderedCategoryEntries(categories).map(([name,i],displayIndex)=>{
    // Only show the old review group when it contains saved techniques.
    if(name==='Legacy Techniques · Review'&&!techniques.some(t=>t.category===i))return null;
    const entries=matchingEntries(i);
    if(term&&!entries.length)return null;
    const openCategory=term?!searchClosed.includes(i):openCategories.includes(i);
    return <section key={name} style={{border:'1px solid #e4d9ed',borderRadius:13,overflow:'hidden'}}>
     <button type="button" aria-expanded={openCategory} onClick={()=>term?setSearchClosed(v=>openCategory?[...v,i]:v.filter(x=>x!==i)):setOpenCategories(v=>openCategory?v.filter(x=>x!==i):[...v,i])} style={{width:'100%',padding:'15px 14px',display:'flex',alignItems:'center',gap:12,border:0,background:'transparent',color:'inherit',textAlign:'left',cursor:'pointer'}}>
      <span style={{fontSize:12,color:'#947ead',minWidth:22}}>{String(displayIndex+1).padStart(2,'0')}</span>
      <strong style={{fontSize:16,flex:1}}>{name}</strong>
      <span style={{fontSize:12,color:'#927eaa'}}>{entries.length}개</span>
      <span style={{color:'#977eb0',fontSize:17}} aria-hidden="true">{openCategory?'⌃':'⌄'}</span>
     </button>
     {openCategory&&<div style={{borderTop:'1px solid #e9e1ef',padding:'10px',display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:12}}>
      {thighMode&&i<3&&<div role="group" aria-label={name+' 시작 자세 필터'} style={{display:'flex',gap:6,flexWrap:'wrap'}}>
       {['전체',...THIGH_POSTURE_TAGS].map(tag=>{const value=tag==='전체'?'':tag;const selected=(postureFilters[i]||'')===value;const count=techniques.filter(t=>t.category===i&&(!value||thighPostureOf(t)===value)).length;return <button key={tag} type="button" aria-pressed={selected} onClick={()=>setPostureFilters(prev=>({...prev,[i]:value}))} style={{...btn,fontSize:12,padding:'7px 10px',borderRadius:20,background:selected?'#e9ddf7':'#fff',color:selected?'#624184':'inherit',borderColor:selected?'#b79bd5':'#e1d5e9'}}>{tag} {count}</button>})}
      </div>}
      {!entries.length&&<p style={{fontSize:13,opacity:.65,margin:'8px 4px'}}>등록된 동작이 없어.</p>}
      {entries.map(t=>{

    const open=expanded.includes(t.id),imageSrc=t.imagePath?signedImages[t.imagePath]:t.imageUrl,hasImage=!!imageSrc&&!failedImages.includes(t.id);
    return <article key={t.id} style={{minWidth:0,border:'1px solid #ddd5e7',borderRadius:14,overflow:'hidden',background:'var(--card-bg,transparent)'}}>
     <button type="button" aria-expanded={open} onClick={()=>toggle(t.id)} style={{border:0,padding:0,width:'100%',display:'block',textAlign:'left',background:'transparent',color:'inherit',cursor:'pointer'}}>
      <div style={{aspectRatio:'4 / 3',width:'100%',background:'#f2eff6',display:'flex',justifyContent:'center',alignItems:'center',overflow:'hidden'}}>
       {hasImage?<img src={imageSrc} alt={t.name+' 동작 참고 이미지'} loading="lazy" onError={()=>setFailedImages(ids=>ids.includes(t.id)?ids:[...ids,t.id])} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<span style={{fontSize:12,color:'#857990',padding:8,textAlign:'center'}}>사진 추가</span>}
      </div>
      <div style={{padding:'10px 12px 6px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:5,minHeight:52}}>
       <strong style={{fontSize:14,lineHeight:1.4,overflowWrap:'anywhere'}}>{t.name}{thighMode&&thighPostureOf(t)&&<span style={{display:'block',fontSize:12,color:'#8060a5',fontWeight:500,marginTop:3}}>{thighPostureOf(t)}</span>}</strong>
       <span style={{fontSize:17,color:'#927ab8',flexShrink:0}} aria-hidden="true">{open?'⌃':'⌄'}</span>
      </div>
     </button>
     <div style={{padding:'0 8px 9px',display:'flex',gap:5}}>
      <button type="button" style={{...btn,flex:1,padding:'7px 4px',fontSize:12}} onClick={()=>{setEditingImage(editingImage===t.id?'':t.id);setImageDraft('');setImageError('');setImageMethod('')}}>{t.imageUrl||t.imagePath?'사진 변경':'사진 추가'}</button>
      <button type="button" style={{...btn,padding:'7px 8px',fontSize:12}} disabled={!t.imageUrl&&!t.imagePath} onClick={()=>deleteImage(t.id)}>삭제</button>
     </div>
     {editingImage===t.id&&<div style={{padding:'0 9px 10px',display:'grid',gap:8}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
       <button type="button" disabled={uploadingImage} style={{...btn,background:imageMethod==='upload'?'#eee5fb':'transparent',fontWeight:imageMethod==='upload'?700:400}} onClick={()=>{setImageMethod('upload');setImageError('');imageFileInput.current?.click()}}>직접 업로드</button>
       <button type="button" style={{...btn,background:imageMethod==='url'?'#eee5fb':'transparent',fontWeight:imageMethod==='url'?700:400}} onClick={()=>{setImageMethod('url');setImageError('')}}>이미지 URL</button>
      </div>
      <input ref={imageFileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} aria-label={t.name+' 사진 파일 선택'} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(t.id,file);e.target.value=''}} style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}}/>
      {imageMethod==='upload'&&<p style={{fontSize:12,color:'#85748e',margin:'0 2px'}}>직접 업로드를 누르면 사진을 선택할 수 있어. JPG · PNG · WEBP, 5MB 이하</p>}
      {imageMethod==='url'&&<form onSubmit={e=>{e.preventDefault();updateImage(t.id,imageDraft)}} style={{display:'grid',gap:7}}>
       <input type="url" value={imageDraft} placeholder="이미지 URL 붙여넣기" aria-label={t.name+' 이미지 URL'} onChange={e=>{setImageDraft(e.target.value);setImageError('')}} style={{width:'100%',minWidth:0,boxSizing:'border-box',fontSize:16,padding:9,borderRadius:9,border:'1px solid #bca6d8'}}/>
       <button type="submit" style={{...btn,fontSize:12}}>URL 저장</button>
      </form>}
      {uploadingImage&&<p role="status" style={{fontSize:12,margin:0}}>사진을 Supabase에 업로드 중...</p>}
      {imageError&&<p role="alert" style={{color:'#b34455',fontSize:12,margin:0}}>{imageError}</p>}
      <button type="button" disabled={uploadingImage} style={{...btn,fontSize:12}} onClick={()=>{setEditingImage('');setImageError('');setImageMethod('')}}>취소</button>
     </div>}
     {open&&<div style={{padding:'4px 12px 12px',fontSize:13,lineHeight:1.6,borderTop:'1px solid #ebe5f0'}}>
      {t.en&&<p style={{margin:'6px 0'}}><strong>영문명</strong> · {t.en}</p>}
      {t.posture&&<p style={{margin:'6px 0'}}><strong>자세</strong> · {t.posture}</p>}
      {t.muscles&&<p style={{margin:'6px 0'}}><strong>근육</strong> · {t.muscles}</p>}
      {t.description&&<p style={{margin:'8px 0'}}>{t.description}</p>}
      {!!t.tags?.length&&<p style={{opacity:.7}}>{t.tags.join(' · ')}</p>}
      {t.notes&&<p>{t.notes}</p>}
      {hasImage&&<a href={imageSrc} target="_blank" rel="noopener noreferrer" style={{fontSize:12}}>이미지 원본 열기</a>}
      <TechniqueReferences technique={t} onUpdate={onUpdate} storageKey={storageKey}/>
     </div>}
    </article>;
      })}
     </div>}
    </section>;
   })}
  </div>
  {!techniques.length&&!yogaMode&&<p style={{fontSize:13,opacity:.7}}>아직 등록된 기술이 없어.</p>}
  {term&&totalMatches===0&&<p style={{fontSize:14,opacity:.7,textAlign:'center',padding:'18px 0'}}>일치하는 기술이 없어. 다른 검색어를 입력해 줘.</p>}
 </section>;
}
function CoreSequenceThumbnail({technique,database,userId}){
 const [signedUrl,setSignedUrl]=useState('');
 const [broken,setBroken]=useState(false);
 const path=technique?.imageRemoved?'':technique?.imagePath||'';
 const direct=technique?.imageRemoved?'':technique?.imageUrl||'';
 useEffect(()=>{
  let active=true;
  setSignedUrl('');setBroken(false);
  if(!path||!database||!userId||!path.startsWith(userId+'/'))return;
  database.storage.from('body-care-technique-images').createSignedUrl(path,3600).then(({data,error})=>{
   if(active&&!error)setSignedUrl(data?.signedUrl||'');
  }).catch(()=>{});
  return ()=>{active=false};
 },[path,database,userId]);
 const src=path?signedUrl:direct;
 return <span aria-hidden="true" style={{width:56,height:56,flexShrink:0,borderRadius:11,overflow:'hidden',background:'#eee7f5',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #e5d9ec'}}>
  {src&&!broken?<img src={src} alt="" loading="lazy" onError={()=>setBroken(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:22,color:'#ae94c7'}}>▧</span>}
 </span>;
}
function CoreTimer({data,onUpdate,database,userId,title='코어',strengthCategories=CORE_CATEGORIES}){
 const techniques=data.coreTechniques||[];
 const routines=data.coreRoutines||[];
 const [routineId,setRoutineId]=useState('');
 const [name,setName]=useState('');
 const [steps,setSteps]=useState([]);
 const [adding,setAdding]=useState(false);
 const [pickerCategory,setPickerCategory]=useState(null);
 const [pickerSearch,setPickerSearch]=useState('');
 const [mediaOpen,setMediaOpen]=useState({video:false});
 const [stepsOpen,setStepsOpen]=useState(false);
 const [editingStep,setEditingStep]=useState(null);
 const [index,setIndex]=useState(0);
 const [remaining,setRemaining]=useState(60);
 const [playing,setPlaying]=useState(false);
 const [done,setDone]=useState(false);
 const [videoSelection,setVideoSelection]=useState(0);
 const [showVideo,setShowVideo]=useState(false);
 const currentStep=steps[index]||null;
 const currentTechnique=techniques.find(t=>t.id===currentStep?.techniqueId)||null;
 const currentName=currentTechnique?.name||'시퀀스를 구성해 줘';
 const nextName=steps[index+1]?nameOf(steps[index+1].techniqueId,techniques):'마지막 동작';
 const references=(currentTechnique?.references||[]).filter(ref=>parseVideoUrl(ref.url));
 const activeReference=references[Math.min(videoSelection,references.length-1)]||null;
 const activeVideo=activeReference?parseVideoUrl(activeReference.url):null;
 const duration=Math.max(1,Number(currentStep?.seconds)||60);
 const progress=Math.min(1,Math.max(0,1-remaining/duration));
 const ringRadius=106,ringLength=2*Math.PI*ringRadius;
 const accordionCard={border:'1px solid #e1d5ec',borderRadius:16,background:'#fff',overflow:'hidden',boxShadow:'0 2px 12px rgba(82,54,107,.035)'};
 const accordionHeader={width:'100%',display:'flex',alignItems:'center',gap:10,padding:'15px 16px',border:0,background:'transparent',color:'#40334b',textAlign:'left',fontSize:15,cursor:'pointer'};
 const softButton={...btn,padding:'7px 11px',fontSize:13,borderRadius:10,background:'#faf7fe'};
 const matchingPicker=techniques.filter(t=>!pickerSearch.trim()||[t.name,t.en,t.posture,t.muscles,...(t.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(pickerSearch.trim().toLocaleLowerCase()));
 useEffect(()=>{
  setVideoSelection(0);setShowVideo(false);
 },[currentStep?.techniqueId]);
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
  <h2>{title} · 타이머</h2>
  <p style={{fontSize:13,opacity:.7}}>기술 라이브러리에서 동작을 선택하고 나만의 시퀀스를 만들어.</p>
  <select aria-label="저장된 시퀀스" value={routineId} onChange={e=>selectRoutine(e.target.value)} style={{width:'100%',padding:12,borderRadius:10,marginBottom:12}}><option value="">저장된 시퀀스 선택</option>{routines.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
  <div className="routine-root routine-face" style={{padding:'22px 10px 20px',borderRadius:18,marginBottom:12,background:'#fff'}}>
   <div style={{width:'min(100%,320px)',aspectRatio:'1',position:'relative',margin:'2px auto 10px'}}>
    <svg viewBox="0 0 260 260" width="100%" height="100%" role="img" aria-label={'남은 시간 '+fmt(remaining)+' · 진행률 '+Math.round(progress*100)+'퍼센트'}>
     <circle cx="130" cy="130" r={ringRadius} fill="none" stroke="#eee6f5" strokeWidth="21"/>
     <circle cx="130" cy="130" r={ringRadius} fill="none" stroke="#a78acb" strokeWidth="21" strokeDasharray={ringLength} strokeDashoffset={ringLength*(1-progress)} transform="rotate(-90 130 130)" strokeLinecap="round" style={{transition:'stroke-dashoffset .2s linear'}}/>
     <circle cx="130" cy="130" r="79" fill="white" stroke="#cfb5e6" strokeWidth="9"/>
    </svg>
    <div style={{position:'absolute',inset:'24%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:5,pointerEvents:'none'}}>
     <strong style={{fontSize:'clamp(12px,3.8vw,17px)',lineHeight:1.3,overflowWrap:'anywhere',maxHeight:50,overflow:'hidden'}}>{currentName}</strong>
     <strong style={{fontSize:'clamp(34px,10vw,51px)',color:'#7751a1',fontVariantNumeric:'tabular-nums',lineHeight:1.12}}>{fmt(remaining)}</strong>
    </div>
   </div>
   <div style={{textAlign:'center',fontSize:13,margin:'0 0 14px',color:'#776483'}}>
    <div>다음 · {nextName}</div>
    <div style={{fontSize:12,marginTop:4}}>총 {steps.length}개 동작 · {fmt(total)} {steps.length?'· '+Math.min(index+1,steps.length)+'/'+steps.length:''}</div>
   </div>
   <div style={{display:'flex',justifyContent:'center',gap:8,alignItems:'center',flexWrap:'wrap'}}>
    <button type="button" aria-label="이전 동작" title="이전" style={btn} disabled={!steps.length||index===0} onClick={()=>{pause();const n=index-1;setIndex(n);setRemaining(steps[n].seconds);setDone(false)}}>❮</button>
    <button type="button" style={{...btn,background:'#9474c0',color:'#fff',minWidth:92,fontWeight:700}} disabled={!steps.length} onClick={playing?pause:start}>{playing?'❚❚ 일시정지':done?'▶ 다시 시작':'▶ 시작'}</button>
    <button type="button" aria-label="다음 동작" title="다음" style={btn} disabled={!steps.length||done} onClick={skip}>❯</button>
    <button type="button" aria-label="처음부터" title="처음" style={btn} disabled={!steps.length} onClick={()=>{pause();setIndex(0);setRemaining(steps[0]?.seconds||60);setDone(false)}}>↻</button>
   </div>
  </div>
  {currentTechnique&&<section aria-label="현재 기술 참고 영상" style={{display:'grid',gap:10,marginBottom:13}}>
   <div style={accordionCard}>
    <button type="button" aria-expanded={mediaOpen.video} onClick={()=>{setMediaOpen(v=>({...v,video:!v.video}));if(mediaOpen.video)setShowVideo(false)}} style={accordionHeader}>
     <span style={{display:'flex',width:36,height:36,borderRadius:11,alignItems:'center',justifyContent:'center',background:'#f1e9f9',color:'#8562a9',fontSize:18}}>▷</span>
     <span style={{flex:1,minWidth:0}}><strong style={{display:'block'}}>참고 영상 <span style={{fontSize:12,color:'#9a83b0'}}>({references.length})</span></strong><small style={{display:'block',fontSize:12,color:'#9785a5',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{references.length?'기술 타임라인에서 바로 재생':'연결된 영상 없음'}</small></span>
     <span aria-hidden="true" style={{color:'#8d70aa',fontSize:19}}>{mediaOpen.video?'⌃':'⌄'}</span>
    </button>
    {mediaOpen.video&&<div style={{padding:'0 13px 14px'}}>
     {references.length>0?<div>
      {references.length>1&&<div role="tablist" aria-label="현재 기술 참고 영상 선택" style={{display:'flex',gap:7,overflowX:'auto',padding:'2px 0 10px'}}>
       {references.map((ref,i)=><button type="button" role="tab" aria-selected={videoSelection===i} key={ref.id||i} style={{...softButton,flexShrink:0,background:videoSelection===i?'#eaddf7':'#fff'}} onClick={()=>{setVideoSelection(i);setShowVideo(false)}}>영상 {i+1}</button>)}
      </div>}
      <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',flexWrap:'wrap',fontSize:12,marginBottom:9,color:'#6c5a7a'}}>
       <span style={{flex:'1 1 120px',overflowWrap:'anywhere'}}>{activeReference?.title||'참고 영상'}</span>
       <strong style={{color:'#8463a6'}}>▶ {timeLabel(activeReference?.start)}</strong>
      </div>
      <div style={{aspectRatio:'16 / 9',width:'100%',background:'#e9dff0',borderRadius:12,overflow:'hidden'}}>
       {showVideo?<iframe key={String(currentStep.techniqueId)+'-'+String(activeReference?.id)} title={currentName+' 참고 영상'} src={'https://www.youtube-nocookie.com/embed/'+activeVideo.id+'?playsinline=1&start='+Math.max(0,Number(activeReference.start)||0)+(activeReference.end!=null?'&end='+Math.max(0,Number(activeReference.end)||0):'')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" style={{display:'block',width:'100%',height:'100%',border:0}}/>:<button type="button" onClick={()=>setShowVideo(true)} style={{width:'100%',height:'100%',border:0,color:'#7955a0',background:'linear-gradient(120deg,#f2e9f9,#ddd1ec)',fontWeight:700,fontSize:16,cursor:'pointer'}}>▶ 해당 구간 재생</button>}
      </div>
      <a target="_blank" rel="noopener noreferrer" href={activeVideo.url+'&t='+Math.max(0,Number(activeReference?.start)||0)+'s'} style={{display:'inline-block',marginTop:10,fontSize:13,color:'#74509e'}}>↗ YouTube에서 열기</a>
     </div>:<p style={{fontSize:13,color:'#84738b',margin:'4px 0'}}>기술 라이브러리에서 참고 영상을 연결할 수 있어.</p>}
    </div>}
   </div>
  </section>}
  <div style={{...accordionCard,marginBottom:12}}>
   <button type="button" aria-expanded={adding} onClick={()=>setAdding(v=>!v)} style={{...accordionHeader,background:adding?'#f8f3fc':'#fff'}}>
    <span style={{display:'flex',width:36,height:36,borderRadius:11,alignItems:'center',justifyContent:'center',background:'#efe6f9',color:'#8260aa',fontSize:21}}>＋</span>
    <span style={{flex:1}}><strong style={{display:'block'}}>기술 라이브러리에서 선택</strong><small style={{fontSize:12,color:'#9686a2'}}>필요한 동작을 시퀀스에 추가</small></span>
    <span style={{color:'#8d70aa',fontSize:19}} aria-hidden="true">{adding?'⌃':'⌄'}</span>
   </button>
   {adding&&<div style={{padding:'0 12px 14px',display:'grid',gap:8}}>
    <input type="search" placeholder="기술명 · 근육 · 자세 검색" aria-label="추가할 코어 기술 검색" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} style={{fontSize:16,padding:'11px 12px',borderRadius:11,border:'1px solid #d9c9e9',width:'100%',boxSizing:'border-box',background:'#fff',color:'#40334b'}}/>
    {orderedCategoryEntries(strengthCategories).map(([cat,i])=>{
     const entries=matchingPicker.filter(t=>t.category===i);
     if(cat==='Legacy Techniques · Review'&&!techniques.some(t=>t.category===i))return null;
     if(pickerSearch.trim()&&!entries.length)return null;
     const open=pickerSearch.trim()?true:pickerCategory===i;
     return <div key={cat} style={{border:'1px solid #e8ddf1',borderRadius:12,overflow:'hidden'}}>
      <button type="button" aria-expanded={open} onClick={()=>setPickerCategory(old=>old===i?null:i)} style={{...accordionHeader,padding:'11px 12px',fontSize:14,background:open?'#faf6fd':'#fff'}}>
       <strong style={{flex:1}}>{cat}</strong><small style={{color:'#957dac'}}>{entries.length}개</small><span aria-hidden="true">{open?'⌃':'⌄'}</span>
      </button>
      {open&&<div style={{padding:'2px 9px 9px',display:'grid',gap:6}}>
       {entries.map(t=><button type="button" key={t.id} onClick={()=>add(t.id)} aria-label={t.name+' 시퀀스에 추가'} style={{...btn,borderColor:'#e5d7ef',padding:'7px 9px',display:'flex',alignItems:'center',gap:10,width:'100%',textAlign:'left',fontSize:14,background:'#fff',minWidth:0}}>
        <CoreSequenceThumbnail technique={t} database={database} userId={userId}/>
        <span style={{flex:1,minWidth:0,overflowWrap:'anywhere',fontWeight:600,color:'#40334b'}}>{t.name}</span>
        <span style={{flexShrink:0,color:'#7954a5',fontWeight:700,fontSize:13,whiteSpace:'nowrap'}}>＋ 추가</span>
       </button>)}
      </div>}
     </div>;
    })}
    {!matchingPicker.length&&<p style={{fontSize:13,color:'#9686a2',textAlign:'center'}}>일치하는 기술이 없어.</p>}
   </div>}
  </div>
  <div style={{...accordionCard,marginBottom:13}}>
   <button type="button" aria-expanded={stepsOpen} onClick={()=>setStepsOpen(v=>!v)} style={accordionHeader}>
    <span style={{display:'flex',width:36,height:36,borderRadius:11,alignItems:'center',justifyContent:'center',background:'#f1e9f9',color:'#8562a9',fontSize:18}}>☷</span>
    <span style={{flex:1}}><strong style={{display:'block'}}>시퀀스 구성 <span style={{color:'#947dab',fontSize:12}}>({steps.length})</span></strong><small style={{fontSize:12,color:'#9785a5'}}>총 {fmt(total)} · 동작별 시간·순서 수정</small></span>
    <span style={{color:'#8d70aa',fontSize:19}} aria-hidden="true">{stepsOpen?'⌃':'⌄'}</span>
   </button>
   {stepsOpen&&<div style={{padding:'0 12px 12px',display:'grid',gap:7}}>
    {!steps.length&&<p style={{fontSize:13,color:'#90829b',textAlign:'center',margin:'12px 0'}}>먼저 기술 라이브러리에서 동작을 추가해 줘.</p>}
    {steps.map((step,i)=><div key={i} style={{border:'1px solid '+(i===index?'#c0a0df':'#e8dff0'),background:i===index?'#f4edfb':'#fff',borderRadius:12,overflow:'hidden'}}>
     <button type="button" aria-expanded={editingStep===i} onClick={()=>{setEditingStep(editingStep===i?null:i);if(!playing){setIndex(i);setRemaining(step.seconds);setDone(false)}}} style={{border:0,background:'transparent',color:'#40334b',padding:'12px',width:'100%',display:'flex',alignItems:'center',textAlign:'left',gap:9,cursor:'pointer'}}>
      <CoreSequenceThumbnail technique={techniques.find(t=>t.id===step.techniqueId)} database={database} userId={userId}/>
      <span style={{color:'#8968ab',fontWeight:700,fontSize:12,minWidth:20}}>{String(i+1).padStart(2,'0')}</span>
      <strong style={{flex:1,fontSize:14,overflowWrap:'anywhere'}}>{nameOf(step.techniqueId,techniques)}</strong>
      <span style={{fontSize:13,color:'#80668f',whiteSpace:'nowrap'}}>{fmt(step.seconds)}</span>
      <span style={{color:'#947dab',fontSize:15}}>{editingStep===i?'⌃':'⌄'}</span>
     </button>
     {editingStep===i&&<div style={{borderTop:'1px solid #e4d4ef',padding:'10px 12px',display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
      <label style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:13,flex:'1 1 125px'}}>시간 <input aria-label={(i+1)+'번 동작 시간(초)' } type="number" min="5" max="3600" value={step.seconds} onChange={e=>edit(i,{seconds:Math.min(3600,Math.max(5,Number(e.target.value)||60))})} style={{width:75,minWidth:0,padding:8,fontSize:16,border:'1px solid #d5c2e8',borderRadius:9}}/> 초</label>
      <button type="button" style={softButton} aria-label="위로 이동" disabled={i===0} onClick={()=>move(i,-1)}>↑</button>
      <button type="button" style={softButton} aria-label="아래로 이동" disabled={i===steps.length-1} onClick={()=>move(i,1)}>↓</button>
      <button type="button" style={{...softButton,color:'#ad6274'}} aria-label="동작 제거" onClick={()=>{remove(i);setEditingStep(null)}}>삭제</button>
     </div>}
    </div>)}
   </div>}
  </div>
  <div style={{display:'flex',gap:8}}>
   <input value={name} aria-label="시퀀스 이름" placeholder="시퀀스 이름" onChange={e=>setName(e.target.value)} style={{flex:1,minWidth:0,padding:10,borderRadius:10}}/>
   <button style={btn} disabled={!name.trim()||!steps.length} onClick={save}>시퀀스 저장</button>
  </div>
 </section>;
}
function CoreRecords({logs=[],title='코어'}){
 const today=day(),current=logs.filter(x=>x.date===today).reduce((n,x)=>n+x.seconds,0);
 const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')});
 return <section style={{padding:16}}>
  <h2>{title} · 기록</h2>
  <div style={panel}><span>오늘의 {title} 운동</span><h2 style={{margin:'8px 0'}}>{fmt(current)}</h2></div>
  <h3>최근 7일</h3>
  {dates.map(date=><div key={date} style={{...panel,display:'flex',justifyContent:'space-between'}}><span>{date}</span><strong>{fmt(logs.filter(x=>x.date===date).reduce((n,x)=>n+x.seconds,0))}</strong></div>)}
  <p style={{fontSize:12,opacity:.7}}>타이머에서 실제 진행한 시간만 기록해.</p>
 </section>;
}
export default function CoreStudio({area='core',tab,data,onUpdate,sync,database,userId}){
 const title=STUDIO_NAMES[area]||'코어';
 const baseCategories=STUDIO_STRENGTH_CATEGORIES[area]||CORE_CATEGORIES;
 const yogaCategories=area==='legs'?LEGS_MASSAGE_CATEGORIES:area==='glutes'?GLUTES_YOGA_CATEGORIES:area==='back'?BACK_YOGA_CATEGORIES:area==='arms'?ARMS_YOGA_CATEGORIES:YOGA_CATEGORIES;
 // Step up is the 13th visible category (index 12) in the user's requested order.
 // Legacy review stays hidden unless there are saved legacy techniques (index 13).
 const strengthCategories=baseCategories;
 const scoped=area==='core'?data:{
  ...data,
  coreTechniques:data.studios?.[area]?.techniques||[],
  coreYogaTechniques:data.studios?.[area]?.yogaTechniques||[],
  coreMassageTechniques:data.studios?.[area]?.massageTechniques||[],
  coreRoutines:data.studios?.[area]?.routines||[],
  coreLogs:data.studios?.[area]?.logs||[]
 };
 const scopedUpdate=area==='core'?onUpdate:fn=>onUpdate(d=>{
  const current=d.studios?.[area]||{};
  const virtual={
   coreTechniques:current.techniques||[],
   coreYogaTechniques:current.yogaTechniques||[],
   coreMassageTechniques:current.massageTechniques||[],
   coreRoutines:current.routines||[],
   coreLogs:current.logs||[]
  };
  fn(virtual);
  d.studios={...(d.studios||{}),[area]:{
   ...current,
   techniques:virtual.coreTechniques,
   yogaTechniques:virtual.coreYogaTechniques,
   massageTechniques:virtual.coreMassageTechniques,
   routines:virtual.coreRoutines,
   logs:virtual.coreLogs
  }};
 });
 if(tab==='inbox')return <section aria-label={title+' 영상 인박스'}>
  <div style={{padding:'14px 16px 4px'}}><h2 style={{margin:'0 0 4px',fontSize:20}}>{title} · 영상 인박스</h2><p style={{margin:'0 0 10px',fontSize:13,opacity:.7}}>영상 링크를 모으고 기술은 라이브러리에서 정리해.</p></div>
  <CareLibrary data={data} onUpdate={onUpdate} area={area} group="massage" sync={sync} database={database} userId={userId}/>
 </section>;
 if(tab==='timer'){
  const timerData=area==='back'?{
   ...scoped,coreTechniques:[...(scoped.coreTechniques||[]),...(scoped.coreMassageTechniques||[]).map(t=>({...t,category:t.category+strengthCategories.length}))]
  }:area==='legs'?{
   ...scoped,coreTechniques:[...(scoped.coreTechniques||[]),...(scoped.coreYogaTechniques||[]).map(t=>({...t,category:t.category+LEGS_STRETCH_CATEGORIES.length}))]
  }:scoped;
  return <CoreTimer data={timerData} onUpdate={scopedUpdate} title={title} strengthCategories={area==='back'?[...strengthCategories,...BACK_MASSAGE_CATEGORIES]:area==='legs'?[...LEGS_STRETCH_CATEGORIES,...LEGS_MASSAGE_CATEGORIES]:strengthCategories} database={database} userId={userId}/>;
 }
 if(tab==='records')return <CoreRecords logs={scoped.coreLogs||[]} title={title}/>;
 return <CoreTechniques data={scoped} onUpdate={scopedUpdate} title={title} strengthCategories={strengthCategories} yogaCategories={yogaCategories} massageCategories={area==='back'?BACK_MASSAGE_CATEGORIES:[]} modeLabels={area==='legs'?['스트레치','마사지']:area==='back'?['맨몸근력','요가','마사지']:['맨몸근력','요가']} database={database} userId={userId}/>;
}
