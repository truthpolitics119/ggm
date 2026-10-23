"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DashboardCharts({ cities }: { cities: { city: string; total: number; active: number }[] }) {
  const data = cities.map((c) => ({ ...c, share: c.total ? Math.round(c.active / c.total * 100) : 0 }));
  if (!data.length) return <div className="empty-state">City chart will appear when retailers are imported.</div>;
  return <div className="chart-wrap" style={{marginTop:18}}><ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{top:5,right:8,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#302b1e"/>
      <XAxis dataKey="city" tick={{fontSize:10,fill:"#a69d88"}} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={52}/>
      <YAxis domain={[0,100]} tickFormatter={(v:number)=>`${v}%`} tick={{fontSize:10,fill:"#a69d88"}} axisLine={false} tickLine={false}/>
      <Tooltip contentStyle={{background:"#11100d",border:"1px solid #393322",borderRadius:8,color:"#f0eadb"}} formatter={(value) => [`${value}%`, "Active share"]}/><Bar dataKey="share" fill="#d4af37" radius={[5,5,0,0]} maxBarSize={44}/>
    </BarChart>
  </ResponsiveContainer></div>;
}
