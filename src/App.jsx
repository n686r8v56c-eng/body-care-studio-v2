import React,{useEffect,useMemo,useRef,useState} from 'react';
import {MAX_VIDEOS_PER_ITEM as MAX,normalizeVideoIds} from './videoLimits.js';
import CareLibrary,{seedBodyCatalog,LEG_STRETCH_SEED} from './CareLibrary.jsx';
import CoreStudio from './CoreStudio.jsx';
import {seedCoreCatalog} from './coreCatalog.js';
import RoutineTimer from './RoutineTimer.jsx';
import PracticeRecords from './PracticeRecords.jsx';
import {createClient} from '@supabase/supabase-js';
import {ChevronDown,Plus,Pencil,Trash2,ArrowUp,ArrowDown,Link2,Copy,ExternalLink,Download,Upload,RotateCcw,LogOut,Check,X,Settings2} from 'lucide-react';
const sameSnapshot=(a,b)=>{const order=x=>Array.isArray(x)?x.map(order):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,order(x[k])])):x;return JSON.stringify(order(a))===JSON.stringify(order(b))};
const areas=[{id:'core',name:'코어'},{id:'glutes',name:'엉덩이'},{id:'hips',name:'고관절'},{id:'thighs',name:'허벅지'},{id:'legs',name:'다리'},{id:'face',name:'Face Care'},{id:'back',name:'등'},{id:'arms',name:'팔'}];
// Previous lower/upper records remain valid in backups and the saved payload, but no longer appear as genres.
const savedAreaIds=new Set([...areas.map(a=>a.id),'lower','upper']);
const studioAreas=['core','glutes','hips','thighs','legs','back','arms'];
const regionalStudioAreas=['glutes','hips','thighs','legs','back','arms'];
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
const initial=()=>({version:1,corePreparationMigrated:false,studios:{},items:[],levelNames:{},groupNames:{},routines:[],practiceLogs:[],bodyPracticeLogs:[],coreTechniques:[],coreYogaTechniques:[],coreRoutines:[],coreLogs:[]});
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
const normalize=obj=>({version:1,corePreparationMigrated:!!obj?.corePreparationMigrated,studios:obj?.__skipStudios?{}:Object.fromEntries(regionalStudioAreas.map(area=>[area,normalizeRegionalStudio(obj?.studios?.[area],area,obj?.items)])),coreTechniques:Array.isArray(obj?.coreTechniques)?obj.coreTechniques.filter(x=>x&&x.id&&x.name&&Number(x.category)>=0&&Number(x.category)<(Number(obj?.__regionalStrengthLimit)||9)).map(x=>({id:String(x.id),name:String(x.name).slice(0,120),category:Number(x.category),imageUrl:String(x.imageUrl||'').slice(0,2000),imagePath:typeof x.imagePath==='string'&&/^[0-9a-f-]{36}\/(?:strength|yoga)\/[0-9a-z.-]+\.(?:jpg|png|webp)$/i.test(x.imagePath)?x.imagePath:'',imageRemoved:!!x.imageRemoved,notes:String(x.notes||'').slice(0,2000),en:String(x.en||'').slice(0,120),posture:String(x.posture||'').slice(0,200),muscles:String(x.muscles||'').slice(0,400),description:String(x.description||'').slice(0,1500),time:String(x.time||'').slice(0,12),tags:Array.isArray(x.tags)?x.tags.filter(v=>typeof v==='string').slice(0,12):[],removedReferenceIds:Array.isArray(x.removedReferenceIds)?x.removedReferenceIds.filter(v=>typeof v==='string').slice(0,100):[],references:Array.isArray(x.references)?x.references.filter(v=>v&&typeof v.url==='string'&&/^https:\/\/([a-z0-9-]+\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(v.url)).slice(0,100).map(v=>({id:String(v.id||''),url:String(v.url).slice(0,1000),title:String(v.title||'').slice(0,150),start:Math.max(0,Math.floor(Number(v.start)||0)),end:v.end===null||v.end===undefined?null:Math.max(0,Math.floor(Number(v.end)||0)),memo:String(v.memo||'').slice(0,500)})):[]})):[],coreYogaTechniques:Array.isArray(obj?.coreYogaTechniques)?obj.coreYogaTechniques.filter(x=>x&&x.id&&x.name&&Number(x.category)>=0&&Number(x.category)<(Number(obj?.__regionalYogaLimit)||4)).map(x=>({id:String(x.id),name:String(x.name).slice(0,120),category:Number(x.category),imageUrl:String(x.imageUrl||'').slice(0,2000),imagePath:typeof x.imagePath==='string'&&/^[0-9a-f-]{36}\/(?:strength|yoga)\/[0-9a-z.-]+\.(?:jpg|png|webp)$/i.test(x.imagePath)?x.imagePath:'',imageRemoved:!!x.imageRemoved,notes:String(x.notes||'').slice(0,2000),en:String(x.en||'').slice(0,120),posture:String(x.posture||'').slice(0,200),muscles:String(x.muscles||'').slice(0,400),description:String(x.description||'').slice(0,1500),time:String(x.time||'').slice(0,12),tags:Array.isArray(x.tags)?x.tags.filter(v=>typeof v==='string').slice(0,12):[],removedReferenceIds:Array.isArray(x.removedReferenceIds)?x.removedReferenceIds.filter(v=>typeof v==='string').slice(0,100):[],references:Array.isArray(x.references)?x.references.filter(v=>v&&typeof v.url==='string'&&/^https:\/\/([a-z0-9-]+\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(v.url)).slice(0,100).map(v=>({id:String(v.id||''),url:String(v.url).slice(0,1000),title:String(v.title||'').slice(0,150),start:Math.max(0,Math.floor(Number(v.start)||0)),end:v.end===null||v.end===undefined?null:Math.max(0,Math.floor(Number(v.end)||0)),memo:String(v.memo||'').slice(0,500)})):[]})):[],coreRoutines:Array.isArray(obj?.coreRoutines)?obj.coreRoutines.filter(x=>x&&x.id&&x.name&&Array.isArray(x.steps)).map(x=>({id:String(x.id),name:String(x.name).slice(0,120),steps:x.steps.filter(step=>step&&step.techniqueId).map(step=>({techniqueId:String(step.techniqueId),seconds:Math.min(3600,Math.max(5,Number(step.seconds)||60))}))})):[],coreLogs:Array.isArray(obj?.coreLogs)?obj.coreLogs.filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(Number(x.seconds))).map(x=>({id:String(x.id||''),date:String(x.date),seconds:Math.max(0,Number(x.seconds))})):[],bodyPracticeLogs:Array.isArray(obj?.bodyPracticeLogs)?obj.bodyPracticeLogs.filter(x=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x?.date||'')&&['lower','upper','legs'].includes(x?.area)).map(x=>({date:x.date,area:x.area,circulation:Math.max(0,Number(x.circulation)||0),strength:Math.max(0,Number(x.strength)||0),gym:Math.max(0,Number(x.gym)||0)})):[],practiceLogs:Array.isArray(obj?.practiceLogs)?obj.practiceLogs.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x?.date||'')).map(x=>({date:x.date,face:Math.max(0,Number(x.face)||0),voice:Math.max(0,Number(x.voice)||0)})):[],routines:Array.isArray(obj?.routines)?obj.routines.filter(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&Array.isArray(r.steps)).map(r=>({id:r.id,name:r.name.slice(0,100),area:savedAreaIds.has(r.area)?r.area:'face',group:groups.some(g=>g.id===r.group)?r.group:'massage',steps:r.steps.filter(s=>s&&typeof s.videoId==='string'&&/^[\w-]{11}$/.test(s.videoId)).map(s=>({itemId:String(s.itemId||''),videoId:s.videoId,title:String(s.title||'').slice(0,120),seconds:Math.min(3600,Math.max(5,Number(s.seconds)||60))}))})):[],beautyCatalogSeedVersion:Number(obj?.beautyCatalogSeedVersion)||0,legStretchSeedVersion:Number(obj?.legStretchSeedVersion)||0,groupNames:safeGroupNames(obj?.groupNames),levelNames:obj?.levelNames&&typeof obj.levelNames==='object'&&!Array.isArray(obj.levelNames)?Object.fromEntries(Object.entries(obj.levelNames).filter(([k])=>[...savedAreaIds].some(a=>groups.some(g=>k===levelKey(a,g.id)))).map(([k,v])=>[k,safeLevels(v)])):{},items:Array.isArray(obj?.items)?obj.items.filter(x=>x&&typeof x==='object'&&x.id).map((x,i)=>({
 id:String(x.id),area:savedAreaIds.has(x.area)?x.area:'upper',
 group:groups.some(g=>g.id===x.group)?x.group:'massage',level:Number.isInteger(Number(x.level))&&Number(x.level)>=1&&Number(x.level)<=5?Number(x.level):1,
 title:String(x.title||x.en||x.ko||'').slice(0,120),en:String(x.en||x.title||'').slice(0,120),ko:String(x.ko||'').slice(0,120),note:String(x.note||'').slice(0,2000),
 videos:videoList(x.videos),instagramLinks:[...new Set((Array.isArray(x.instagramLinks)?x.instagramLinks:[]).filter(v=>typeof v==='string').map(v=>{try{const u=new URL(v);const parts=u.pathname.split('/').filter(Boolean);if(!['instagram.com','www.instagram.com','m.instagram.com'].includes(u.hostname.toLowerCase())||!['p','reel','reels','tv'].includes(parts[0])||!/^[-\w]+$/.test(parts[1]||''))return '';return 'https://www.instagram.com/'+(parts[0]==='reels'?'reel':parts[0])+'/'+parts[1]+'/'}catch{return ''}}).filter(Boolean))].slice(0,5),instagramThumbnails:x.instagramThumbnails&&typeof x.instagramThumbnails==='object'&&!Array.isArray(x.instagramThumbnails)?Object.fromEntries(Object.entries(x.instagramThumbnails).filter(([url,path])=>typeof url==='string'&&/^https:\/\/www\.instagram\.com\/(?:reel|p|tv)\/[-\w]+\/$/.test(url)&&typeof path==='string'&&/^[0-9a-f-]{36}\/instagram\/[0-9a-z.-]+\.(?:jpg|png|webp)$/i.test(path))):{},sort:Number.isFinite(Number(x.sort))?Number(x.sort):i,archived:!!x.archived
})):[]});
// New independent studios reuse the Core catalog/routine schema without touching Core's saved data.
const HIP_MOBILITY_SEED=[
 {id:'hip-side-kneeling-hip-pulses',name:'Side-Kneeling Hip Pulses',en:'Side-Kneeling Hip Pulses',category:6,
  posture:'한쪽 무릎을 바닥에 대고 반대쪽 발을 몸 옆에 놓는 측면 반무릎 자세',
  muscles:'고관절 내전근군, 둔근 및 골반 안정화 근육',
  description:'측면 반무릎 자세에서 골반을 천천히 낮췄다가 세우는 작은 반복 움직임. 영상에서는 20회 펄스 후 1분간 정적 유지한다.',
  tags:['Side Kneeling','Hip Mobility','Adductors','Hip Abduction','Dynamic Mobility','Pulses'],
  notes:'사용자가 제공한 Middle Splits 운동 사진 기준. 영상 참조 링크는 미등록.',
  imageUrl:'',imagePath:'',imageRemoved:false,references:[],removedReferenceIds:[]}
];
// Curated inner-thigh exercises. Images are linked to their original publishers rather than copied.
// Position is recorded as a filterable tag; source image fields are intentionally blank for user-uploaded photos.
const THIGH_ADDUCTOR_ADDITIONS=[
 {id:'thigh-inner-sumo-squat',name:'Sumo Squat',en:'Sumo Squat',category:0,
  posture:'넓게 벌려 선 자세 · 발끝은 바깥쪽',muscles:'내전근군·대퇴사두근·대둔근',
  description:'양발을 어깨너비보다 넓게 벌리고 발끝을 바깥쪽으로 향하게 한 뒤 무릎과 고관절을 함께 굽혀 앉았다 일어난다. 안벅지뿐 아니라 앞벅지와 엉덩이도 함께 쓰는 복합 동작이다.',
  tags:['Standing','Inner Thigh','Adductors','Compound'],imageUrl:''},
 {id:'thigh-inner-v-leg-pulse-in-out',name:'V Leg Pulse In & Out',en:'V Leg Pulse In & Out',category:0,
  posture:'바로 누워 두 다리를 들어 V자로 벌린 자세',muscles:'내전근군·복부 안정화 근육',
  description:'바로 누워 두 다리를 들어 V자로 벌렸다가 작게 안쪽으로 모으는 펄스 동작을 반복한다. 허리와 골반을 편안하게 유지하고 동작 범위를 조절한다.',
  tags:['Supine','Inner Thigh','Adductors','Pulse'],imageUrl:''},
 {id:'thigh-inner-frog-pulse-stretch',name:'Frog Pulse Stretch',en:'Frog Pulse Stretch',category:0,
  posture:'바로 누워 발바닥을 맞대고 무릎을 양옆으로 벌린 자세',muscles:'고관절 내전근군',
  description:'바로 누운 나비자세에서 무릎을 양옆으로 편안하게 벌리고 작은 범위로 부드럽게 펄스한다. 근력 운동보다는 내전근 스트레칭과 고관절 가동성에 초점을 둔다.',
  tags:['Supine','Inner Thigh','Adductors','Stretch','Pulse'],imageUrl:''}
].map(t=>({...t,notes:'사진은 사용자가 직접 등록 예정',imagePath:'',imageRemoved:false,references:[],removedReferenceIds:[]}));
const THIGH_ADDUCTOR_SEED=[
 {id:'thigh-inner-seated-hip-adduction',name:'Seated Hip Adduction',en:'Seated Hip Adduction',category:0,
  posture:'앉은 자세 · 어덕션 머신',muscles:'내전근군',
  description:'어덕션 머신에 앉아 양 허벅지를 안쪽으로 모았다가 천천히 벌린다. 골반과 상체를 고정하고 반동을 사용하지 않는다.',
  tags:['Inner Thigh','Adductors','Machine'],
  imageUrl:'https://d2rf5xu5rxzcu4.cloudfront.net/video_thumbnails/dfebf7af-f9a5-4595-9262-a281133f77ae.jpg',
  notes:'이미지 출처: Gravitus · https://gravitus.com/guides/exercises/seated-hip-adduction/'},
 {id:'thigh-inner-side-lying-adduction',name:'Side-Lying Hip Adduction',en:'Side-Lying Hip Adduction',category:0,
  posture:'옆으로 누운 자세 · 아래쪽 다리 들기',muscles:'내전근군',
  description:'옆으로 누워 위쪽 다리를 앞쪽 바닥에 놓고 아래쪽 다리를 천천히 들어 올린다. 골반이 뒤로 넘어가지 않도록 유지한다.',
  tags:['Inner Thigh','Adductors','Bodyweight','Side-Lying'],
  imageUrl:'https://i0.wp.com/e3rehab.com/wp-content/uploads/2024/05/Side-Lying-Adduction-scaled.jpg?fit=2560%2C1440&ssl=1',
  notes:'이미지 출처: E3 Rehab · https://e3rehab.com/how-to-perform-copenhagen-planks/'},
 {id:'thigh-inner-copenhagen-adduction',name:'Copenhagen Adduction',en:'Copenhagen Adduction',category:0,
  posture:'사이드 플랭크 · 벤치 위쪽 다리 지지',muscles:'내전근군·복사근(안정화)',
  description:'옆으로 누워 위쪽 무릎을 벤치에 올리고 아래쪽 팔꿈치로 몸을 지지한다. 몸통을 곧게 유지하며 아래쪽 다리를 들어 올리는 쇼트 레버 동작부터 시작한다.',
  tags:['Inner Thigh','Adductors','Copenhagen','Bench','Short Lever'],
  imageUrl:'https://i0.wp.com/e3rehab.com/wp-content/uploads/2024/05/Short-Copenhagen-Plank-scaled.jpg?fit=2560%2C1440&ssl=1',
  notes:'이미지 출처: E3 Rehab · https://e3rehab.com/how-to-perform-copenhagen-planks/'},
 {id:'thigh-inner-standing-cable-adduction',name:'Standing Cable Hip Adduction',en:'Standing Cable Hip Adduction',category:0,
  posture:'서서 한 발 지지 · 로우 케이블',muscles:'내전근군',
  description:'낮은 케이블을 발목에 연결하고 지지대 옆에 선다. 운동 다리를 몸의 정중선 쪽으로 천천히 끌어와 반대쪽 다리 앞을 지나가게 한다.',
  tags:['Inner Thigh','Adductors','Cable','Standing'],
  imageUrl:'https://cdn.motra.com/exercise-assets/91b2dcfa08/thumbnailOriginal.jpg',
  notes:'이미지 출처: Motra · https://motra.com/exercises/cableHipAdduction'},
 {id:'thigh-inner-supine-ball-squeeze',name:'Supine Ball Squeeze',en:'Supine Ball Squeeze',category:0,
  posture:'바로 누운 자세 · 무릎 사이 소프트볼',muscles:'내전근군',
  description:'바로 누워 무릎을 굽히고 공이나 쿠션을 무릎 사이에 둔다. 허리에 힘을 과하게 주지 않고 허벅지 안쪽으로 부드럽게 조여 등척성 수축을 유지한다.',
  tags:['Inner Thigh','Adductors','Isometric','Ball','Supine'],
  imageUrl:'https://www.marattmd.com/learn/images/rehab/HipAdduction2Export.jpg',
  notes:'이미지 출처: Joseph Maratt, MD · https://www.marattmd.com/learn/rehab-tha-adductor-squeeze.php'}
].map(t=>({...t,imagePath:'',imageRemoved:false,references:[],removedReferenceIds:[]}));
// Back exercise starter cards, curated from the five movements requested by the user.
// External images and their publisher pages remain editable on each technique card.
const BACK_EXERCISE_SEED=[
 {id:'back-lat-pulldown',name:'Lat Pulldown',en:'Lat Pulldown',category:0,
  posture:'머신에 앉은 자세 · 위쪽 바를 잡기',muscles:'광배근·대원근·상완이두근',
  description:'등을 길게 세운 채 팔꿈치를 아래로 당겨 바를 윗가슴 방향으로 내리고 천천히 되돌린다. 반동 없이 조절한다.',
  tags:['Vertical Pull','Machine','Seated'],
  imageUrl:'https://www.gym-studio.com/_astro/tirage-vertical-prise-serree-vs-prise-large-lequel-choisir.CpaLVt2l.webp',
  notes:'사진 출처: Gym Studio · https://www.gym-studio.com/blog/tirage-vertical-prise-serree-vs-prise-large-lequel-choisir'},
 {id:'back-seated-row',name:'Seated Row',en:'Seated Row',category:1,
  posture:'앉은 자세 · 케이블 핸들 잡기',muscles:'능형근·중부 승모근·광배근',
  description:'등을 중립으로 유지하며 손잡이를 배 쪽으로 당긴다. 견갑골을 자연스럽게 뒤로 움직인 뒤 천천히 팔을 뻗는다.',
  tags:['Horizontal Pull','Cable','Seated'],
  imageUrl:'https://www.moreleisure.com/media/p53mhyf4/wyndley-40.jpg',
  notes:'사진 출처: Wyndley Leisure Centre · https://www.moreleisure.com/wyndley-leisure-centre/facilities/gym/'},
 {id:'back-y-t-w-raise',name:'Y-T-W Raise',en:'Y-T-W Raise',category:1,
  posture:'엎드린 자세 · 팔 Y/T/W 위치',muscles:'중부·하부 승모근·능형근·회전근개',
  description:'엎드린 상태로 팔을 Y, T, W 모양으로 순서대로 들며 견갑골을 조절한다. 목과 허리를 과하게 젖히지 않는다.',
  tags:['Scapular Control','Prone','Bodyweight'],
  imageUrl:'https://backedapp.com/blog/content/images/2026/06/hf_20260611_080009_0565e187-26fd-4907-869e-0a7276ddc59.jpeg',
  notes:'사진 출처: Backed · https://backedapp.com/blog/best-exercises-pain-between-shoulder-blades/'},
 {id:'back-back-extension',name:'Back Extension',en:'Back Extension',category:3,
  posture:'45도 백 익스텐션 벤치 · 골반 지지',muscles:'척추기립근·둔근·햄스트링',
  description:'벤치에 골반을 지지하고 몸통을 제어하며 펴는 동작. 고관절 힌지 방식으로 수행할 수도 있으므로 척추를 과하게 젖히지 않는다.',
  tags:['Spinal Extension','Hip Hinge','Bench'],
  imageUrl:'https://fitnessexpressgym.com/cdn/shop/products/GHYP345-Exercise1-Cut.jpg?v=1679699852',
  notes:'사진 출처: Fitness Express · https://fitnessexpressgym.com/products/body-solid-2x3-45-degree-back-hyper-extension'},
 {id:'back-bird-dog-hold',name:'Bird Dog Hold',en:'Bird Dog Hold',category:3,
  posture:'네발기기 · 반대쪽 팔·다리 뻗어 유지',muscles:'척추기립근·복횡근·둔근',
  description:'네발기기에서 반대쪽 팔과 다리를 뻗어 몸통을 흔들림 없이 유지한다. 척추를 뒤로 젖히는 운동이 아니라 중립 상태를 지키는 안정화 운동이다.',
  tags:['Spinal Stability','Isometric','Quadruped'],
  imageUrl:'https://getfitcraft.com/images/exercises/bird-dogs-proper-form.webp',
  notes:'사진 출처: FitCraft · https://getfitcraft.com/exercises/bird-dogs'}
].map(t=>({...t,imagePath:'',imageRemoved:false,references:[],removedReferenceIds:[]}));
// Thoracic mobility starter cards with publisher-hosted exercise photos.
const THORACIC_MOBILITY_SEED=[
 {id:'back-thoracic-open-book',name:'Open Book',en:'Open Book',category:4,
  posture:'옆으로 누워 무릎을 굽힌 자세',muscles:'흉추 회전 · 흉곽 주변 조직',
  description:'옆으로 누워 무릎과 골반을 안정적으로 유지하고 위쪽 팔을 반대편으로 열며 가슴을 회전한다. 시선은 움직이는 손을 따라간다.',
  tags:['Thoracic Rotation','Side-Lying','Mobility'],
  imageUrl:'https://www.elitesportsandpt.com/wp-content/uploads/2025/12/Open-book-1-225x300.jpg',
  notes:'사진 출처: Elite Sports Performance & Physical Therapy · https://www.elitesportsandpt.com/blog/mobility-exercises-for-your-thoracic-spine/'},
 {id:'back-thoracic-thread-needle',name:'Thread the Needle',en:'Thread the Needle',category:4,
  posture:'네발기기 · 한쪽 팔을 반대편 아래로 통과',muscles:'흉추 회전 · 견갑 주변 조직',
  description:'네발기기에서 한쪽 팔을 반대쪽 겨드랑이 아래로 보내 몸통을 회전하고, 어깨를 낮추어 부드럽게 움직인다. 허리에서 과하게 비틀지 않는다.',
  tags:['Thoracic Rotation','Quadruped','Mobility'],
  imageUrl:'https://www.elitesportsandpt.com/wp-content/uploads/2025/12/Threading-the-needle-c-FR-225x300.jpg',
  notes:'사진 출처: Elite Sports Performance & Physical Therapy · https://www.elitesportsandpt.com/blog/mobility-exercises-for-your-thoracic-spine/'},
 {id:'back-thoracic-foam-roller-extension',name:'Foam Roller Thoracic Extension',en:'Foam Roller Thoracic Extension',category:4,
  posture:'바로 누워 흉추 아래 폼롤러 놓기',muscles:'흉추 신전 · 흉곽 가동성',
  description:'폼롤러를 견갑골 아래쪽의 등 상부에 가로로 놓고 손으로 머리를 받친 후 가슴을 부드럽게 연다. 허리를 과하게 꺾거나 목을 젖히지 않는다.',
  tags:['Thoracic Extension','Supine','Foam Roller','Mobility'],
  imageUrl:'https://www.elitesportsandpt.com/wp-content/uploads/2025/12/T-spine-extension-on-FR-225x300.jpg',
  notes:'사진 출처: Elite Sports Performance & Physical Therapy · https://www.elitesportsandpt.com/blog/mobility-exercises-for-your-thoracic-spine/'}
].map(t=>({...t,imagePath:'',imageRemoved:false,references:[],removedReferenceIds:[]}));
const ARM_EXERCISE_SEED=[
 {
  "id": "arms-starter-1",
  "name": "Dumbbell Curl",
  "en": "Dumbbell Curl",
  "category": 0,
  "posture": "Standing · 양손 덤벨",
  "muscles": "상완이두근·상완근",
  "description": "양손에 덤벨을 들고 팔꿈치를 몸통 옆에 둔 채 손바닥을 위로 향하게 컬한다. 상체 반동 없이 천천히 내린다.",
  "tags": [
   "Standing",
   "Dumbbell",
   "Elbow Flexion",
   "Underhand"
  ],
  "imageUrl": "https://mxp-media.ilnmedia.com/media/content/2017/Nov/bicep-curl-variations-to-kickstart-muscle-growth1-1511336774.jpg",
  "notes": "사진 출처: https://www.mensxp.com/health/body-building/40846-3-biceps-curl-variations-to-get-skin-tearing-pumps-and-kickstart-muscle-growth.html",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-2",
  "name": "Hammer Curl",
  "en": "Hammer Curl",
  "category": 0,
  "posture": "Standing · 뉴트럴 그립 덤벨",
  "muscles": "상완근·상완요골근·상완이두근",
  "description": "엄지가 위로 향하도록 덤벨을 마주 잡고 팔꿈치를 굽힌다. 위팔이 앞뒤로 흔들리지 않게 유지한다.",
  "tags": [
   "Standing",
   "Dumbbell",
   "Neutral Grip",
   "Elbow Flexion"
  ],
  "imageUrl": "https://weriselatam.com/wp-content/uploads/2020/09/Curl-martillo-1160x820.jpg",
  "notes": "사진 출처: https://weriselatam.com/we-workout/como-hacer-crecer-los-biceps/",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-3",
  "name": "Concentration Curl",
  "en": "Concentration Curl",
  "category": 0,
  "posture": "Seated · 팔꿈치를 허벅지 안쪽에 지지",
  "muscles": "상완이두근·상완근",
  "description": "벤치에 앉아 팔꿈치를 허벅지 안쪽에 고정하고 한 팔씩 덤벨을 어깨 방향으로 들어 올린다.",
  "tags": [
   "Seated",
   "Dumbbell",
   "Single-Arm",
   "Underhand"
  ],
  "imageUrl": "https://builderbody.ru/wp-content/uploads/2011/01/6-37.jpg",
  "notes": "사진 출처: https://builderbody.ru/koncentrirovannyj-podem-na-biceps/",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-4",
  "name": "Incline Dumbbell Curl",
  "en": "Incline Dumbbell Curl",
  "category": 0,
  "posture": "Incline Seated · 경사 벤치에 등 지지",
  "muscles": "상완이두근·상완근",
  "description": "인클라인 벤치에 기대 팔을 몸통 옆 아래로 자연스럽게 내린 뒤 팔꿈치를 고정하고 덤벨을 컬한다.",
  "tags": [
   "Incline Seated",
   "Dumbbell",
   "Bench",
   "Elbow Flexion"
  ],
  "imageUrl": "https://i0.wp.com/www.muscleandfitness.com/wp-content/uploads/2018/02/square-exercise-biceps-curl-incline.jpg?crop=1&h=630&quality=86&strip=all&w=800",
  "notes": "사진 출처: https://www.muscleandfitness.com/exercise/workouts/arm-exercises/60-degree-incline-dumbbell-curl/",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-5",
  "name": "Triceps Pushdown",
  "en": "Triceps Pushdown",
  "category": 1,
  "posture": "Standing · 상부 케이블 로프",
  "muscles": "상완삼두근",
  "description": "케이블 로프를 잡고 팔꿈치를 몸통 옆에 붙인 상태에서 팔꿈치를 아래로 편다. 어깨와 몸통 반동을 줄인다.",
  "tags": [
   "Standing",
   "Cable",
   "Rope",
   "Elbow Extension"
  ],
  "imageUrl": "https://www.bodybuilding.gr/forum/attachment.php?attachmentid=127544&d=1553595376",
  "notes": "사진 출처: https://musclewiki.com/exercise/cable-rope-pushdown?model=f",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-6",
  "name": "Overhead Triceps Extension",
  "en": "Overhead Triceps Extension",
  "category": 1,
  "posture": "Seated · 머리 위 덤벨",
  "muscles": "상완삼두근 특히 장두",
  "description": "의자에 앉아 덤벨을 머리 위로 들고 팔꿈치를 굽혀 머리 뒤로 내렸다가 편다. 상완을 가능한 한 안정적으로 둔다.",
  "tags": [
   "Seated",
   "Dumbbell",
   "Overhead",
   "Elbow Extension"
  ],
  "imageUrl": "https://fitnessg88.com/wp-content/uploads/2020/06/Dumbbell-Seated-Overhead-Triceps-Extension.jpg",
  "notes": "사진 출처: https://fitnessg88.com/muscles/triceps/",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-7",
  "name": "Skull Crusher",
  "en": "Skull Crusher",
  "category": 1,
  "posture": "Supine · 벤치에 누워 덤벨",
  "muscles": "상완삼두근",
  "description": "벤치에 누워 덤벨을 가슴 위로 들어 올리고 팔꿈치를 굽혀 머리 양옆으로 내렸다가 다시 편다. 가벼운 무게로 시작한다.",
  "tags": [
   "Supine",
   "Dumbbell",
   "Bench",
   "Elbow Extension"
  ],
  "imageUrl": "https://cdn.motra.com/exercise-assets/dd514ce030/thumbnailOriginal.jpg",
  "notes": "사진 출처: https://motra.com/exercises/dumbbellInclineSkullCrusher",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-8",
  "name": "Triceps Kickback",
  "en": "Triceps Kickback",
  "category": 1,
  "posture": "Bent-Over · 몸통을 기울여 덤벨",
  "muscles": "상완삼두근",
  "description": "골반을 접어 몸통을 숙인 뒤 위팔을 옆구리 옆에 두고 팔꿈치를 뒤쪽으로 편다. 허리를 과하게 젖히지 않는다.",
  "tags": [
   "Bent-Over",
   "Dumbbell",
   "Elbow Extension"
  ],
  "imageUrl": "https://media3.popsugar-assets.com/files/2015/03/10/677/n/1922729/4dad4839_Triceps-Extensions-Red/i/Triceps-Kickback.jpg",
  "notes": "사진 출처: https://musclewiki.com/exercise/dumbbell-tricep-kickback",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-9",
  "name": "Wrist Curl",
  "en": "Wrist Curl",
  "category": 2,
  "posture": "Seated · 팔뚝을 허벅지에 지지",
  "muscles": "전완 굴근군",
  "description": "손바닥을 위로 하여 팔뚝을 허벅지에 놓고 손목만 굽혀 덤벨을 들어 올린다.",
  "tags": [
   "Seated",
   "Dumbbell",
   "Wrist Flexion"
  ],
  "imageUrl": "https://www.mensfitness.com/.image/t_share/MTk2MTM3MzgzMjYwNzI2NDE3/dumbbell-wrist-curl.jpg",
  "notes": "사진 출처: https://www.mensfitness.com/training/five-essential-exercises-bigger-arms",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-10",
  "name": "Reverse Wrist Curl",
  "en": "Reverse Wrist Curl",
  "category": 2,
  "posture": "Seated · 손등을 위로 팔뚝 지지",
  "muscles": "전완 신근군",
  "description": "손바닥을 아래로 한 채 팔뚝을 지지하고 손목만 위로 편다. 처음에는 가벼운 덤벨을 사용한다.",
  "tags": [
   "Seated",
   "Dumbbell",
   "Wrist Extension",
   "Overhand"
  ],
  "imageUrl": "https://static.strengthlevel.com/images/illustrations/dumbbell-reverse-wrist-curl-1000x1000.jpg",
  "notes": "사진 출처: https://strengthlevel.com/strength-standards/dumbbell-reverse-wrist-curl/kg",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-11",
  "name": "Pronation / Supination",
  "en": "Pronation / Supination",
  "category": 2,
  "posture": "Seated · 팔꿈치를 굽히고 팔뚝 지지",
  "muscles": "원회내근·회외근 등 전완 회전근",
  "description": "팔꿈치를 고정하고 가벼운 덤벨 또는 긴 손잡이를 쥔 채 손바닥을 천천히 아래·위로 돌린다. 손목 대신 전완 회전에 집중한다.",
  "tags": [
   "Seated",
   "Dumbbell",
   "Pronation",
   "Supination"
  ],
  "imageUrl": "https://i0.wp.com/e3rehab.com/wp-content/uploads/2023/09/Summary-Supination-and-Pronation-Strength-scaled.jpg?fit=2560%2C1440&ssl=1",
  "notes": "사진 출처: https://e3rehab.com/tennis-elbow-rehab/",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 },
 {
  "id": "arms-starter-12",
  "name": "Farmer's Carry",
  "en": "Farmer's Carry",
  "category": 2,
  "posture": "Standing · 양손 덤벨 들고 걷기",
  "muscles": "전완 악력근·승모근·몸통 안정화 근육",
  "description": "양손에 덤벨을 들고 어깨를 안정적으로 유지하며 일정 거리 또는 시간 동안 걷는다. 목과 어깨에 과한 긴장이 생기지 않게 한다.",
  "tags": [
   "Standing",
   "Dumbbell",
   "Carry",
   "Grip",
   "Isometric"
  ],
  "imageUrl": "https://www.gym-studio.com/_astro/farmer-walk.BgRb52CO_2kAnmV.webp",
  "notes": "사진 출처: https://www.gym-studio.com/exercices",
  "imagePath": "",
  "imageRemoved": false,
  "references": [],
  "removedReferenceIds": []
 }
];
const LEG_STRETCH_PHOTO_URLS={
 "Wall Calf Stretch": {
  "url": "https://eneslow.com/media/wysiwyg/email-for-Strech_Exersies.jpg",
  "source": "https://eneslow.com/timely-stretching"
 },
 "Bent-Knee Soleus Stretch": {
  "url": "https://cdn.shopify.com/s/files/1/0982/9017/2183/files/wall-calf-stretch-bent-knee-soleus-technique.jpg?v=1776814957",
  "source": "https://carevion.myshopify.com/blogs/news/posterior-tibial-tendonitis-exercises"
 },
 "Towel Calf Stretch": {
  "url": "https://hep.pro/_next/image?q=75&url=%2Fimg%2Fexercises%2Fseated-calf-stretch-gastrocnemius.png&w=3840",
  "source": "https://hep.pro/exercises/ankle-foot"
 },
 "Ankle Pumps": {
  "url": "https://www.thereadypatient.com/content/zb-content-hub/us/en/knee/exercises-for-knee-pain/jcr%3Acontent/root/responsivegrid/responsivegrid/responsivegrid_1694517879/layout_container_cop_125737937/image_886309941.coreimg.jpeg/1707854181172/ankle-pumps.jpeg",
  "source": "https://www.thereadypatient.com/knee/exercises-for-knee-pain.html"
 },
 "Ankle Circles": {
  "url": "https://upload.wikimedia.org/wikipedia/commons/9/97/Exercise_Ankle_Rotation.png",
  "source": "https://commons.wikimedia.org/wiki/File:Exercise_Ankle_Rotation.png"
 },
 "Ankle Alphabet": {
  "url": "https://i.pinimg.com/736x/24/56/50/245650cab23167d74af064d99b20bf25.jpg",
  "source": "https://www.pinterest.com/pin/127015651976906498/"
 },
 "Toe Spreads": {
  "url": "https://images.yogajournal.jp/article/29994/tHi2d10RurY86T3bwDLGdbRYmaITJxldtc0Ag5AI.jpeg",
  "source": "https://yogajournal.jp/4055/5"
 },
 "Plantar Fascia Stretch": {
  "url": "https://www.algeos.com/media/.renditions/wysiwyg/58A1E26D-EE38-4D1F-96CB-B3FCF9C419FA.png",
  "source": "https://www.algeos.com/company-news/post/algeos-product-guides/8-proven-exercises-for-plantar-fasciitis"
 },
 "Toe Flexion and Extension": {
  "url": "https://www.opz.at/templates/yootheme/cache/5a/Hallux%20Valgus-205003_gute%20Beweglichkeit-5ae01baa.jpeg",
  "source": "https://www.opz.at/fuss/hallux-valgus"
 },
 "Tibialis Anterior Stretch": {
  "url": "https://cdn.shopify.com/s/files/1/0939/6823/6867/files/Tibialis-Anterior-Shin-strech.webp?v=1770731383",
  "source": "https://therunningoutlet.co.uk/blogs/the-running-hub/stretches-for-shin-splints"
 },
 "Heel Walks": {
  "url": "https://i0.wp.com/www.kinetic-revolution.com/wp-content/uploads/2013/10/Screen-Shot-2013-10-10-at-10.53.38.png?fit=1098%2C700&ssl=1",
  "source": "https://www.kinetic-revolution.com/shin-strengthening-heel-walk-drill-for-runners/"
 },
 "Seated Toe Raises": {
  "url": "https://stat.ameba.jp/user_images/20160526/13/toyosuchiro/0d/9f/j/o0450060013655938647.jpg",
  "source": "https://ameblo.jp/toyosuchiro/entry-12164260746.html"
 },
 "Legs Up the Wall": {
  "url": "https://cdn.shopify.com/s/files/1/1456/4530/files/legs-up-the-wall.jpg?v=1751650996",
  "source": "https://polysleep.ca/fr/blogs/bien-etre/postures-yoga-systeme-nerveux"
 },
 "Elevated Ankle Pumps": {
  "url": "https://static.tvbs.com.tw/health2.0/images/uploads/2023/07/20230731135612-XADUFk2r.jpg",
  "source": "https://health.tvbs.com.tw/medical/341021"
 },
 "Supine Heel Slides": {
  "url": "https://www.fhft.nhs.uk/application/files/2917/7279/7363/Heel_Slides.png",
  "source": "https://www.fhft.nhs.uk/patients-and-visitors/patient-information-library/knee-injury-advice-sheet"
 }
};
function normalizeRegionalStudio(raw,area,legacyItems=[]){
 // Import the previous Lv.1–5 legs catalog once into the same technique model
 // used by glutes/hips/thighs. Keep the source items untouched for backups.
 const legMigrating=area==='legs'&&!raw?.legsStudioMigrated;
 const originalLegItems=legMigrating&&Array.isArray(legacyItems)?legacyItems.filter(x=>x?.area==='legs'&&['stretch','massage'].includes(x?.group)):[];
 const legTechniqueOf=(item)=>({
  id:'leg-tech:'+String(item.id),name:String(item.en||item.title||item.ko||'').trim()||'이름 없는 동작',
  en:String(item.en||item.title||''),category:Math.min(4,Math.max(0,(Number(item.level)||1)-1)),
  posture:'',muscles:'다리 이완·움직임',description:String(item.note||''),notes:String(item.note||''),
  imageUrl:'',imagePath:'',tags:[item.group==='massage'?'Massage':'Stretch'],
  references:(item.videos||[]).map((v,i)=>{
   const id=typeof v==='string'?v:v?.id;
   return /^[\w-]{11}$/.test(id||'')?{id:'legacy-video:'+item.id+':'+i,url:'https://www.youtube.com/watch?v='+id,title:'기존 참고 영상',start:0,end:null,memo:''}:null;
  }).filter(Boolean),removedReferenceIds:[]
 });
 const legStarterItems=LEG_STRETCH_SEED.filter(seed=>!originalLegItems.some(x=>String(x.id)===seed.id||String(x.en||x.title||'').trim().toLowerCase()===seed.en.toLowerCase()));
 const legStrengthSeed=legMigrating?[...originalLegItems.filter(x=>x.group==='stretch'),...legStarterItems].map(legTechniqueOf):[];
 const legMassageSeed=legMigrating?originalLegItems.filter(x=>x.group==='massage').map(legTechniqueOf):[];

 // Preserve older Glutes techniques: their old 0–5 categories described muscle actions,
 // not starting positions. Put them in a visible review group rather than mislabeling poses.
 const migrated=area==='glutes'&&!raw?.postureMigrated;
 const legacyLabels=['준비동작','고관절 신전','고관절 외전','고관절 외회전','단측 안정화','복합·통합'];
 const prepared=area==='glutes'&&migrated?(raw?.techniques||[]).map(t=>({
  ...t,category:13,
  tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),...(legacyLabels[t.category]?['기존 분류: '+legacyLabels[t.category]]:[])])].slice(0,12)
 })):area==='thighs'&&!raw?.thighCategoryMigrated?(raw?.techniques||[]).map(t=>({
  ...t,category:3,
  tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),'기존 허벅지 분류 · 재분류 필요'])].slice(0,12)
 })):area==='back'&&!raw?.backCategoryMigrated?(raw?.techniques||[]).map(t=>({
  ...t,category:4,
  tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),'기존 등 미분류 · 재분류 필요'])].slice(0,12)
 })):area==='arms'&&!raw?.armCategoryMigrated?(raw?.techniques||[]).map(t=>({
  ...t,category:3,tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),'기존 팔 미분류 · 재분류 필요'])].slice(0,12)
 })):raw?.techniques||[];
 // Previous back category 4 was a legacy review bucket; reserve category 4 for thoracic mobility.
 const backPrepared=area==='back'&&!raw?.backMobilityCategoryMigrated
  ?prepared.map(t=>t.category===4?{...t,category:5}:t)
  :prepared;
 const parsed=normalize({
  __skipStudios:true,
  __regionalStrengthLimit:area==='legs'?6:area==='hips'?11:area==='glutes'?14:area==='thighs'?4:area==='back'?6:area==='arms'?4:8,
  coreTechniques:area==='legs'?[...(raw?.techniques||[]),...legStrengthSeed.filter(t=>!(raw?.techniques||[]).some(x=>x.id===t.id))].map(t=>!raw?.legsThighCategoryMigrated&&Number(t.category)===4?{...t,category:5}:t):backPrepared,
  __regionalYogaLimit:area==='legs'?6:(area==='glutes'||area==='back')?5:area==='arms'?3:4,
  coreYogaTechniques:area==='glutes'&&!raw?.glutesYogaCategoryMigrated?(raw?.yogaTechniques||[]).map(t=>({
   ...t,category:4,
   tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),'기존 요가 분류 · 재분류 필요'])].slice(0,12)
  })):area==='back'&&!raw?.backYogaCategoryMigrated?(raw?.yogaTechniques||[]).map(t=>({
   ...t,category:4,
   tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),'기존 등 요가 분류 · 재분류 필요'])].slice(0,12)
  })):area==='arms'&&!raw?.armsYogaCategoryMigrated?(raw?.yogaTechniques||[]).map(t=>({
   ...t,category:2,
   tags:[...new Set([...(Array.isArray(t.tags)?t.tags:[]),'기존 팔 요가 분류 · 재분류 필요'])].slice(0,12)
  })):area==='legs'?[...(raw?.yogaTechniques||[]),...legMassageSeed.filter(t=>!(raw?.yogaTechniques||[]).some(x=>x.id===t.id))].map(t=>!raw?.legsThighCategoryMigrated&&Number(t.category)===4?{...t,category:5}:t):raw?.yogaTechniques||[],
  coreRoutines:raw?.routines||[],
  coreLogs:raw?.logs||[]
 });
 // Fill only missing leg-stretch images. Preserve any user-added photo and removal choice.
 const legPhotoTechniques=area==='legs'?parsed.coreTechniques.map(t=>{
  const photo=LEG_STRETCH_PHOTO_URLS[t.name]||LEG_STRETCH_PHOTO_URLS[t.en];
  if(!photo||t.imageUrl||t.imagePath||t.imageRemoved)return t;
  return {...t,imageUrl:photo.url,notes:t.notes||('사진 출처: '+photo.source)};
 }):parsed.coreTechniques;
 const backMassageTechniques=area==='back'?normalize({
  __skipStudios:true,
  __regionalYogaLimit:4,
  coreYogaTechniques:raw?.massageTechniques||[]
 }).coreYogaTechniques:(raw?.massageTechniques||[]);
 const backSeedVersion=Number(raw?.backSeedVersion)||0;
 const backTechniques=area==='back'?[
  ...parsed.coreTechniques,
  ...(backSeedVersion<1?BACK_EXERCISE_SEED.filter(seed=>!parsed.coreTechniques.some(t=>t.id===seed.id||t.name.trim().toLowerCase()===seed.name.toLowerCase())):[]),
  ...(backSeedVersion<2?THORACIC_MOBILITY_SEED.filter(seed=>!parsed.coreTechniques.some(t=>t.id===seed.id||t.name.trim().toLowerCase()===seed.name.toLowerCase())):[])
 ]:parsed.coreTechniques;
 const armSeedVersion=Number(raw?.armSeedVersion)||0;
 const armTechniques=area==='arms'?[
  ...parsed.coreTechniques,
  ...(armSeedVersion<1?ARM_EXERCISE_SEED.filter(seed=>!parsed.coreTechniques.some(t=>t.id===seed.id||t.name.trim().toLowerCase()===seed.name.toLowerCase())):[])
 ]:parsed.coreTechniques;
 const hipSeedVersion=Number(raw?.hipSeedVersion)||0;
 const hipTechniques=area==='hips'&&hipSeedVersion<1?[
  ...parsed.coreTechniques,
  ...HIP_MOBILITY_SEED.filter(seed=>!parsed.coreTechniques.some(t=>t.id===seed.id||t.name.trim().toLowerCase()===seed.name.toLowerCase()))
 ]:parsed.coreTechniques;
 const thighSeedVersion=Number(raw?.thighSeedVersion)||0;
 const thighTechniques=area==='thighs'?[
  ...parsed.coreTechniques.map(t=>{
   // Tag older seeded cards without overwriting the user's own starting-position tags.
   const known={ 'thigh-inner-seated-hip-adduction':'Machine', 'thigh-inner-side-lying-adduction':'Side-Lying',
    'thigh-inner-copenhagen-adduction':'Side-Lying','thigh-inner-standing-cable-adduction':'Standing',
    'thigh-inner-supine-ball-squeeze':'Supine'};
   const position=known[t.id];
   return position&&!(t.tags||[]).some(tag=>['Supine','Side-Lying','Standing','Machine'].includes(tag))
    ?{...t,tags:[position,...(t.tags||[])].slice(0,12)}:t;
  }),
  ...(thighSeedVersion<1?THIGH_ADDUCTOR_SEED.filter(seed=>!parsed.coreTechniques.some(t=>t.id===seed.id||t.name.trim().toLowerCase()===seed.name.toLowerCase())):[]).map(t=>{
    const positions={'thigh-inner-seated-hip-adduction':'Machine','thigh-inner-side-lying-adduction':'Side-Lying',
      'thigh-inner-copenhagen-adduction':'Side-Lying','thigh-inner-standing-cable-adduction':'Standing',
      'thigh-inner-supine-ball-squeeze':'Supine'};
    return {...t,tags:[positions[t.id],...(t.tags||[])].filter(Boolean).slice(0,12)};
  }),
  ...(thighSeedVersion<2?THIGH_ADDUCTOR_ADDITIONS.filter(seed=>!parsed.coreTechniques.some(t=>t.id===seed.id||t.name.trim().toLowerCase()===seed.name.toLowerCase())):[])
 ]:hipTechniques;
 return {
  legsStudioMigrated:area==='legs'?true:!!raw?.legsStudioMigrated,
  legsThighCategoryMigrated:area==='legs'?true:!!raw?.legsThighCategoryMigrated,
  postureMigrated:area==='glutes'?true:!!raw?.postureMigrated,
  glutesYogaCategoryMigrated:area==='glutes'?true:!!raw?.glutesYogaCategoryMigrated,
  backYogaCategoryMigrated:area==='back'?true:!!raw?.backYogaCategoryMigrated,
  armsYogaCategoryMigrated:area==='arms'?true:!!raw?.armsYogaCategoryMigrated,
  backCategoryMigrated:area==='back'?true:!!raw?.backCategoryMigrated,
  armCategoryMigrated:area==='arms'?true:!!raw?.armCategoryMigrated,
  armSeedVersion:area==='arms'?Math.max(1,armSeedVersion):armSeedVersion,
  backMobilityCategoryMigrated:area==='back'?true:!!raw?.backMobilityCategoryMigrated,
  thighCategoryMigrated:area==='thighs'?true:!!raw?.thighCategoryMigrated,
  thighSeedVersion:area==='thighs'?Math.max(2,thighSeedVersion):thighSeedVersion,
  hipSeedVersion:area==='hips'?Math.max(1,hipSeedVersion):hipSeedVersion,
  backSeedVersion:area==='back'?Math.max(2,backSeedVersion):backSeedVersion,
  techniques:area==='legs'?legPhotoTechniques:area==='back'?backTechniques:area==='arms'?armTechniques:thighTechniques,yogaTechniques:parsed.coreYogaTechniques,massageTechniques:backMassageTechniques,routines:parsed.coreRoutines,logs:parsed.coreLogs
 };
}
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
 const [area,setArea]=useState('core'),[group,setGroup]=useState('stretch');
 const demo=useMemo(()=>seedBodyCatalog({version:1,items:[],levelNames:{},beautyCatalogSeedVersion:0}),[]);
 return <div className="app">
  <header className="header"><div className="brand"><span className="symbol">✦</span><div><strong>BODY CARE</strong></div></div>
   <div className="header-right"><label className="area-switch"><span className="sr-only">부위 선택</span><select value={area} onChange={e=>setArea(e.target.value)}>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={15}/></label></div>
  </header>
  <main className="content care-content"><div className="public-demo-note">샘플 화면 · 읽기 전용 · 개인 데이터 비공개</div><CareLibrary data={demo} onUpdate={()=>{}} area={area} group={group} sync="체험 모드" readOnly/></main>
  <nav className="bottom-nav" aria-label="운동 카테고리">{groups.map(g=><button key={g.id} className={group===g.id?'active':''} onClick={()=>setGroup(g.id)}>{g.name}</button>)}</nav>
 </div>;
}

