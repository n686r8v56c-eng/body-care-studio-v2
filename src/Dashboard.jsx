import React,{useEffect,useMemo,useState} from 'react';
import './Dashboard.css';

const A=['core','glutes','thighs','hips'];
const B=['legs','face','back','arms'];
const LABELS={core:'코어',glutes:'엉덩이',thighs:'허벅지',hips:'고관절',legs:'다리',face:'Face Care',back:'등·가슴',arms:'팔'};
const ANCHOR=Date.UTC(2026,10,8);
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const parseDate=key=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d)};
const shift=(key,n)=>{const d=parseDate(key);d.setDate(d.getDate()+n);return dateKey(d)};
const phase=key=>Math.floor((Date.UTC(...key.split('-').map((v,i)=>i===1?Number(v)-1:Number(v)))-ANCHOR)/86400000)%2===0?A:B;
const count=(records,key)=>phase(key).filter(id=>records[key]?.includes(id)).length;
const WEEKDAYS=['일','월','화','수','목','금','토'];

export default function Dashboard({checks,onChange,tab}){
 const [today,setToday]=useState(()=>dateKey(new Date()));
 const [month,setMonth]=useState(()=>dateKey(new Date()).slice(0,7));
 const [selected,setSelected]=useState(()=>dateKey(new Date()));
 useEffect(()=>{
  // Re-evaluate the local day when returning to the app, even after midnight.
  const refresh=()=>setToday(dateKey(new Date()));
  const tick=setInterval(refresh,30000);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('focus',refresh);
  return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh)};
 },[]);
 const records=checks||{};
 const todayList=phase(today),todayDone=count(records,today);
 const selectedList=phase(selected);
 const selectedDone=count(records,selected);
 const days=useMemo(()=>{
  const [y,m]=month.split('-').map(Number);
  const start=new Date(y,m-1,1),last=new Date(y,m,0).getDate();
  return [...Array(start.getDay()).fill(null),...Array.from({length:last},(_,i)=>dateKey(new Date(y,m-1,i+1)))];
 },[month]);
 const changeMonth=delta=>{const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+delta,1);setMonth(dateKey(d).slice(0,7))};
 const toggle=id=>onChange(today,id,!records[today]?.includes(id));
 const lastSeven=Array.from({length:7},(_,i)=>shift(today,i-6));
 const weeklyTotal=lastSeven.reduce((sum,day)=>sum+count(records,day),0);
 return <section className="dashboard-page">
 {tab==='home'&&<>
  <div className="dashboard-heading"><div><span className="dashboard-overline">TODAY · {today}</span><h1>오늘의 바디 체크</h1></div><span className="dashboard-count">{todayDone} / 4</span></div>
  <div className="dashboard-progress" role="progressbar" aria-valuenow={todayDone} aria-valuemin={0} aria-valuemax={4}><div style={{width:(todayDone*25)+'%'}}/></div>
  <p className="dashboard-hint">매일 4개 · 하루씩 A/B 세트가 번갈아 나와요.</p>
  <div className="dashboard-list">{todayList.map(id=><label key={id} className={'dashboard-check '+(records[today]?.includes(id)?'is-done':'')}><input type="checkbox" checked={!!records[today]?.includes(id)} onChange={()=>toggle(id)}/><span className="dashboard-checkmark">{records[today]?.includes(id)?'✓':''}</span><span>{LABELS[id]}</span></label>)}</div>
  <p className="dashboard-footer-note">자정이 지나면 다음 세트로 바뀌고 지난 기록은 일정에 보관돼요.</p>
 </>}
 {tab==='calendar'&&<>
  <div className="dashboard-heading"><div><span className="dashboard-overline">CALENDAR</span><h1>운동 체크 일정</h1></div></div>
  <div className="dashboard-calendar">
   <div className="dashboard-month"><button type="button" onClick={()=>changeMonth(-1)} aria-label="이전 달">‹</button><strong>{month.replace('-','년 ')}월</strong><button type="button" onClick={()=>changeMonth(1)} aria-label="다음 달">›</button></div>
   <div className="dashboard-days">{WEEKDAYS.map((day,i)=><b key={i}>{day}</b>)}{days.map((day,i)=>day?<button type="button" key={day} className={'dashboard-day '+(day===selected?'selected ':'')+(day===today?'today':'')} onClick={()=>setSelected(day)}><span>{Number(day.slice(-2))}</span><small>{count(records,day)||''}</small></button>:<span key={'empty-'+i}/>)}</div>
  </div>
  <div className="dashboard-day-detail"><h2>{selected} <span>{selectedDone} / 4</span></h2><div className="dashboard-list">{selectedList.map(id=><div key={id} className={'dashboard-check dashboard-readonly '+(records[selected]?.includes(id)?'is-done':'')}><span className="dashboard-checkmark">{records[selected]?.includes(id)?'✓':''}</span><span>{LABELS[id]}</span></div>)}</div></div>
 </>}
 {tab==='analysis'&&<>
  <div className="dashboard-heading"><div><span className="dashboard-overline">LAST 7 DAYS</span><h1>7일 체크 분석</h1></div><span className="dashboard-count">{weeklyTotal} / 28</span></div>
  <p className="dashboard-hint">오늘 포함 최근 7일 · 하루 최대 4개</p>
  <div className="dashboard-week-chart">{lastSeven.map(day=><div key={day} className="dashboard-week-col"><strong>{count(records,day)}</strong><div className="dashboard-week-track"><div style={{height:(count(records,day)*25)+'%'}}/></div><span>{parseDate(day).getMonth()+1}/{parseDate(day).getDate()}</span><small>{WEEKDAYS[parseDate(day).getDay()]}</small></div>)}</div>
  <div className="dashboard-week-summary"><span>7일 완료 횟수</span><strong>{weeklyTotal}개</strong></div>
 </>}
 </section>;
}
