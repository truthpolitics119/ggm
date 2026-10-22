export default function Loading() {
  return <div aria-label="Loading page" className="grid" style={{gap:18}}>
    <div className="skeleton" style={{height:30,width:240}}/>
    <div className="grid kpi-grid">{[1,2,3,4,5].map((i)=><div className="card kpi-card" key={i}><div className="skeleton" style={{width:"55%"}}/><div className="skeleton" style={{width:"72%",height:28,marginTop:18}}/></div>)}</div>
    <div className="grid dashboard-grid"><div className="card card-pad"><div className="skeleton" style={{height:250}}/></div><div className="card card-pad"><div className="skeleton" style={{height:250}}/></div></div>
  </div>;
}
