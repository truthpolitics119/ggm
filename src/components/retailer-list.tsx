"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Retailer } from "@/lib/types";
import { currency, formatPhoneNumber } from "@/lib/format";

type ProfileOption = { id: string; full_name: string };
const PAGE_SIZE = 12;

export function RetailerList({ retailers, profiles, initialStatus }: { retailers: Retailer[]; profiles: ProfileOption[]; initialStatus: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [city, setCity] = useState("");
  const [assigned, setAssigned] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return retailers.filter((r) =>
      (!q || [r.name, r.username, r.city, r.customer_id, r.mobile].some((v) => String(v ?? "").toLocaleLowerCase().includes(q))) &&
      (status === "all" || r.effective_status === status) && (!city || r.city === city) &&
      (!assigned || r.assigned_to === assigned) && (min === "" || Number(r.balance) >= Number(min)) &&
      (max === "" || Number(r.balance) <= Number(max)),
    ).sort((a,b) => sort === "balance" ? Number(b.balance)-Number(a.balance) : sort === "city" ? (a.city ?? "").localeCompare(b.city ?? "") : a.name.localeCompare(b.name));
  }, [retailers, query, status, city, assigned, min, max, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function setFilter(fn: () => void) { fn(); setPage(1); }
  return <div>
    <div className="page-heading"><div><h1>Retailers</h1><p>Find retailers, check status, and follow up.</p></div></div>
    <div className="card" style={{marginBottom:15}}><div className="filter-grid">
      <div className="field search-field"><label htmlFor="retailer-search">Search retailers</label><div style={{position:"relative"}}><Search size={17} style={{position:"absolute",top:12,left:12,color:"#a69d88"}}/><input id="retailer-search" className="input" style={{paddingLeft:38}} value={query} onChange={(e)=>setFilter(()=>setQuery(e.target.value))} placeholder="Name, customer ID, username or phone"/></div></div>
      <div className="field"><label htmlFor="filter-status">Status</label><select id="filter-status" className="select" value={status} onChange={(e)=>setFilter(()=>setStatus(e.target.value))}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <div className="field"><label htmlFor="filter-city">City</label><select id="filter-city" className="select" value={city} onChange={(e)=>setFilter(()=>setCity(e.target.value))}><option value="">All cities</option>{Array.from(new Set(retailers.map((r)=>r.city).filter(Boolean))).sort().map((c)=><option key={c} value={c!}>{c}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-assigned">Assigned user</label><select id="filter-assigned" className="select" value={assigned} onChange={(e)=>setFilter(()=>setAssigned(e.target.value))}><option value="">All users</option>{profiles.map((p)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-sort">Sort by</label><select id="filter-sort" className="select" value={sort} onChange={(e)=>setSort(e.target.value)}><option value="name">Name</option><option value="city">City</option><option value="balance">Highest balance</option></select></div>
      <div className="field"><label htmlFor="filter-min">Min balance (€)</label><input id="filter-min" type="number" min="0" className="input" value={min} onChange={(e)=>setFilter(()=>setMin(e.target.value))} placeholder="Any"/></div>
      <div className="field"><label htmlFor="filter-max">Max balance (€)</label><input id="filter-max" type="number" min="0" className="input" value={max} onChange={(e)=>setFilter(()=>setMax(e.target.value))} placeholder="Any"/></div>
    </div></div>
    <div className="row-between" style={{margin:"0 2px 11px"}}><span className="muted small">{filtered.length} retailers <SlidersHorizontal size={13} style={{verticalAlign:"-2px",marginLeft:4}}/></span><span className="muted small">Page {page} of {pageCount}</span></div>
    <section className="card retailer-table"><div className="table-wrap"><table className="data-table"><thead><tr><th>Retailer</th><th>City</th><th>Phone</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>
      {visible.map((r)=><tr key={r.id}><td><Link href={`/retailers/${r.id}`}><strong>{r.name}</strong><span className="muted small" style={{display:"block"}}>#{r.customer_id} · {r.username}</span></Link></td><td>{r.city || "—"}</td><td>{formatPhoneNumber(r.mobile)}</td><td>{currency(r.balance)}</td><td><span className={`status-badge ${r.effective_status}`}><i className="status-dot"/>{r.effective_status}</span></td><td><Link className="btn secondary" href={`/retailers/${r.id}`}>Details</Link></td></tr>)}
      {!visible.length && <tr><td colSpan={6}><div className="empty-state">No retailers match your filters.</div></td></tr>}</tbody></table></div></section>
    <section className="retailer-grid" style={{display:"none"}}>
      {visible.map((r)=><Link key={r.id} href={`/retailers/${r.id}`} className="card retailer-card"><div className="retailer-card-top"><div><h3>{r.name}</h3><span className="muted small">#{r.customer_id} · {r.city}</span></div><span className={`status-badge ${r.effective_status}`}>{r.effective_status}</span></div><div className="row-between"><span className="muted small">{r.mobile ? formatPhoneNumber(r.mobile) : "No phone"}</span><strong>{currency(r.balance)}</strong></div></Link>)}
    </section>
    <div className="card pagination"><span>Showing {filtered.length ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</span><div className="row"><button className="btn secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button><button className="btn secondary" disabled={page>=pageCount} onClick={()=>setPage(page+1)}>Next</button></div></div>
  </div>;
}
