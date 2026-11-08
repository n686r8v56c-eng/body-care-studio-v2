import React,{useState} from 'react';
import {Clipboard,Copy,Trash2} from 'lucide-react';
import './DashboardInbox.css';

export function youtubeId(raw){
 try{
  const text=String(raw||'').trim();
  const url=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text)?text:'https://'+text);
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  if(host==='youtu.be')return /^[\w-]{11}$/.test(url.pathname.split('/')[1]||'')?url.pathname.split('/')[1]:null;
  if(!['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host))return null;
  const video=url.searchParams.get('v')||url.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})(?:\/|$)/)?.[1];
  return /^[\w-]{11}$/.test(video||'')?video:null;
 }catch{return null}
}
const canonical=id=>'https://www.youtube.com/watch?v='+id;
export default function DashboardInbox({videos=[],onAdd,onRemove,readOnly=false}){
 const [reading,setReading]=useState(false);
 const [message,setMessage]=useState('');
 const rows=Array.isArray(videos)?videos:[];
 const save=async()=>{
  if(readOnly||reading)return;
  setReading(true);setMessage('');
  try{
   if(!navigator.clipboard?.readText)throw new Error('unsupported');
   // Read on the direct button gesture so iOS can request paste permission.
   const pasted=await navigator.clipboard.readText();
   const candidates=pasted.match(/(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s,]+/gi)||[pasted.trim()];
   const ids=[...new Set(candidates.map(youtubeId).filter(Boolean))];
   if(!ids.length){setMessage('복사한 내용에 유튜브 영상 링크가 없어.');return}
   const old=new Set(rows.map(x=>x.videoId));
   const added=ids.filter(id=>!old.has(id));
   if(!added.length){setMessage('이미 저장된 영상이야.');return}
   onAdd(added.map(id=>({videoId:id,url:canonical(id),createdAt:new Date().toISOString()})));
   setMessage(added.length+'개 영상 저장 완료');
  }catch{setMessage('클립보드 접근을 허용해 줘. iPhone에서는 붙여넣기 허용을 선택해야 해.')}
  finally{setReading(false)}
 };
 const copy=async url=>{
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
   else{
    const input=document.createElement('textarea');
    input.value=url;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();
    const ok=document.execCommand('copy');input.remove();
    if(!ok)throw new Error('복사 실패');
   }
   setMessage('링크 복사 완료');
  }catch{setMessage('복사가 차단됐어. 영상을 열어 주소를 복사해 줘.')}
 };
 return <section className="dashboard-in-page">
  <div className="dashboard-heading"><div><span className="dashboard-overline">VIDEO INBOX</span><h1>IN</h1></div><span className="dashboard-count">{rows.length}개</span></div>
  <div className="dashboard-in-form">
   <button type="button" onClick={save} disabled={readOnly||reading}><Clipboard size={18}/>{reading?'등록 중…':'붙여넣기'}</button>
  </div>
  {message&&<p role="status" className="dashboard-in-status">{message}</p>}
  <div className="dashboard-in-list">
   {rows.length===0?<p className="dashboard-in-empty">저장된 영상이 없어. 유튜브에서 링크를 복사한 뒤 붙여넣기 버튼을 눌러줘.</p>:rows.map(row=>{
    const id=row.videoId;
    const link=canonical(id);
    return <article className="dashboard-in-item" key={id}>
      <a href={link} target="_blank" rel="noopener noreferrer" className="dashboard-in-thumb" title="유튜브에서 영상 열기"><img src={'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'} alt="유튜브 영상 썸네일" loading="lazy"/></a>
      <div className="dashboard-in-info"><span className="dashboard-in-name">YouTube 영상</span><small>{id}</small></div>
      <button type="button" className="dashboard-in-copy" onClick={()=>copy(link)} aria-label="영상 링크 복사" title="영상 링크 복사"><Copy size={19}/></button>
      {!readOnly&&<button type="button" className="dashboard-in-delete" onClick={()=>onRemove(id)} aria-label="영상 삭제" title="목록에서 삭제"><Trash2 size={17}/></button>}
    </article>;
   })}
  </div>
 </section>;
}
