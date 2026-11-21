import React,{useEffect,useRef,useState} from 'react';
import {Search,Archive,Plus,Pin,Copy,Link2,X,ImagePlus,Type,Trash2} from 'lucide-react';
import './GenreBook.css';
const keyFor=(user,area)=>'body-care-v2-book:'+String(user||'guest')+':'+area;
const fresh=()=>({folders:['Korea','China'],folder:'Korea',boards:{},subfolders:{},selectedSubfolders:{}});
const defaultSub='하위함1';
const subsFor=(p,f)=>p.subfolders?.[f]?.length?p.subfolders[f]:[defaultSub];
const selectedSub=(p,f)=>subsFor(p,f).includes(p.selectedSubfolders?.[f])?p.selectedSubfolders[f]:subsFor(p,f)[0];
const defaultMiddle='중간함1';
const isCoreBook=area=>area==='core'||area==='core-fascia-book'||area==='practice-book';
const middlesFor=(p,f)=>p.middleFolders?.[f]?.length?p.middleFolders[f]:[defaultMiddle];
const selectedMiddle=(p,f)=>middlesFor(p,f).includes(p.selectedMiddleFolders?.[f])?p.selectedMiddleFolders[f]:middlesFor(p,f)[0];
const subScope=(f,m)=>JSON.stringify([f,m]);
const boardKey=(f,sub,m)=>m===undefined?JSON.stringify([f,sub]):JSON.stringify([f,m,sub]);
const subsForMiddle=(p,f,m)=>p.subfolders?.[subScope(f,m)]?.length?p.subfolders[subScope(f,m)]:[defaultSub];
const selectedSubMiddle=(p,f,m)=>subsForMiddle(p,f,m).includes(p.selectedSubfolders?.[subScope(f,m)])?p.selectedSubfolders[subScope(f,m)]:subsForMiddle(p,f,m)[0];
// Move only core Book metadata into the new hierarchy; image blobs remain untouched in IndexedDB.
const migrateCore=p=>{
 if(!p||p.bookStructureVersion===3)return p;
 const folders=p.folders||['Korea','China'],boards={...(p.boards||{})},subfolders={...(p.subfolders||{})},selectedSubfolders={...(p.selectedSubfolders||{})};
 for(const f of folders){
  const scope=subScope(f,defaultMiddle);
  const subs=subsFor(p,f);
  subfolders[scope]=subs;
  selectedSubfolders[scope]=selectedSub(p,f);
  for(const sub of subs){const old=boardKey(f,sub),next=boardKey(f,sub,defaultMiddle);if(Object.prototype.hasOwnProperty.call(boards,old)){if(!Object.prototype.hasOwnProperty.call(boards,next))boards[next]=boards[old];delete boards[old]}}
 }
 return {...p,boards,subfolders,selectedSubfolders,middleFolders:Object.fromEntries(folders.map(f=>[f,[defaultMiddle]])),selectedMiddleFolders:Object.fromEntries(folders.map(f=>[f,defaultMiddle])),archive:(p.archive||[]).map(b=>({...b,middle:b.middle||defaultMiddle})),bookStructureVersion:3};
};
// Legacy boards were stored directly under each top-level folder. Keep them in its first subfolder.
const migrate=p=>{if(!p||Number(p.bookStructureVersion)>=2)return p;const boards={...(p.boards||{})};for(const f of p.folders||['Korea','China']){if(Array.isArray(boards[f])){boards[boardKey(f,defaultSub)]=boards[f];delete boards[f]}}return {...p,boards,subfolders:p.subfolders||{},selectedSubfolders:p.selectedSubfolders||{},bookStructureVersion:2}};
// Add the requested mobility tab in the existing thigh folder without touching any boards or image data.
const ensureThighMobility=(p,key)=>{
 if(!key.endsWith(':my-sequence-lower'))return p;
 const names=p.subfolders?.['허벅지'];
 if(!Array.isArray(names)||names.includes('가동성'))return p;
 const before=names.indexOf('안벅지'),after=names.indexOf('속강화');
 if(before<0||after<=before)return p;
 const next=[...names];next.splice(after,0,'가동성');
 return {...p,subfolders:{...p.subfolders,['허벅지']:next}};
};
// Insert the requested posture folders without altering existing boards or image data.
const ensureSecondSupine=(p,key)=>{
 if(!key.endsWith(':my-sequence-core'))return p;
 const folders=p.folders||[];
 const first=folders.indexOf('누워서1');
 if(first<0)return p;
 const next=[...folders];
 if(!next.includes('누워서2'))next.splice(first+1,0,'누워서2');
 if(!next.includes('프론'))next.splice(next.indexOf('누워서2')+1,0,'프론');
 return next.length===folders.length?p:{...p,folders:next};
};
// Remove the obsolete auto-created Basic Postures tab from the Core Sequence.
// Preserve its board data and image blobs for recovery; only remove folder metadata.
const removeObsoleteBasicPosture=(p,key)=>{
 if(!key.endsWith(':my-sequence-core'))return p;
 let changed=false;
 const subfolders={...(p.subfolders||{})};
 const selectedSubfolders={...(p.selectedSubfolders||{})};
 for(const [scope,names] of Object.entries(subfolders)){
  if(!Array.isArray(names)||!names.includes('기본자세'))continue;
  const next=names.filter(name=>name!=='기본자세');
  // Keep an active folder so the UI never falls back to a deleted selection.
  subfolders[scope]=next.length?next:[defaultSub];
  if(selectedSubfolders[scope]==='기본자세')selectedSubfolders[scope]=subfolders[scope][0];
  changed=true;
 }
 return changed?{...p,subfolders,selectedSubfolders}:p;
};
// Place Upper Body Basics between Upper Body and Arm Basics without changing board IDs.
const ensureUpperBasics=(p,key)=>{
 if(!key.endsWith(':my-sequence-core'))return p;
 let changed=false;
 const subfolders={...(p.subfolders||{})};
 for(const [scope,names] of Object.entries(subfolders)){
  if(!Array.isArray(names)||names.includes('상체기본'))continue;
  const upper=names.indexOf('상체'),arms=names.indexOf('팔기본자세');
  if(upper<0||arms!==upper+1)continue;
  const next=[...names];next.splice(arms,0,'상체기본');
  subfolders[scope]=next;changed=true;
 }
 return changed?{...p,subfolders}:p;
};
// Add Bridge immediately after Hip Flexion/Extension in Core Book subfolders.
// Keep existing board IDs, cards, and image data untouched.
const ensureBridge=(p,key)=>{
 if(!key.endsWith(':my-sequence-core'))return p;
 let changed=false;
 const subfolders={...(p.subfolders||{})};
 for(const [scope,names] of Object.entries(subfolders)){
  if(!Array.isArray(names)||names.includes('브릿지'))continue;
  const index=names.indexOf('고관절굴곡신전');
  if(index<0)continue;
  const next=[...names];next.splice(index+1,0,'브릿지');
  subfolders[scope]=next;changed=true;
 }
 return changed?{...p,subfolders}:p;
};
// Add Dead Bug immediately after Bridge in Core Book, preserving existing board data.
const ensureDeadBug=(p,key)=>{
 if(!key.endsWith(':my-sequence-core'))return p;
 let changed=false;
 const subfolders={...(p.subfolders||{})};
 for(const [scope,names] of Object.entries(subfolders)){
  if(!Array.isArray(names)||names.includes('데드버그'))continue;
  const index=names.indexOf('브릿지');
  if(index<0)continue;
  const next=[...names];next.splice(index+1,0,'데드버그');
  subfolders[scope]=next;changed=true;
 }
 return changed?{...p,subfolders}:p;
};
// Add Side-Lying immediately after Side Plank in the saved Core Sequence folders.
// Only append folder metadata; preserve all existing boards, subfolders, and images.
const ensureSideLying=(p,key)=>{
 if(!key.endsWith(':my-sequence-core'))return p;
 const folders=p.folders||[];
 const sidePlank=folders.indexOf('사이드플랭');
 if(sidePlank<0||folders.includes('사이드라잉'))return p;
 const next=[...folders];next.splice(sidePlank+1,0,'사이드라잉');
 return {...p,folders:next};
};
const read=(key,core=false)=>{
 try{
  const p=migrate(JSON.parse(localStorage.getItem(key)||'null')||fresh());
  const base=core?migrateCore(p):p;
  const mobility=ensureThighMobility(base,key);
  const supine=ensureSecondSupine(mobility,key);
  const withoutBasic=removeObsoleteBasicPosture(supine,key);
  const upper=ensureUpperBasics(withoutBasic,key);
  const sideLying=ensureSideLying(upper,key);
  const bridge=ensureBridge(sideLying,key);
  return ensureDeadBug(bridge,key);
 }catch{return core?migrateCore(migrate(fresh())):fresh()}
};
const youtubeId=raw=>{try{const u=new URL(String(raw||'').trim());const host=u.hostname.toLowerCase();const parts=u.pathname.split('/').filter(Boolean);const id=host==='youtu.be'?parts[0]:['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host)?(u.searchParams.get('v')||(['shorts','embed','live'].includes(parts[0])?parts[1]:'')):'';return id&&id.length===11&&Array.from(id).every(ch=>'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.includes(ch))?id:''}catch{return ''}};
const instagramUrl=raw=>{try{const u=new URL(String(raw||'').trim());if(!['instagram.com','www.instagram.com','m.instagram.com'].includes(u.hostname.toLowerCase()))return '';const parts=u.pathname.split('/').filter(Boolean);if(!['p','reel','reels','tv','stories'].includes(parts[0])||!parts[1])return '';return 'https://www.instagram.com/'+(parts[0]==='reels'?'reel':parts[0])+'/'+parts.slice(1).join('/')+'/'}catch{return ''}};
const uid=()=>crypto.randomUUID?.()||String(Date.now()+Math.random());
const openImages=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('body-care-v2-book-images',1);req.onupgradeneeded=()=>req.result.createObjectStore('images');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result)});
async function putImage(id,blob){const db=await openImages();return new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getImage(id){const db=await openImages();return new Promise((resolve,reject)=>{const tx=db.transaction('images');const req=tx.objectStore('images').get(id);req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>{db.close();reject(req.error)}})}
function CardImage({id}){const [src,setSrc]=useState('');useEffect(()=>{let live=true,url='';if(id)getImage(id).then(blob=>{if(live&&blob){url=URL.createObjectURL(blob);setSrc(url)}}).catch(()=>{});return()=>{live=false;if(url)URL.revokeObjectURL(url)}},[id]);return src?<img src={src} alt="카드 이미지"/>:<span>이미지를 불러올 수 없어</span>}
export default function GenreBook({area,userId}){
 const storageKey=keyFor(userId,area);
 const [state,setState]=useState(()=>read(storageKey,isCoreBook(area))),[modal,setModal]=useState(null),[draft,setDraft]=useState(''),[search,setSearch]=useState(false),[term,setTerm]=useState('');
 const inputRef=useRef(null),pasteRef=useRef(null),holdTimer=useRef(null),holdTriggered=useRef(false);
 const [manage,setManage]=useState(null),[playing,setPlaying]=useState('');
 const exportRecovery=async()=>{
  try{
   const records={};
   for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k?.startsWith('body-care-v2-book:'))records[k]=localStorage.getItem(k);
   }
   const imageIds=[];
   try{
    const db=await openImages();
    await new Promise((resolve,reject)=>{
     const tx=db.transaction('images','readonly');
     const req=tx.objectStore('images').getAllKeys();
     req.onsuccess=()=>{imageIds.push(...req.result.map(String));resolve()};
     req.onerror=()=>reject(req.error);
    });
    db.close();
   }catch(e){console.warn('Book image index unavailable',e)}
   const payload={format:'body-care-book-recovery-v1',exportedAt:new Date().toISOString(),activeKey:storageKey,records,imageIds};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='body-care-book-recovery-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   alert('북 복구 진단 파일을 내보냈어. 이 파일을 채팅에 첨부해 줘. 기존 저장 데이터는 변경하지 않았어.');
  }catch(e){alert('복구 진단 파일 생성 실패: '+String(e?.message||e))}
 };

 const boardScrollRef=useRef(null),swipeStartRef=useRef(null),pendingBoardRef=useRef(false);
 const appendBoard=()=>{if(pendingBoardRef.current)return;pendingBoardRef.current=true;updateBoards(bs=>[...bs,{id:uid(),name:'보드'+(bs.length+1),cards:[]}]);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=boardScrollRef.current;if(el)el.scrollTo({left:el.scrollWidth-el.clientWidth,behavior:'smooth'});pendingBoardRef.current=false}))};
 const onBoardTouchStart=e=>{const el=boardScrollRef.current;const last=el?.querySelector('.genre-book-board:last-of-type');const boardEnd=last?last.offsetLeft+last.offsetWidth:0;swipeStartRef.current=el?{x:e.touches[0]?.clientX,atEnd:boardEnd-el.scrollLeft-el.clientWidth<70}:null};
 const onBoardTouchEnd=e=>{const start=swipeStartRef.current;swipeStartRef.current=null;if(!start?.atEnd)return;const end=e.changedTouches[0]?.clientX;if(typeof end==='number'&&start.x-end>55)appendBoard()};
 const longPress=(kind,name)=>({onPointerDown:e=>{if(e.pointerType==='mouse'&&e.button!==0)return;clearTimeout(holdTimer.current);holdTriggered.current=false;holdTimer.current=setTimeout(()=>{holdTriggered.current=true;setManage({kind,name})},550)},onPointerUp:()=>clearTimeout(holdTimer.current),onPointerLeave:()=>clearTimeout(holdTimer.current),onPointerCancel:()=>clearTimeout(holdTimer.current),onContextMenu:e=>{e.preventDefault();clearTimeout(holdTimer.current);holdTriggered.current=true;setManage({kind,name})},onClickCapture:e=>{if(holdTriggered.current){e.stopPropagation();e.preventDefault();holdTriggered.current=false}}});
 useEffect(()=>()=>clearTimeout(holdTimer.current),[]);
 useEffect(()=>{setState(read(storageKey,isCoreBook(area)));setModal(null)},[storageKey]);
 const save=fn=>setState(prev=>{const next=fn(prev);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{alert('저장 공간이 부족해.')}return next});
 const folders=state.folders?.length?state.folders:['Korea','China'],folder=folders.includes(state.folder)?state.folder:folders[0];
 const coreBook=isCoreBook(area);
 const middleFolders=coreBook?middlesFor(state,folder):[],middle=coreBook?selectedMiddle(state,folder):undefined;
 const scope=coreBook?subScope(folder,middle):folder;
 const subfolders=coreBook?subsForMiddle(state,folder,middle):subsFor(state,folder);
 const subfolder=coreBook?selectedSubMiddle(state,folder,middle):selectedSub(state,folder);
 const currentKey=boardKey(folder,subfolder,middle);
 const boards=state.boards?.[currentKey]||[{id:'default',name:'보드1',cards:[]}];
 const updateBoards=fn=>save(p=>({...p,boards:{...p.boards,[currentKey]:fn(p.boards?.[currentKey]||[{id:'default',name:'보드1',cards:[]}])}}));
 const renameFolder=(target=folder)=>{const name=prompt('상위함 이름 변경',target)?.trim();if(!name||name===target)return;if(folders.includes(name))return alert('이미 있는 상위함이야.');save(p=>{
  const boards={...p.boards},subfolders={...p.subfolders},selectedSubfolders={...p.selectedSubfolders};
  if(coreBook){for(const m of middlesFor(p,target)){const oldScope=subScope(target,m),newScope=subScope(name,m);subfolders[newScope]=subfolders[oldScope]||[defaultSub];selectedSubfolders[newScope]=selectedSubfolders[oldScope]||defaultSub;delete subfolders[oldScope];delete selectedSubfolders[oldScope];for(const sub of subsForMiddle(p,target,m)){const old=boardKey(target,sub,m),next=boardKey(name,sub,m);if(boards[old]){boards[next]=boards[old];delete boards[old]}}}}
  else{for(const sub of subsFor(p,target)){const old=boardKey(target,sub),next=boardKey(name,sub);if(boards[old]){boards[next]=boards[old];delete boards[old]}}subfolders[name]=subsFor(p,target);selectedSubfolders[name]=selectedSub(p,target)}
  return {...p,folders:p.folders.map(f=>f===target?name:f),folder:p.folder===target?name:p.folder,boards,subfolders,selectedSubfolders,middleFolders:coreBook?{...p.middleFolders,[name]:middlesFor(p,target)}:p.middleFolders,selectedMiddleFolders:coreBook?{...p.selectedMiddleFolders,[name]:selectedMiddle(p,target)}:p.selectedMiddleFolders,archive:(p.archive||[]).map(b=>b.folder===target?{...b,folder:name}:b)};
 })};
 const deleteFolder=(target=folder)=>{if(!confirm('상위함을 삭제할까? 내부 보드도 함께 삭제돼.'))return;save(p=>{const boards={...p.boards};if(coreBook){for(const m of middlesFor(p,target))for(const sub of subsForMiddle(p,target,m))delete boards[boardKey(target,sub,m)]}else for(const sub of subsFor(p,target))delete boards[boardKey(target,sub)];const remaining=folders.filter(f=>f!==target);return {...p,folders:remaining,folder:p.folder===target?(remaining[0]||''):p.folder,boards}})};
 const addMiddle=()=>{const name=prompt('중간함 이름')?.trim();if(!name)return;if(middleFolders.includes(name))return alert('이미 있는 중간함이야.');save(p=>({...p,middleFolders:{...p.middleFolders,[folder]:[...middleFolders,name]},selectedMiddleFolders:{...p.selectedMiddleFolders,[folder]:name}}))};
 const renameMiddle=target=>{const name=prompt('중간함 이름 변경',target)?.trim();if(!name||name===target)return;if(middleFolders.includes(name))return alert('이미 있는 중간함이야.');save(p=>{const boards={...p.boards},subfolders={...p.subfolders},selectedSubfolders={...p.selectedSubfolders};const oldScope=subScope(folder,target),newScope=subScope(folder,name);subfolders[newScope]=subsForMiddle(p,folder,target);selectedSubfolders[newScope]=selectedSubMiddle(p,folder,target);delete subfolders[oldScope];delete selectedSubfolders[oldScope];for(const sub of subsForMiddle(p,folder,target)){const old=boardKey(folder,sub,target),next=boardKey(folder,sub,name);if(boards[old]){boards[next]=boards[old];delete boards[old]}}return {...p,boards,subfolders,selectedSubfolders,middleFolders:{...p.middleFolders,[folder]:middleFolders.map(m=>m===target?name:m)},selectedMiddleFolders:{...p.selectedMiddleFolders,[folder]:middle===target?name:middle},archive:(p.archive||[]).map(b=>b.folder===folder&&b.middle===target?{...b,middle:name}:b)}})};
 const deleteMiddle=target=>{if(middleFolders.length===1)return alert('마지막 중간함은 삭제할 수 없어.');if(!confirm('중간함과 내부 하위함·보드를 삭제할까?'))return;save(p=>{const boards={...p.boards};for(const sub of subsForMiddle(p,folder,target))delete boards[boardKey(folder,sub,target)];const remaining=middleFolders.filter(m=>m!==target);return {...p,boards,middleFolders:{...p.middleFolders,[folder]:remaining},selectedMiddleFolders:{...p.selectedMiddleFolders,[folder]:middle===target?remaining[0]:middle}}})};
 const addSubfolder=()=>{const name=prompt('하위함 이름')?.trim();if(!name)return;if(subfolders.includes(name))return alert('이미 있는 하위함이야.');save(p=>({...p,subfolders:{...p.subfolders,[scope]:[...subfolders,name]},selectedSubfolders:{...p.selectedSubfolders,[scope]:name}}))};
 const renameSubfolder=(target=subfolder)=>{const name=prompt('하위함 이름 변경',target)?.trim();if(!name||name===target)return;if(subfolders.includes(name))return alert('이미 있는 하위함이야.');save(p=>{const boards={...p.boards};const nextKey=boardKey(folder,name,middle),oldKey=boardKey(folder,target,middle);if(boards[oldKey]){boards[nextKey]=boards[oldKey];delete boards[oldKey]}return {...p,boards,subfolders:{...p.subfolders,[scope]:subfolders.map(x=>x===target?name:x)},selectedSubfolders:{...p.selectedSubfolders,[scope]:subfolder===target?name:subfolder},archive:(p.archive||[]).map(b=>b.folder===folder&&(!coreBook||b.middle===middle)&&b.subfolder===target?{...b,subfolder:name}:b)}})};
 const deleteSubfolder=(target=subfolder)=>{if(!confirm('하위함과 내부 보드를 삭제할까?'))return;save(p=>{const boards={...p.boards};delete boards[boardKey(folder,target,middle)];const remaining=subfolders.filter(x=>x!==target);return {...p,boards,subfolders:{...p.subfolders,[scope]:remaining.length?remaining:[defaultSub]},selectedSubfolders:{...p.selectedSubfolders,[scope]:subfolder===target?(remaining[0]||defaultSub):subfolder}}})};
 const changeCard=(bid,index,fn)=>updateBoards(bs=>bs.map(b=>b.id===bid?{...b,cards:Array.from({length:Math.max(index+1,b.cards?.length||0)},(_,i)=>i===index?fn(b.cards?.[i]||{}):b.cards?.[i]||{})}:b));
 const addFolder=()=>{const name=prompt('상위함 이름');if(name?.trim()&&!folders.includes(name.trim()))save(p=>({...p,folders:[...folders,name.trim()],folder:name.trim()}))};
 const renameBoard=id=>{const old=boards.find(b=>b.id===id);const name=prompt('보드 이름',old?.name||'');if(name?.trim())updateBoards(bs=>bs.map(b=>b.id===id?{...b,name:name.trim()}:b))};
 const archiveBoard=id=>{if(!confirm('보드를 보관함으로 이동할까?'))return;save(p=>({...p,boards:{...p.boards,[currentKey]:boards.filter(b=>b.id!==id)},archive:[...(p.archive||[]),{...boards.find(b=>b.id===id),folder,subfolder,middle}]}))};
 const restoreBoard=()=>{const arr=state.archive||[];if(!arr.length)return alert('보관된 보드가 없어.');const n=Number(prompt('복원할 보드 번호\n'+arr.map((b,i)=>(i+1)+'. '+b.name+' ('+b.folder+' / '+(b.subfolder||defaultSub)+')').join('\n')));if(n>0&&n<=arr.length){const b=arr[n-1];save(p=>({...p,archive:p.archive.filter((_,i)=>i!==n-1),boards:{...p.boards,[boardKey(b.folder,b.subfolder||defaultSub,coreBook?(b.middle||defaultMiddle):undefined)]:[...(p.boards?.[boardKey(b.folder,b.subfolder||defaultSub)]||[]),b]}}))}};
 const chooseText=()=>{setDraft(modal?.card?.text||modal?.card?.title||modal?.card?.memo||'');setModal(m=>({...m,mode:'text'}))};
 const saveText=()=>{changeCard(modal.bid,modal.index,c=>({...c,type:'text',text:draft,title:'',memo:''}));setModal(null)};
 const chooseImage=()=>inputRef.current?.click();
 const chooseYoutube=()=>{const url=prompt('유튜브 링크를 붙여넣어 줘 (영상 · 쇼츠)',modal?.card?.youtubeUrl||'');if(url===null)return;const id=youtubeId(url);if(!id)return alert('유효한 유튜브 영상 링크를 입력해 줘.');changeCard(modal.bid,modal.index,c=>({...c,type:'youtube',youtubeUrl:url.trim(),youtubeId:id}));setModal(null)};
 const chooseInstagram=()=>{const url=prompt('인스타그램 게시물 · 릴스 링크를 붙여넣어 줘',modal?.card?.instagramUrl||'');if(url===null)return;const normalized=instagramUrl(url);if(!normalized)return alert('유효한 Instagram 게시물 또는 릴스 링크를 입력해 줘.');changeCard(modal.bid,modal.index,c=>({...c,type:'instagram',instagramUrl:normalized,youtubeId:'',youtubeUrl:''}));setModal(null)};
 const [uploading,setUploading]=useState(false);
 const uploadImages=async files=>{
  if(!files?.length||!modal||uploading)return;
  const {bid,index}=modal;
  setUploading(true);
  const saved=[];let failed=0;
  for(const file of files){
   try{
    const img=await createImageBitmap(file);
    const scale=Math.min(1,1200/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));
    canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    img.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
    if(!blob)throw Error('이미지 변환 실패');
    const id=uid();await putImage(id,blob);saved.push(id);
   }catch(e){failed++;console.error('Book image upload failed',e)}
  }
  if(saved.length)updateBoards(bs=>bs.map(b=>{
   if(b.id!==bid)return b;
   const cards=[...(b.cards||[])];
   let cursor=index;
   for(const imageId of saved){
    while(cursor<cards.length&&(cards[cursor]?.text||cards[cursor]?.title||cards[cursor]?.imageId))cursor++;
    cards[cursor]={...(cards[cursor]||{}),type:'image',imageId};
    cursor++;
   }
   return {...b,cards};
  }));
  setModal(null);setUploading(false);
  if(failed)alert(saved.length+'장 저장 완료, '+failed+'장 실패했어. 실패한 사진만 다시 선택해 줘.');
 };
 const setLink=(bid,index)=>{const card=boards.find(b=>b.id===bid)?.cards?.[index]||{};const url=prompt('연결할 링크',card.link||'');if(url===null)return;if(url.trim()&&!/^https?:\/\//i.test(url.trim()))return alert('https:// 또는 http:// 링크를 입력해 줘.');changeCard(bid,index,c=>({...c,link:url.trim()}))};
 const pasteLink=async(bid,index)=>{let value='';try{value=await navigator.clipboard.readText()}catch{value=prompt('붙여넣을 링크를 입력해 줘')||''}const url=value.trim();if(!url)return;if(!/^https?:\/\//i.test(url)){alert('http:// 또는 https:// 링크를 복사해 줘.');return}changeCard(bid,index,c=>({...c,link:url}));};
 const openCardLink=(bid,index)=>{const url=boards.find(b=>b.id===bid)?.cards?.[index]?.link;if(!url){alert('저장된 링크가 없어. 네모 두 개 버튼으로 먼저 링크를 붙여넣어 줘.');return}if(!/^https?:\/\//i.test(url)){alert('유효한 링크가 아니야.');return}window.open(url,'_blank','noopener,noreferrer')};
 const openInstagram=()=>{const url=modal?.card?.instagramUrl;if(!instagramUrl(url))return;window.open(url,'_blank','noopener,noreferrer')};
 const deleteCard=(bid,index)=>{if(confirm('카드를 삭제할까?'))updateBoards(bs=>bs.map(b=>b.id===bid?{...b,cards:(b.cards||[]).filter((_,i)=>i!==index)}:b))};
 const copyCard=(bid,index)=>{pasteRef.current=boards.find(b=>b.id===bid)?.cards?.[index]||null;};
 const pasteCard=(bid,index)=>{if(pasteRef.current)changeCard(bid,index,()=>({...pasteRef.current}))};
 const matching=card=>!term.trim()||[card?.text,card?.title,card?.memo,card?.youtubeUrl,card?.instagramUrl].some(t=>String(t||'').toLowerCase().includes(term.toLowerCase()));
 return <div className="genre-book">
  <div className="genre-book-heading"><h2>Book</h2><div className="genre-book-tools"><button aria-label="검색" onClick={()=>setSearch(!search)}><Search/></button><button type="button" onClick={exportRecovery} aria-label="북 복구 진단 파일 내보내기" title="북 복구 진단 파일 내보내기" style={{fontSize:12,fontWeight:700}}>복구</button><button onClick={restoreBoard} aria-label="보관함"><Archive/> <span>({(state.archive||[]).length})</span></button></div></div>
  {search&&<input className="genre-book-search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="카드 텍스트 검색"/>}
  <div className="genre-book-folders">{folders.map(f=><button key={f} className={f===folder?'active':''} {...longPress('folder',f)} onClick={()=>save(p=>({...p,folder:f}))}>{f}</button>)}<button onClick={addFolder} aria-label="상위함 추가"><Plus/></button></div>
  {coreBook&&<div className="genre-book-subfolders">{middleFolders.map(m=><button key={m} className={m===middle?'active':''} {...longPress('middle',m)} onClick={()=>save(p=>({...p,selectedMiddleFolders:{...p.selectedMiddleFolders,[folder]:m}}))}>{m}</button>)}<button onClick={addMiddle} aria-label="중간함 추가"><Plus size={20}/></button></div>}
  <div className="genre-book-subfolders">{subfolders.map(f=><button key={f} className={f===subfolder?'active':''} {...longPress('subfolder',f)} onClick={()=>save(p=>({...p,selectedSubfolders:{...p.selectedSubfolders,[scope]:f}}))}>{f}</button>)}<button onClick={addSubfolder} aria-label="하위함 추가"><Plus size={20}/></button></div>
  <div className="genre-book-board-scroll" ref={boardScrollRef} onTouchStart={onBoardTouchStart} onTouchEnd={onBoardTouchEnd}>{boards.map(b=><section className="genre-book-board" key={b.id}><div className="genre-book-board-title"><button {...longPress("board",b.id)} onClick={()=>{}}>{b.name}</button></div>
   <div className="genre-book-cards">{Array.from({length:Math.max(8,(b.cards||[]).length+1)},(_,i)=>{const card=b.cards?.[i]||{},filled=!!(card.text||card.title||card.imageId||card.youtubeId||card.instagramUrl);return <div key={i} className={'genre-book-card '+(filled?'filled':'')+(card.pinned?' pinned':'')} style={term&&!matching(card)?{opacity:.2}:{}}>
    {filled&&<div className="genre-book-card-actions"><button aria-label="핀 고정" onClick={()=>changeCard(b.id,i,c=>({...c,pinned:!c.pinned}))}><Pin size={15} fill={card.pinned?'currentColor':'none'}/></button><button aria-label="클립보드 링크 붙여넣기" onClick={()=>pasteLink(b.id,i)}><Copy size={15}/></button><button aria-label={card.link?"연결된 링크 열기":"링크 없음"} title={card.link?"링크 연결됨":"링크 없음"} onClick={()=>openCardLink(b.id,i)} style={card.link?{background:"#8053b5",color:"#fff"}:{}}><Link2 size={15}/></button><button aria-label="카드 삭제" onClick={()=>deleteCard(b.id,i)}><X size={15}/></button></div>}
    <button className="genre-book-card-main" onClick={()=>setModal({bid:b.id,index:i,card,mode:filled?'edit':'choose'})}>{card.instagramUrl?<span className="genre-book-card-text" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><span style={{fontSize:28}}>◎</span><strong>Instagram</strong><span style={{fontSize:12}}>게시물 · 릴스</span></span>:card.youtubeId?<img src={'https://i.ytimg.com/vi/'+card.youtubeId+'/hqdefault.jpg'} alt="유튜브 영상 썸네일" onClick={e=>{e.stopPropagation();setPlaying(card.youtubeId)}}/>:card.imageId?<CardImage id={card.imageId}/>:filled?<span className="genre-book-card-text">{card.text||card.title}</span>:<Plus size={30}/>}</button>
    {!filled&&pasteRef.current&&<button className="genre-book-paste" onClick={()=>pasteCard(b.id,i)}>붙여넣기</button>}
   </div>})}</div></section>)}<button className="genre-book-add-board" onClick={()=>updateBoards(bs=>[...bs,{id:uid(),name:'보드'+(bs.length+1),cards:[]}])}>＋ 보드 추가</button></div>
  {manage&&<div className="genre-book-modal-backdrop" onClick={()=>setManage(null)}><div className="genre-book-modal genre-book-action-sheet" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><h3>{manage.kind==='folder'?manage.name:manage.kind==='subfolder'||manage.kind==='middle'?manage.name:boards.find(b=>b.id===manage.name)?.name||'보드'}</h3><button onClick={()=>{const m=manage;setManage(null);if(m.kind==='folder')renameFolder(m.name);else if(m.kind==='subfolder')renameSubfolder(m.name);else if(m.kind==='middle')renameMiddle(m.name);else renameBoard(m.name)}}>✎　이름 편집</button><button onClick={()=>{const m=manage;setManage(null);if(m.kind==='folder')deleteFolder(m.name);else if(m.kind==='subfolder')deleteSubfolder(m.name);else if(m.kind==='middle')deleteMiddle(m.name);else archiveBoard(m.name)}}>♜　{manage.kind==='board'?'보드 보관':'분류 삭제'}</button><button onClick={()=>setManage(null)}>×　취소</button></div></div>}
  {playing&&<div className="genre-book-modal-backdrop" onClick={()=>setPlaying('')}><div role="dialog" aria-modal="true" aria-label="유튜브 영상 재생" onClick={e=>e.stopPropagation()} style={{width:'min(95vw,600px)',background:'#fff',borderRadius:16,padding:12}}><button onClick={()=>setPlaying('')} style={{float:'right'}}>닫기 ×</button><iframe title="유튜브 영상" src={'https://www.youtube-nocookie.com/embed/'+playing+'?autoplay=1'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{width:'100%',aspectRatio:'9 / 16',maxHeight:'75vh',border:0,borderRadius:12}}/></div></div>}
  <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';uploadImages(files)}}/>
  {modal&&<div className="genre-book-modal-backdrop" onClick={()=>setModal(null)}><div className="genre-book-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
   {modal.mode==='text'?<><h3>텍스트 입력</h3><textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)} rows={7} placeholder="내용을 입력해 줘"/><div className="genre-book-modal-footer"><button onClick={()=>setModal(null)}>취소</button><button onClick={saveText}>저장</button></div></>:<><h3>{uploading?'사진 저장 중…':'이 칸에 무엇을 넣을까?'}</h3><div className="genre-book-modal-choices"><button onClick={chooseText}><Type size={32}/>텍스트</button><button onClick={chooseImage} disabled={uploading}><ImagePlus size={32}/>이미지 여러 장</button><button onClick={chooseYoutube} disabled={uploading}><Link2 size={32}/>유튜브 링크</button><button onClick={chooseInstagram} disabled={uploading}><Link2 size={32}/>인스타 링크</button>{modal.card?.instagramUrl&&<a href={modal.card.instagramUrl} target="_blank" rel="noopener noreferrer" style={{padding:12,textAlign:'center'}}>Instagram에서 열기 ↗</a>}</div><button className="genre-book-cancel" onClick={()=>setModal(null)}>취소</button></>}
  </div></div>}
 </div>
}