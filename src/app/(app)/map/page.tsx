import { MapView } from "@/components/map-view";
import { getActiveUser } from "@/lib/auth";
import { getEffectiveStatus, type Retailer } from "@/lib/types";

export default async function MapPage() {
  const { supabase } = await getActiveUser();
  const { data, error } = await supabase.from("retailers").select(
    "id,customer_id,name,username,street,house_number,postal_code,city,mobile,balance,latitude,longitude,status_override,assigned_to,created_at,updated_at",
  ).order("name");
  if (error) throw new Error(error.message);
  const allRetailers = (data ?? []) as Retailer[];
  const retailers = allRetailers.filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({ ...r, effective_status: getEffectiveStatus(r) }));
  return <div>
    <div className="page-heading"><div><h1>Retailer map</h1><p>Explore {retailers.length} mapped retailers and open their profiles.</p></div></div>
    <section className="card map-card"><MapView retailers={retailers}/></section>
  </div>;
}
