import React,{useState} from 'react';
import {Clipboard,Copy,Trash2,ExternalLink} from 'lucide-react';
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
 const [draft,setDraft]=useState('');
 const [message,setMessage]=useState('');
 const rows=Array.isArray(videos)?videos:[];
 const save=e=>{
  e.preventDefault();
  const candidates=draft.split(/[\s,]+/).map(youtubeId).filter(Boolean);
  const ids=[...new Set(candidates)];
  if(!ids.length){setMessage('유효한 유튜브 영상 링크를 붙여줘.');return}
  const old=new Set(rows.map(x=>x.videoId));
  const added=ids.filter(id=>!old.has(id));
  if(!added.length){setMessage('이미 저장된 영상이야.');return}
  onAdd(added.map(id=>({videoId:id,url:canonical(id),createdAt:new Date().toISOString()})));
  setDraft('');setMessage(added.length+'개 영상 저장 완료');
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
  <form className="dashboard-in-form" onSubmit={save}>
   <input type="url" aria-label="유튜브 영상 링크" placeholder="유튜브 영상 링크 붙여넣기" value={draft} onChange={e=>{setDraft(e.target.value);setMessage('')}} disabled={readOnly}/>
   <button type="submit" disabled={readOnly||!draft.trim()}><Clipboard size={17}/> 붙여넣기 · 저장</button>
  </form>
  {message&&<p role="status" className="dashboard-in-status">{message}</p>}
  <div className="dashboard-in-list">
   {rows.length===0?<p className="dashboard-in-empty">저장된 영상이 없어. 위에 유튜브 링크를 붙여넣어 줘.</p>:rows.map(row=>{
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
