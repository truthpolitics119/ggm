import { Activity, ArrowRight, Building2, CircleDollarSign, MapPin, Percent, Users } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard-charts";
import { getActiveUser } from "@/lib/auth";
import { currency, dateTime } from "@/lib/format";
import { getEffectiveStatus, type Retailer, type RetailerInteraction } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase } = await getActiveUser();
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: retailers, error: retailerError }, { data: interactions, error: interactionError }, { data: recentActivity, error: activityError }] = await Promise.all([
    supabase.from("retailers").select("id,customer_id,name,username,street,house_number,postal_code,city,mobile,balance,latitude,longitude,status_override,assigned_to,created_at,updated_at"),
    supabase.from("retailer_interactions").select("id,retailer_id,user_id,type,note,status_before,status_after,created_at,profile:profiles(full_name),retailer:retailers(name,city)").order("created_at", { ascending: false }).limit(8),
    supabase.rpc("recently_interacted_retailer_ids", { p_since: cutoff }),
  ]);
  if (retailerError || interactionError || activityError) throw new Error(retailerError?.message ?? interactionError?.message ?? activityError?.message);
  const rows = (retailers ?? []) as Retailer[];
  const active = rows.filter((r) => getEffectiveStatus(r) === "active");
  const byCity = new Map<string, { city: string; total: number; active: number }>();
  rows.forEach((r) => {
    const city = r.city || "Unspecified";
    const item = byCity.get(city) ?? { city, total: 0, active: 0 };
    item.total++; if (getEffectiveStatus(r) === "active") item.active++; byCity.set(city, item);
  });
  const cities = Array.from(byCity.values()).sort((a, b) => b.total - a.total).slice(0, 7);
  const recent = (interactions ?? []) as unknown as (RetailerInteraction & { retailer?: { name: string; city: string | null } })[];
  const recentIds = new Set(((recentActivity ?? []) as { retailer_id: string }[]).map((i) => i.retailer_id));
  const followup = rows.filter((r) => getEffectiveStatus(r) === "inactive" && !recentIds.has(r.id)).slice(0, 6);
  const metrics = [
    { label: "Total retailers", value: rows.length.toLocaleString(), note: "Retailers in your network", icon: Users, tone: "blue" },
    { label: "Active", value: active.length.toLocaleString(), note: "Positive balance or manually active", icon: Activity, tone: "green" },
    { label: "Inactive", value: (rows.length - active.length).toLocaleString(), note: "Prioritize a follow-up", icon: Building2, tone: "red" },
    { label: "Active rate", value: `${rows.length ? Math.round(active.length / rows.length * 100) : 0}%`, note: "Of all retailers", icon: Percent, tone: "blue" },
    { label: "Total balance", value: currency(rows.reduce((sum, r) => sum + Number(r.balance), 0)), note: "Current account balances", icon: CircleDollarSign, tone: "gold" },
  ];
  return <div>
    <div className="page-heading"><div><h1>Dashboard</h1><p>Your retailer network at a glance.</p></div><Link className="btn secondary" href="/retailers">Explore retailers <ArrowRight size={16}/></Link></div>
    {!rows.length && <div className="error-box" style={{marginBottom:16}}>No retailer data is available yet. Ask an administrator to import a CSV.</div>}
    <div className="grid kpi-grid">{metrics.map((m) => <article className="card kpi-card" key={m.label}><div className="kpi-top"><span>{m.label}</span><span className={`kpi-icon ${m.tone}`}><m.icon size={18}/></span></div><div className="kpi-value">{m.value}</div><div className="kpi-foot">{m.note}</div></article>)}</div>
    <div className="grid dashboard-grid">
      <section className="card card-pad"><div className="row-between"><div><h2 style={{fontSize:16,margin:"0 0 4px"}}>Retailer activity by city</h2><span className="muted small">Active share across your largest cities</span></div><MapPin size={18} color="#718197"/></div><DashboardCharts cities={cities}/></section>
      <section className="card card-pad"><div className="row-between"><div><h2 style={{fontSize:16,margin:"0 0 4px"}}>Recent interactions</h2><span className="muted small">Latest retailer touchpoints</span></div><Activity size={18} color="#718197"/></div>
        <div style={{marginTop:18}}>{recent.length ? recent.slice(0,6).map((item) => <Link key={item.id} href={`/retailers/${item.retailer_id}`} className="row" style={{alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid #edf0f4"}}>
          <span className="kpi-icon"><Activity size={15}/></span><span style={{flex:1}}><strong>{item.retailer?.name ?? "Retailer"}</strong><span className="muted small" style={{display:"block",textTransform:"capitalize"}}>{item.type} · {item.profile?.full_name ?? "Team member"}</span></span><span className="muted small">{dateTime(item.created_at)}</span>
        </Link>) : <div className="empty-state">No interactions have been logged yet.</div>}</div>
      </section>
      <section className="card card-pad" style={{gridColumn:"1 / -1"}}><div className="row-between"><div><h2 style={{fontSize:16,margin:"0 0 4px"}}>Needs follow-up</h2><span className="muted small">Inactive retailers with no interaction in the last 30 days</span></div><Link className="row small" href="/retailers?status=inactive" style={{color:"var(--blue)"}}>View all <ArrowRight size={14}/></Link></div>
        {followup.length ? <div className="table-wrap" style={{marginTop:12}}><table className="data-table"><thead><tr><th>Retailer</th><th>City</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>{followup.map((r) => <tr key={r.id}><td><Link href={`/retailers/${r.id}`}><strong>{r.name}</strong></Link></td><td>{r.city || "—"}</td><td>{currency(r.balance)}</td><td><span className="status-badge inactive"><i className="status-dot"/>Inactive</span></td><td><Link className="btn secondary" href={`/retailers/${r.id}`}>Open</Link></td></tr>)}</tbody></table></div> : <div className="empty-state">No inactive retailers are overdue for follow-up.</div>}
      </section>
    </div>
  </div>;
}
