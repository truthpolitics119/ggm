"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import type { Retailer, RetailerInteraction, InteractionType } from "@/lib/types";
import { ToastMessage } from "@/components/toast-message";

export function RetailerActivity({ retailer, initialInteractions }: { retailer: Retailer; initialInteractions: RetailerInteraction[] }) {
  const [type, setType] = useState<InteractionType>("visit");
  const [note, setNote] = useState("");
  const [markVisited, setMarkVisited] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<Retailer["status_override"]>(retailer.status_override);
  const router = useRouter();
  const effectiveStatus = status ?? (Number(retailer.balance) > 0 ? "active" : "inactive");

  async function send(url: string, body: object) {
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");
      setNotice("Saved successfully."); router.refresh();
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); return false; }
    finally { setLoading(false); }
  }
  async function log(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (type === "status") return;
    if (await send(`/api/retailers/${retailer.id}/interactions`, { type, note, mark_visited: type === "visit" || markVisited })) {
      setNote(""); setMarkVisited(true);
    }
  }
  async function changeStatus(next: "active" | "inactive") {
    if (await send(`/api/retailers/${retailer.id}/status`, { status: next, note: "Status updated from retailer profile." })) setStatus(next);
  }
  return <div className="grid" style={{gap:14}}>
    <ToastMessage message={notice}/>
    <section className="card card-pad"><h2 style={{margin:"0 0 13px",fontSize:17}}>Update status</h2><p className="muted small">Current effective status: <strong style={{textTransform:"capitalize"}}>{effectiveStatus}</strong>. A manual choice stays in place when balance data is imported again.</p>
      <div className="row" style={{flexWrap:"wrap"}}><button className={`btn ${effectiveStatus === "active" ? "" : "secondary"}`} disabled={loading || status === "active"} onClick={()=>changeStatus("active")}><Check size={16}/>Mark as active</button><button className={`btn ${effectiveStatus === "inactive" ? "danger" : "secondary"}`} disabled={loading || status === "inactive"} onClick={()=>changeStatus("inactive")}>Mark as inactive</button></div>
    </section>
    <section className="card card-pad"><h2 style={{margin:"0 0 14px",fontSize:17}}>Log interaction</h2><form onSubmit={log} className="grid" style={{gap:12}}>
      <div className="field"><label htmlFor="interaction-type">Interaction type</label><select id="interaction-type" className="select" value={type} onChange={(e)=>setType(e.target.value as InteractionType)}>{(["visit","call","whatsapp","email","transaction","other"] as const).map((t)=><option value={t} key={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}</select></div>
      <div className="field"><label htmlFor="interaction-note">Note <span className="muted">(optional)</span></label><textarea id="interaction-note" className="textarea" maxLength={2000} value={note} onChange={(e)=>setNote(e.target.value)} placeholder="What was discussed or agreed?"/></div>
      <label className="row small"><input type="checkbox" checked={type === "visit" || markVisited} disabled={type === "visit"} onChange={(e)=>setMarkVisited(e.target.checked)}/> Mark retailer as visited</label>
      {error && <div role="alert" className="error-box">{error}</div>}
      <button className="btn" type="submit" disabled={loading}>{loading && <LoaderCircle size={15} className="animate-spin"/>}Save interaction</button>
    </form></section>
  </div>;
}
