import React,{useEffect,useRef,useState} from 'react';
import {Search,Archive,Plus,Pin,Copy,Link2,X,ImagePlus,Type,Trash2} from 'lucide-react';
import './GenreBook.css';
const keyFor=(user,area)=>'body-care-v2-book:'+String(user||'guest')+':'+area;
const fresh=()=>({folders:['Korea','China'],folder:'Korea',boards:{}});
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fresh()}catch{return fresh()}};
const uid=()=>crypto.randomUUID?.()||String(Date.now()+Math.random());
const openImages=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('body-care-v2-book-images',1);req.onupgradeneeded=()=>req.result.createObjectStore('images');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result)});
async function putImage(id,blob){const db=await openImages();return new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getImage(id){const db=await openImages();return new Promise((resolve,reject)=>{const tx=db.transaction('images');const req=tx.objectStore('images').get(id);req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>{db.close();reject(req.error)}})}
function CardImage({id}){const [src,setSrc]=useState('');useEffect(()=>{let live=true,url='';if(id)getImage(id).then(blob=>{if(live&&blob){url=URL.createObjectURL(blob);setSrc(url)}}).catch(()=>{});return()=>{live=false;if(url)URL.revokeObjectURL(url)}},[id]);return src?<img src={src} alt="카드 이미지"/>:<span>이미지를 불러올 수 없어</span>}
export default function GenreBook({area,userId}){
 const storageKey=keyFor(userId,area);
 const [state,setState]=useState(()=>read(storageKey)),[modal,setModal]=useState(null),[draft,setDraft]=useState(''),[search,setSearch]=useState(false),[term,setTerm]=useState('');
 const inputRef=useRef(null),pasteRef=useRef(null);
 useEffect(()=>{setState(read(storageKey));setModal(null)},[storageKey]);
 const save=fn=>setState(prev=>{const next=fn(prev);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{alert('저장 공간이 부족해.')}return next});
 const folders=state.folders?.length?state.folders:['Korea','China'],folder=folders.includes(state.folder)?state.folder:folders[0];
 const boards=state.boards?.[folder]||[{id:'default',name:'보드1',cards:[]}];
 const updateBoards=fn=>save(p=>({...p,boards:{...p.boards,[folder]:fn(p.boards?.[folder]||[{id:'default',name:'보드1',cards:[]}])}}));
 const changeCard=(bid,index,fn)=>updateBoards(bs=>bs.map(b=>b.id===bid?{...b,cards:Array.from({length:Math.max(index+1,b.cards?.length||0)},(_,i)=>i===index?fn(b.cards?.[i]||{}):b.cards?.[i]||{})}:b));
 const addFolder=()=>{const name=prompt('상위함 이름');if(name?.trim()&&!folders.includes(name.trim()))save(p=>({...p,folders:[...folders,name.trim()],folder:name.trim()}))};
 const renameBoard=id=>{const old=boards.find(b=>b.id===id);const name=prompt('보드 이름',old?.name||'');if(name?.trim())updateBoards(bs=>bs.map(b=>b.id===id?{...b,name:name.trim()}:b))};
 const archiveBoard=id=>{if(!confirm('보드를 보관함으로 이동할까?'))return;save(p=>({...p,boards:{...p.boards,[folder]:boards.filter(b=>b.id!==id)},archive:[...(p.archive||[]),{...boards.find(b=>b.id===id),folder}]}))};
 const restoreBoard=()=>{const arr=state.archive||[];if(!arr.length)return alert('보관된 보드가 없어.');const n=Number(prompt('복원할 보드 번호\n'+arr.map((b,i)=>(i+1)+'. '+b.name+' ('+b.folder+')').join('\n')));if(n>0&&n<=arr.length){const b=arr[n-1];save(p=>({...p,archive:p.archive.filter((_,i)=>i!==n-1),boards:{...p.boards,[b.folder]:[...(p.boards?.[b.folder]||[]),b]}}))}};
 const chooseText=()=>{setDraft(modal?.card?.text||modal?.card?.title||modal?.card?.memo||'');setModal(m=>({...m,mode:'text'}))};
 const saveText=()=>{changeCard(modal.bid,modal.index,c=>({...c,type:'text',text:draft,title:'',memo:''}));setModal(null)};
 const chooseImage=()=>inputRef.current?.click();
 const uploadImage=async file=>{if(!file||!modal)return;try{const img=await createImageBitmap(file);const scale=Math.min(1,1200/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);img.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!blob)throw Error('이미지 변환 실패');const id=uid();await putImage(id,blob);changeCard(modal.bid,modal.index,c=>({...c,type:'image',imageId:id}));setModal(null)}catch(e){alert('이미지 저장 실패: '+e.message)}};
 const setLink=(bid,index)=>{const card=boards.find(b=>b.id===bid)?.cards?.[index]||{};const url=prompt('연결할 링크',card.link||'');if(url===null)return;if(url.trim()&&!/^https?:\/\//i.test(url.trim()))return alert('https:// 또는 http:// 링크를 입력해 줘.');changeCard(bid,index,c=>({...c,link:url.trim()}))};
 const deleteCard=(bid,index)=>{if(confirm('카드를 삭제할까?'))changeCard(bid,index,()=>({}))};
 const copyCard=(bid,index)=>{pasteRef.current=boards.find(b=>b.id===bid)?.cards?.[index]||null;};
 const pasteCard=(bid,index)=>{if(pasteRef.current)changeCard(bid,index,()=>({...pasteRef.current}))};
 const matching=card=>!term.trim()||[card?.text,card?.title,card?.memo].some(t=>String(t||'').toLowerCase().includes(term.toLowerCase()));
 return <div className="genre-book">
  <div className="genre-book-heading"><h2>Book</h2><div className="genre-book-tools"><button aria-label="검색" onClick={()=>setSearch(!search)}><Search/></button><button onClick={restoreBoard} aria-label="보관함"><Archive/> <span>({(state.archive||[]).length})</span></button></div></div>
  {search&&<input className="genre-book-search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="카드 텍스트 검색"/>}
  <div className="genre-book-folders">{folders.map(f=><button key={f} className={f===folder?'active':''} onClick={()=>save(p=>({...p,folder:f}))}>{f}</button>)}<button onClick={addFolder} aria-label="상위함 추가"><Plus/></button></div>
  <div className="genre-book-board-scroll">{boards.map(b=><section className="genre-book-board" key={b.id}><div className="genre-book-board-title"><button onClick={()=>renameBoard(b.id)}>{b.name}</button><button onClick={()=>archiveBoard(b.id)} aria-label="보드 보관"><Archive size={18}/></button></div>
   <div className="genre-book-cards">{Array.from({length:Math.max(8,(b.cards||[]).length+1)},(_,i)=>{const card=b.cards?.[i]||{},filled=!!(card.text||card.title||card.imageId);return <div key={i} className={'genre-book-card '+(filled?'filled':'')+(card.pinned?' pinned':'')} style={term&&!matching(card)?{opacity:.2}:{}}>
    {filled&&<div className="genre-book-card-actions"><button aria-label="핀 고정" onClick={()=>changeCard(b.id,i,c=>({...c,pinned:!c.pinned}))}><Pin size={15} fill={card.pinned?'currentColor':'none'}/></button><button aria-label="카드 복사" onClick={()=>copyCard(b.id,i)}><Copy size={15}/></button><button aria-label="링크 설정" onClick={()=>setLink(b.id,i)}><Link2 size={15}/></button><button aria-label="카드 삭제" onClick={()=>deleteCard(b.id,i)}><X size={15}/></button></div>}
    <button className="genre-book-card-main" onClick={()=>setModal({bid:b.id,index:i,card,mode:filled?'edit':'choose'})}>{card.imageId?<CardImage id={card.imageId}/>:filled?<span className="genre-book-card-text">{card.text||card.title}</span>:<Plus size={30}/>}</button>
    {card.link&&<button className="genre-book-open-link" onClick={()=>window.open(card.link,'_blank','noopener,noreferrer')} aria-label="링크 열기"><Link2 size={16}/></button>}
    {!filled&&pasteRef.current&&<button className="genre-book-paste" onClick={()=>pasteCard(b.id,i)}>붙여넣기</button>}
   </div>})}</div></section>)}<button className="genre-book-add-board" onClick={()=>updateBoards(bs=>[...bs,{id:uid(),name:'보드'+(bs.length+1),cards:[]}])}>＋ 보드 추가</button></div>
  <input ref={inputRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';uploadImage(f)}}/>
  {modal&&<div className="genre-book-modal-backdrop" onClick={()=>setModal(null)}><div className="genre-book-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
   {modal.mode==='text'?<><h3>텍스트 입력</h3><textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)} rows={7} placeholder="내용을 입력해 줘"/><div className="genre-book-modal-footer"><button onClick={()=>setModal(null)}>취소</button><button onClick={saveText}>저장</button></div></>:<><h3>이 칸에 무엇을 넣을까?</h3><div className="genre-book-modal-choices"><button onClick={chooseText}><Type size={32}/>텍스트</button><button onClick={chooseImage}><ImagePlus size={32}/>이미지</button></div><button className="genre-book-cancel" onClick={()=>setModal(null)}>취소</button></>}
  </div></div>}
 </div>
}