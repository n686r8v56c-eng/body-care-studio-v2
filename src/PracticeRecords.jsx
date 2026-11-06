import React,{useMemo} from 'react';
import './PracticeRecords.css';
const localDay=(date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const minutes=(s)=>{const m=Math.max(0,Number(s)||0)/60;return (m===0?'0':m<10?String(Math.round(m*10)/10):String(Math.round(m)))+'분'};
function WeekChart({name,kind,goal,logs,color}){
 const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);const key=localDay(d);return {key,label:(d.getMonth()+1)+'/'+d.getDate(),seconds:Number(logs.find(x=>x.date===key)?.[kind]||0)}}),[logs,kind]);
 const maxMinutes=Math.max(goal,5,...days.map(d=>d.seconds/60));
 const width=560,left=18,right=10,top=40,bottom=38,h=175,chartWidth=width-left-right;
 const y=minutes=>top+h-(minutes/maxMinutes)*h;
 const goalY=y(goal);
 const barWidth=42;
 return <section className="practice-week">
  <div className="practice-week-title"><strong>{name} · 최근 7일 연습량</strong><span>목표 {goal}분/일</span></div>
  <svg className="practice-chart" viewBox="0 0 560 268" role="img" aria-label={name+' 최근 7일 연습 시간과 '+goal+'분 목표 실선'}>
   <line x1={left} y1={goalY} x2={width-right} y2={goalY} stroke={color} strokeWidth="2.4"/>
   <text x={width-right} y={Math.max(15,goalY-9)} fill={color} textAnchor="end" fontSize="13" fontWeight="700">목표 {goal}분</text>
   <line x1={left} y1={top+h} x2={width-right} y2={top+h} stroke="#e6e0eb" strokeWidth="1.5"/>
   {days.map((d,i)=>{const x=left+((i+.5)/7)*chartWidth,amount=d.seconds/60,barH=(amount/maxMinutes)*h;return <g key={d.key}>
    {amount>0&&<rect x={x-barWidth/2} y={top+h-barH} width={barWidth} height={barH} rx="7" fill={color}/>}
    <text x={x} y={Math.max(top+17,top+h-barH-10)} fill={color} textAnchor="middle" fontSize="14" fontWeight="700">{amount===0?'0':Math.round(amount*10)/10}</text>
    <text x={x} y={top+h+26} fill="#887d95" textAnchor="middle" fontSize="13">{d.label}</text>
   </g>})}
  </svg>
  <p>실선은 하루 목표 시간 · 막대는 실제 타이머 실행 시간</p>
 </section>
}
export default function PracticeRecords({logs=[],area='face'}){
 const body=area!=='face';
 const categories=body?[{name:'순환',kind:'circulation',goal:30,color:'#916fcb',cls:'face'},{name:'근력',kind:'strength',goal:30,color:'#46ae9c',cls:'voice'},{name:'헬스',kind:'gym',goal:30,color:'#d6a152',cls:'gym'}]:[{name:'Face',kind:'face',goal:30,color:'#916fcb',cls:'face'},{name:'Voice',kind:'voice',goal:20,color:'#46ae9c',cls:'voice'}];
 const today=localDay(new Date());
 const current=logs.find(x=>x.date===today)||{};
 return <div className="practice-records">
  <h1>기록</h1>
  <h2>오늘의 연습</h2>
  <div className={'practice-today'+(body?' practice-today-three':'')}>
   {categories.map(c=><div key={c.kind} className={'practice-today-'+c.cls}><span>{c.name} 연습량</span><strong>{minutes(current[c.kind])}</strong><small>목표 {c.goal}분</small></div>)}
  </div>
  {categories.map(c=><WeekChart key={c.kind} name={c.name} kind={c.kind} goal={c.goal} logs={logs} color={c.color}/>)}
 </div>
}
