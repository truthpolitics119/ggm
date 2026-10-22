import { MapView } from "@/components/map-view";
import { getActiveUser } from "@/lib/auth";
import { getEffectiveStatus, type Retailer } from "@/lib/types";
import Image from "next/image";
import { currency } from "@/lib/format";

export default async function MapPage() {
  const { supabase } = await getActiveUser();
  const { data, error } = await supabase.from("retailers").select(
    "id,customer_id,name,username,street,house_number,postal_code,city,mobile,balance,latitude,longitude,status_override,assigned_to,created_at,updated_at",
  ).order("name");
  if (error) throw new Error(error.message);
  const allRetailers = (data ?? []) as Retailer[];
  const retailers = allRetailers.filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({ ...r, effective_status: getEffectiveStatus(r) }));
  const active = allRetailers.filter((r) => getEffectiveStatus(r) === "active").length;
  const totalBalance = allRetailers.reduce((sum, r) => sum + Number(r.balance), 0);
  return <div className="map-page">
    <header className="map-header"><Image src="/LOGO.png" alt="GGM Digital — Gaming, Gift, Mobile" width={150} height={72} priority/><div><h1>GGM Retailer Map</h1><span>RETAIL NETWORK · ITALY</span></div><time>{new Date().toLocaleDateString("en-GB")}</time></header>
    <div className="map-kpis"><div><span>Total retailers</span><strong>{allRetailers.length}</strong></div><div className="g"><span>Active</span><strong>{active}</strong></div><div className="r"><span>Inactive</span><strong>{allRetailers.length-active}</strong></div><div className="au"><span>Active rate</span><strong>{allRetailers.length?`${(active/allRetailers.length*100).toFixed(1)}%`:"0%"}</strong></div><div className="au"><span>Total balance</span><strong>{currency(totalBalance)}</strong></div></div>
    <MapView retailers={retailers}/>
  </div>;
}
