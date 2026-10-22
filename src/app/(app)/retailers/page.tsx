import { RetailerList } from "@/components/retailer-list";
import { getActiveUser } from "@/lib/auth";
import { getEffectiveStatus, type Retailer } from "@/lib/types";

export default async function RetailersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase } = await getActiveUser();
  const [{ data, error }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from("retailers").select("id,customer_id,name,username,street,house_number,postal_code,city,mobile,balance,latitude,longitude,status_override,status_changed_by,status_changed_at,assigned_to,created_at,updated_at").order("name"),
    supabase.from("profiles").select("id,full_name").eq("is_active", true).order("full_name"),
  ]);
  if (error || profileError) throw new Error(error?.message ?? profileError?.message);
  const retailers = ((data ?? []) as Retailer[]).map((r) => ({ ...r, effective_status: getEffectiveStatus(r) }));
  return <RetailerList retailers={retailers} profiles={profiles ?? []} initialStatus={status === "active" || status === "inactive" ? status : "all"}/>;
}
