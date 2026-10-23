"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, LoaderCircle, X } from "lucide-react";
import type { RetailerVisit } from "@/lib/types";
import { dateTime } from "@/lib/format";

export function RetailerVisits({ retailerId, initialVisits }: { retailerId: string; initialVisits: RetailerVisit[] }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  async function request(url: string, body: object, method: "POST" | "PATCH") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update the visit plan.");
      setNotice("Visit plan updated.");
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the visit plan.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function schedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      setError("Choose a future date and time.");
      return;
    }
    if (await request(`/api/retailers/${retailerId}/visits`, {
      scheduled_at: new Date(scheduledAt).toISOString(),
      note,
    }, "POST")) {
      setScheduledAt("");
      setNote("");
    }
  }

  return <section className="card card-pad visit-manager">
    <div className="row-between"><div><h2 className="section-title">Visit programme</h2><span className="muted small">Plan and track retailer visits.</span></div><CalendarClock size={19} className="map-gold"/></div>
    <form className="visit-form" onSubmit={schedule}>
      <div className="field"><label htmlFor="visit-date">Visit date and time</label><input id="visit-date" className="input" type="datetime-local" required value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)}/></div>
      <div className="field"><label htmlFor="visit-note">Agenda or note <span className="muted">(optional)</span></label><textarea id="visit-note" className="textarea" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Topics, goals, or preparation"/></div>
      {error && <div role="alert" className="error-box">{error}</div>}
      {notice && <div role="status" className="success-box">{notice}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy && <LoaderCircle size={15} className="animate-spin"/>}Schedule visit</button>
    </form>
    <div className="visit-list">
      <h3>Upcoming and past visits</h3>
      {initialVisits.length ? initialVisits.map((visit) => <article className="visit-item" key={visit.id}>
        <div className="visit-item-copy"><strong>{dateTime(visit.scheduled_at)}</strong><span className={`visit-status ${visit.status}`}>{visit.status}</span>{visit.note && <p>{visit.note}</p>}</div>
        {visit.status === "planned" && <div className="row visit-actions">
          <button className="icon-btn" aria-label="Mark visit complete" title="Mark complete" disabled={busy} onClick={() => request(`/api/retailers/${retailerId}/visits`, { visit_id: visit.id, status: "completed" }, "PATCH")}><Check size={16}/></button>
          <button className="icon-btn" aria-label="Cancel visit" title="Cancel visit" disabled={busy} onClick={() => request(`/api/retailers/${retailerId}/visits`, { visit_id: visit.id, status: "cancelled" }, "PATCH")}><X size={16}/></button>
        </div>}
      </article>) : <div className="empty-state">No visits planned yet.</div>}
    </div>
  </section>;
}
