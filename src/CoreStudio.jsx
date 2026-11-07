import React from 'react';
import CareLibrary from './CareLibrary.jsx';

// Core is intentionally isolated from Face/Upper/Lower classifications.
// Video collection remains manual and requires no analysis.
export const CORE_CATEGORIES=Object.freeze([
 '몸통 굴곡','몸통 신전','몸통 회전','신전 저항','회전 저항','측면 안정화','복합·통합'
]);
export default function CoreStudio({tab,data,onUpdate,sync}){
 if(tab==='inbox')return <section aria-label="코어 영상 인박스">
  <div style={{padding:'14px 16px 4px'}}>
   <h2 style={{margin:'0 0 4px',fontSize:20}}>코어 · 영상 인박스</h2>
   <p style={{margin:'0 0 10px',fontSize:13,opacity:.7}}>영상 링크를 먼저 모아두고, 기술 분석은 나중에 해도 돼.</p>
  </div>
  <CareLibrary data={data} onUpdate={onUpdate} area="core" group="massage" sync={sync}/>
 </section>;
 return <section aria-label="코어 기술 라이브러리" style={{padding:'18px 16px'}}>
  <h2 style={{margin:'0 0 6px',fontSize:20}}>코어 · 기술 라이브러리</h2>
  <p style={{fontSize:13,opacity:.7,margin:'0 0 18px'}}>타임라인을 분석하고 확인한 기술만 여기에 등록할 예정이야. 영상 인박스와 분리되어 있어.</p>
  <div style={{display:'grid',gap:9}}>
   {CORE_CATEGORIES.map((name,i)=><div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px',border:'1px solid var(--line, #ddd)',borderRadius:12}}>
    <strong style={{fontSize:15}}>{i+1}. {name}</strong><span style={{fontSize:12,opacity:.6}}>0개</span>
   </div>)}
  </div>
 </section>;
}
