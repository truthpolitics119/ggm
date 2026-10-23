import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, MessageCircle, Navigation } from "lucide-react";
import { getActiveUser } from "@/lib/auth";
import { currency, dateTime, formatPhoneNumber, phoneNumberDigits } from "@/lib/format";
import type { Retailer, RetailerInteraction } from "@/lib/types";
import { RetailerActivity } from "@/components/retailer-activity";
import { RetailerVisits } from "@/components/retailer-visits";
import { AssignmentManager } from "@/components/assignment-manager";
import type { RetailerVisit } from "@/lib/types";

export default async function RetailerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getActiveUser();
  const [{ data, error }, { data: interactions, error: historyError }, { data: visits, error: visitsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("retailers").select("*").eq("id", id).maybeSingle(),
    supabase.from("retailer_interactions").select("id,retailer_id,user_id,type,note,status_before,status_after,created_at,profile:profiles(full_name)").eq("retailer_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("retailer_visits").select("id,retailer_id,created_by,scheduled_at,note,status,completed_at,created_at").eq("retailer_id", id).order("scheduled_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("id,full_name").eq("is_active", true).order("full_name"),
  ]);
  if (error || historyError || visitsError || profilesError) throw new Error(error?.message ?? historyError?.message ?? visitsError?.message ?? profilesError?.message);
  if (!data) notFound();
  const retailer = data as Retailer;
  const status = retailer.status_override ?? (Number(retailer.balance) > 0 ? "active" : "inactive");
  const phone = phoneNumberDigits(retailer.mobile);
  const address = [retailer.street, retailer.house_number, retailer.postal_code, retailer.city].filter(Boolean).join(", ");
  return <div>
    <div className="page-heading"><div><Link className="row small muted" href="/retailers" style={{marginBottom:12}}><ArrowLeft size={15}/> Back to retailers</Link><h1>{retailer.name}</h1><p>Customer #{retailer.customer_id}{retailer.username ? ` · ${retailer.username}` : ""}</p></div><span className={`status-badge ${status}`}><i className="status-dot"/>{status}</span></div>
    <div className="grid dashboard-grid detail-layout">
      <section className="card card-pad"><div className="row-between"><h2 style={{margin:"0 0 18px",fontSize:17}}>Retailer profile</h2><strong style={{fontSize:22}}>{currency(retailer.balance)}</strong></div>
        <div className="grid" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:15}}>
          <div><span className="muted small">Username</span><div>{retailer.username || "—"}</div></div><div><span className="muted small">Status source</span><div>{retailer.status_override ? "Manual override" : "Balance rule"}</div></div>
          <div><span className="muted small">Visit status</span><div>{retailer.visited_at ? `Visited ${dateTime(retailer.visited_at)}` : "Not yet visited"}</div></div>
          <div style={{gridColumn:"1/-1"}}><span className="muted small">Address</span><div className="row"><MapPin size={16} color="#d4af37"/>{address || "Address not provided"}</div></div>
          <div><span className="muted small">Mobile</span><div>{formatPhoneNumber(retailer.mobile)}</div></div><div><span className="muted small">Assigned to</span><AssignmentManager retailerId={retailer.id} assignedTo={retailer.assigned_to} profiles={profiles ?? []} canManage={profile.role === "admin"}/></div>
          <div><span className="muted small">Last status change</span><div>{retailer.status_changed_at ? dateTime(retailer.status_changed_at) : "No manual change"}</div></div>
        </div>
        <div className="row" style={{marginTop:20,flexWrap:"wrap"}}>
          {phone && <><a className="btn" href={`tel:+${phone}`}><Phone size={16}/>Call</a><a className="btn secondary" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a></>}
          {retailer.latitude && retailer.longitude && <a className="btn secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${retailer.latitude},${retailer.longitude}`}><Navigation size={16}/>Directions</a>}
        </div>
      </section>
      <RetailerActivity retailer={retailer} initialInteractions={(interactions ?? []) as unknown as RetailerInteraction[]}/>
      <RetailerVisits retailerId={retailer.id} initialVisits={(visits ?? []) as RetailerVisit[]}/>
      <section className="card card-pad" style={{gridColumn:"1/-1"}}><div className="row-between"><div><h2 style={{margin:"0 0 5px",fontSize:17}}>Interaction history</h2><span className="muted small">Status changes and team follow-ups</span></div><span className="muted small">{interactions?.length ?? 0} records</span></div>
        <div className="timeline" style={{marginTop:20}}>{interactions?.length ? interactions.map((item) => <div className="timeline-item" key={item.id}><div className="timeline-rail"><i className="timeline-marker"/></div><div><div className="row-between"><strong style={{textTransform:"capitalize"}}>{item.type}{item.status_after ? ` · ${item.status_before ?? "—"} → ${item.status_after}` : ""}</strong><span className="muted small">{dateTime(item.created_at)}</span></div><div className="muted small">By {item.profile?.[0]?.full_name ?? "Team member"}</div>{item.note && <p style={{margin:"7px 0 0"}}>{item.note}</p>}</div></div>) : <div className="empty-state">No interactions logged yet.</div>}</div>
      </section>
    </div>
  </div>;
}
