import React,{useEffect,useMemo,useRef,useState} from 'react';
const KEY='movement-flow-poses-v1';
const BASE={pelvis:[0,0,0],chest:[0,1.2,0],neck:[0,1.65,0],head:[0,2.05,0],lShoulder:[-.43,1.48,0],rShoulder:[.43,1.48,0],lElbow:[-.82,.92,0],rElbow:[.82,.92,0],lHand:[-1.05,.38,0],rHand:[1.05,.38,0],lHip:[-.24,-.18,0],rHip:[.24,-.18,0],lKnee:[-.32,-1.05,.12],rKnee:[.32,-1.05,.12],lFoot:[-.35,-1.85,.3],rFoot:[.35,-1.85,.3]};
const BONES=[['pelvis','chest'],['chest','neck'],['neck','head'],['chest','lShoulder'],['chest','rShoulder'],['lShoulder','lElbow'],['rShoulder','rElbow'],['lElbow','lHand'],['rElbow','rHand'],['pelvis','lHip'],['pelvis','rHip'],['lHip','lKnee'],['rHip','rKnee'],['lKnee','lFoot'],['rKnee','rFoot']];
const copy=x=>JSON.parse(JSON.stringify(x));
const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
const views={front:[0,0],side:[Math.PI/2,0],top:[0,Math.PI/2],free:[.65,.4]};
function project(p,view){const [yaw,pitch]=view;const x=p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),z=-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);return [x,z*Math.sin(pitch)+p[1]*Math.cos(pitch),z*Math.cos(pitch)-p[1]*Math.sin(pitch)]}
export default function MovementFlow(){
 const [poses,setPoses]=useState(load),[points,setPoints]=useState(()=>copy(BASE)),[view,setView]=useState(views.free),[selected,setSelected]=useState(null),[name,setName]=useState('새 동작'),[cue,setCue]=useState(''),[sequence,setSequence]=useState([]),[activeId,setActiveId]=useState(null),[mode,setMode]=useState('joint');
 const svg=useRef(null),drag=useRef(null);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(poses))}catch{}},[poses]);
 const projected=useMemo(()=>Object.fromEntries(Object.entries(points).map(([k,p])=>[k,project(p,view)])),[points,view]);
 const xy=p=>[200+p[0]*77,190-p[1]*77];
 const move=e=>{if(!drag.current||!svg.current)return;const rect=svg.current.getBoundingClientRect(),dx=(e.clientX-drag.current.x)/rect.width*400/77,dy=-(e.clientY-drag.current.y)/rect.height*380/77;
 if(drag.current.kind==='camera'){setView(v=>[v[0]+dx*.8,Math.max(-Math.PI/2,Math.min(Math.PI/2,v[1]+dy*.8))])}
 else{const k=drag.current.key;const [yaw,pitch]=view;setPoints(prev=>{const next=copy(prev),p=next[k];const horizontal=dx*Math.cos(yaw),depth=dx*Math.sin(yaw),vertical=dy*Math.cos(pitch),depthV=dy*Math.sin(pitch);next[k]=[p[0]+horizontal,p[1]+vertical,p[2]+depth+depthV];return next})}
 drag.current.x=e.clientX;drag.current.y=e.clientY};
 const stop=e=>{drag.current=null;try{svg.current?.releasePointerCapture(e.pointerId)}catch{}};
 const save=()=>{const id=activeId||String(Date.now());setPoses(prev=>[{id,name:name.trim()||'새 동작',cue,points:copy(points),updatedAt:new Date().toISOString()},...prev.filter(p=>p.id!==id)]);setActiveId(id)};
 const open=p=>{setPoints(copy(p.points));setName(p.name);setCue(p.cue||'');setActiveId(p.id)};
 const reset=()=>{setPoints(copy(BASE));setName('새 동작');setCue('');setActiveId(null)};
 const exportJson=()=>{const blob=new Blob([JSON.stringify({version:1,poses,sequence},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='movement-flow.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 return <section style={{maxWidth:850,margin:'0 auto',padding:'12px 12px 90px',display:'grid',gap:12}}>
 <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><h2 style={{margin:0}}>Movement Flow</h2><button type="button" onClick={exportJson}>JSON 백업</button></header>
 <p style={{margin:0,fontSize:13,opacity:.7}}>관절을 끌어 자세를 바꾸고 빈 공간을 끌어 360° 회전하세요. 저장 데이터는 이 기기에 보관됩니다.</p>
 <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Object.entries(views).map(([key,value])=><button type="button" key={key} onClick={()=>setView(value)}>{({front:'정면',side:'측면',top:'탑다운',free:'자유회전'})[key]}</button>)}<button type="button" onClick={()=>setMode(v=>v==='joint'?'camera':'joint')}>{mode==='joint'?'관절 편집':'카메라 모드'}</button><button type="button" onClick={()=>setPoints(copy(BASE))}>자세 초기화</button></div>
 <div style={{background:'#f7f7fb',borderRadius:16,overflow:'hidden',touchAction:'none'}}>
 <svg ref={svg} viewBox="0 0 400 380" style={{display:'block',width:'100%',height:'min(70vh,480px)',touchAction:'none'}} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerDown={e=>{if(e.target===svg.current||e.target.dataset.background){drag.current={kind:'camera',x:e.clientX,y:e.clientY};svg.current.setPointerCapture(e.pointerId)}}}>
 <rect width="400" height="380" fill="#f7f7fb" data-background="true"/>
 <circle cx="200" cy="190" r="150" fill="none" stroke="#e0dfea" strokeDasharray="4 7"/>

 {(()=>{const ch=projected.chest,pe=projected.pelvis,ls=projected.lShoulder,rs=projected.rShoulder;const [cx,cy]=xy(ch),[px,py]=xy(pe),[lx,ly]=xy(ls),[rx,ry]=xy(rs);const front=project([0,1.2,.3],view),back=project([0,1.2,-.3],view);const [fx,fy]=xy(front),[bx,by]=xy(back);return <g pointerEvents="none"><polygon points={`${lx},${ly} ${rx},${ry} ${px+16},${py} ${px-16},${py}`} fill="#c6b1e8" fillOpacity=".27" stroke="#a68acb" strokeWidth="1.5"/><line x1={cx} y1={cy} x2={px} y2={py} stroke="#aa80d0" strokeDasharray="4 4" strokeWidth="3"/><circle cx={px} cy={py-19} r="3" fill="#7955a7"/><text x={cx+13} y={cy+4} fontSize="11" fill="#735397">가슴</text><text x={px+15} y={py-4} fontSize="11" fill="#735397">배</text><line x1={cx} y1={cy} x2={fx} y2={fy} stroke="#2f9a85" strokeWidth="3" strokeLinecap="round"/><circle cx={fx} cy={fy} r="4" fill="#2f9a85"/><text x={fx+6} y={fy-7} fontSize="10" fill="#238875">앞</text><line x1={cx} y1={cy} x2={bx} y2={by} stroke="#d58b54" strokeDasharray="3 3" strokeWidth="2"/><text x={bx+5} y={by+13} fontSize="10" fill="#bd7542">등</text></g>})()}
 {(()=>{const head=projected.head;const [hx,hy]=xy(head);const f=project([0,2.05,.22],view),[fx,fy]=xy(f);return <g pointerEvents="none"><ellipse cx={hx} cy={hy} rx="19" ry="23" fill="#e8d9f8" stroke="#7554a0" strokeWidth="2"/><circle cx={fx-4} cy={fy-2} r="2.6" fill="#443654"/><circle cx={fx+4} cy={fy-2} r="2.6" fill="#443654"/><path d={`M ${fx-3} ${fy+5} Q ${fx} ${fy+8} ${fx+3} ${fy+5}`} stroke="#443654" strokeWidth="1.5" fill="none"/></g>})()}
 {BONES.map(([a,b])=>{const [x1,y1]=xy(projected[a]),[x2,y2]=xy(projected[b]);return <line key={a+b} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38324e" strokeWidth="6" strokeLinecap="round" pointerEvents="none"/>})}
 {Object.entries(projected).map(([k,p])=>{const [cx,cy]=xy(p);return <circle key={k} cx={cx} cy={cy} r={selected===k?11:8} fill={selected===k?'#a56af0':'#fff'} stroke="#7554a0" strokeWidth="3" onPointerDown={e=>{e.stopPropagation();setSelected(k);drag.current={kind:mode==='camera'?'camera':'joint',key:k,x:e.clientX,y:e.clientY};svg.current.setPointerCapture(e.pointerId)}}/>})}
 </svg></div>
 <small>선택 관절: {selected||'없음'} · 손가락으로 위치를 대략 조절하는 스케치 모드 (해부학적 관절 제한·IK 미적용)</small>
 <label>동작 이름<input style={{display:'block',width:'100%',padding:10,boxSizing:'border-box'}} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>큐잉 노트<textarea style={{display:'block',width:'100%',minHeight:110,padding:10,boxSizing:'border-box'}} placeholder="고정할 부위, 회전 방향, 호흡, 몸의 감각..." value={cue} onChange={e=>setCue(e.target.value)}/></label>
 <div style={{display:'flex',gap:8}}><button type="button" onClick={save}>포즈 저장</button><button type="button" onClick={reset}>새 포즈</button></div>
 <h3 style={{marginBottom:0}}>포즈 라이브러리 ({poses.length})</h3>
 {poses.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid #ddd',padding:'8px 0'}}><button type="button" onClick={()=>open(p)} style={{flex:1,textAlign:'left'}}>{p.name}</button><button type="button" onClick={()=>setSequence(v=>[...v,p.id])}>시퀀스 +</button><button type="button" onClick={()=>{if(window.confirm('이 포즈를 삭제할까요?')){setPoses(v=>v.filter(x=>x.id!==p.id));setSequence(v=>v.filter(x=>x!==p.id))}}}>삭제</button></div>)}
 <h3 style={{marginBottom:0}}>동작 시퀀스</h3>
 <p style={{margin:0,fontSize:13,opacity:.7}}>라이브러리에서 순서대로 추가하고, 각 단계를 눌러 포즈와 큐잉을 확인하세요.</p>
 {sequence.map((id,i)=>{const p=poses.find(x=>x.id===id);return <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}><button type="button" style={{flex:1,textAlign:'left'}} onClick={()=>p&&open(p)}>{i+1}. {p?.name||'삭제된 포즈'}</button><button type="button" disabled={!i} onClick={()=>setSequence(v=>{const a=[...v];[a[i-1],a[i]]=[a[i],a[i-1]];return a})}>↑</button><button type="button" disabled={i===sequence.length-1} onClick={()=>setSequence(v=>{const a=[...v];[a[i+1],a[i]]=[a[i],a[i+1]];return a})}>↓</button><button type="button" onClick={()=>setSequence(v=>v.filter((_,j)=>j!==i))}>×</button></div>})}
 </section>
}