// Leg swelling-care library uses separate stretch and massage collections; no gym/strength tabs.
export default function App(){
 const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(!db),[loaded,setLoaded]=useState(!db);
 const [data,setData]=useState(()=>seedCoreCatalog(seedBodyCatalog(normalize(read(KEY,initial()))))),[area,setArea]=useState(areas[0].id),[group,setGroup]=useState('massage'),[level,setLevel]=useState(1);
 const [timerTab,setTimerTab]=useState(false),[timerKind,setTimerKind]=useState('face'),[recordsTab,setRecordsTab]=useState(false);
 const [coreTab,setCoreTab]=useState('inbox');
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
    const next=seedCoreCatalog(seedBodyCatalog(normalize(remote?.payload?.items?remote.payload:local||initial())));
   setData(next);persist(localKey,next);loadedUser.current=userId;setLoaded(true);setSync('동기화됨');
  }catch(e){if(live){setData(seedCoreCatalog(seedBodyCatalog(normalize(read(localKey,initial())))));loadedUser.current=null;setLoaded(false);blockedSave.current=true;setSync('불러오기 실패 · 저장 차단');show('서버 읽기 실패로 저장을 막았어 · 기기 데이터는 보존됨: '+e.message)}}})();
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
   update(d=>{const existing=new Set(d.items.map(x=>x.id));for(const row of incoming.items)if(!existing.has(row.id))d.items.push(row);d.levelNames={...incoming.levelNames,...d.levelNames};d.groupNames={...incoming.groupNames,...d.groupNames};d.routines=[...(d.routines||[]),...incoming.routines.filter(r=>!(d.routines||[]).some(existing=>existing.id===r.id))];d.coreTechniques=[...(d.coreTechniques||[]),...incoming.coreTechniques.filter(t=>!(d.coreTechniques||[]).some(existing=>existing.id===t.id))];d.coreYogaTechniques=[...(d.coreYogaTechniques||[]),...incoming.coreYogaTechniques.filter(t=>!(d.coreYogaTechniques||[]).some(existing=>existing.id===t.id))];d.coreRoutines=[...(d.coreRoutines||[]),...incoming.coreRoutines.filter(t=>!(d.coreRoutines||[]).some(existing=>existing.id===t.id))];d.coreLogs=[...(d.coreLogs||[]),...incoming.coreLogs.filter(t=>!(d.coreLogs||[]).some(existing=>existing.id===t.id))];
    d.studios=d.studios||{};
    for(const key of regionalStudioAreas){
     const current=d.studios[key]||{techniques:[],yogaTechniques:[],routines:[],logs:[]},source=incoming.studios[key]||{};
     const merge=(a,b)=>([...a,...b.filter(x=>!a.some(y=>y.id===x.id))]);
     d.studios[key]={techniques:merge(current.techniques||[],source.techniques||[]),yogaTechniques:merge(current.yogaTechniques||[],source.yogaTechniques||[]),routines:merge(current.routines||[],source.routines||[]),logs:merge(current.logs||[],source.logs||[])};
    }
    for(const entry of incoming.practiceLogs){if(!d.practiceLogs.some(x=>x.date===entry.date))d.practiceLogs.push(entry)}});
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
    <label className="area-switch"><span className="sr-only">장르 선택</span><select aria-label="장르 선택" value={area} onChange={e=>{setArea(e.target.value);if(e.target.value==='legs')setGroup('stretch');setCoreTab('inbox');setTimerTab(false);setRecordsTab(false);setExpanded(null);setArchived(false);setEditing(false);setLevel(1);setLevelRename(null)}}>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={15}/></label>
   </div></header>
  <main className={'content care-content'+(!isTimerOpen&&!isRecordOpen&&area==='face'&&group===sourceGroup('voice')?' voice-library-theme':'')+(!isTimerOpen&&!isRecordOpen&&area!=='face'&&group===sourceGroup('circulation')?' circulation-library-theme':'')+(!isTimerOpen&&!isRecordOpen&&area!=='face'&&group===sourceGroup('strength')?' strength-library-theme':'')+(!isTimerOpen&&!isRecordOpen&&area!=='face'&&group===sourceGroup('gym')?' gym-library-theme':'')}>{studioAreas.includes(area)?<CoreStudio key={area} area={area} tab={coreTab} data={data} onUpdate={update} sync={sync} database={db} userId={userId}/>:isRecordOpen?<PracticeRecords logs={area==='face'?practiceLogs:(data.bodyPracticeLogs||[]).filter(x=>x.area===area)} area={area}/>:isTimerOpen?<div className="body-timer-page"><h1 className="body-timer-title">Timer</h1><div className="body-timer-subtabs" role="tablist" aria-label="타이머 종류">{timerKinds.map(t=><button key={t.id} type="button" role="tab" aria-selected={activeTimerKind===t.id} className={activeTimerKind===t.id?'active '+t.id:''} onClick={()=>selectTimerKind(t.id)}>{t.name}</button>)}</div><RoutineTimer key={userId+':'+area+':'+activeTimerKind+':'+sourceGroup(activeTimerKind)} data={data} onUpdate={update} area={area} group={sourceGroup(activeTimerKind)} theme={activeTimerKind} userId={userId} database={db} onRecordSeconds={area==='face'?recordPractice:recordBodyPractice} embedded/></div>:<CareLibrary data={data} onUpdate={update} area={area} group={group} sync={sync} database={db} userId={userId}/>}</main>
  {studioAreas.includes(area)?<nav className="bottom-nav" aria-label="운동 스튜디오 카테고리"><button type="button" className={coreTab==='inbox'?'active':''} onClick={()=>setCoreTab('inbox')}>영상 인박스</button><button type="button" className={coreTab==='techniques'?'active':''} onClick={()=>setCoreTab('techniques')}>기술 라이브러리</button><button type="button" className={coreTab==='timer'?'active':''} onClick={()=>setCoreTab('timer')}>Timer</button><button type="button" className={coreTab==='records'?'active':''} onClick={()=>setCoreTab('records')}>기록</button></nav>:<nav className={'bottom-nav'+(area==='face'?'':' bottom-nav-five')} aria-label="운동 카테고리">{bottomTabs.map(g=>g.id==='__records'?<button key="__records" type="button" className={recordsTab?'active':''} onClick={()=>{setRecordsTab(true);setTimerTab(false)}}>기록</button>:g.id==='__timer'?<button key="__timer" type="button" className={timerTab?'active':''} onClick={()=>{setTimerTab(true);setRecordsTab(false)}}>Timer</button>:<button key={g.id} type="button" className={!timerTab&&!recordsTab&&group===g.id?'active':''} title="길게 눌러 이름 변경" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;beginGroupPress(g)}} onPointerUp={cancelGroupPress} onPointerCancel={cancelGroupPress} onPointerLeave={cancelGroupPress} onContextMenu={e=>{e.preventDefault();cancelGroupPress();suppressGroupClick.current=true;setGroupRename({area,group:g.id});setGroupDraft(groupName(area,g))}} onClick={()=>chooseBottom(g.id)}><span>{area==='face'&&g.id==='machine'?'기록':groupName(area,g)}</span></button>)}</nav>}
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
