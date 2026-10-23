export type Role = "admin" | "user";
export type RetailerStatus = "active" | "inactive";
export type InteractionType = "visit" | "call" | "whatsapp" | "email" | "transaction" | "other" | "status";
export type RetailerVisitStatus = "planned" | "completed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface Retailer {
  id: string;
  customer_id: number;
  name: string;
  username: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  mobile: string | null;
  balance: number;
  latitude: number | null;
  longitude: number | null;
  status_override: RetailerStatus | null;
  status_changed_by?: string | null;
  status_changed_at?: string | null;
  visited_at?: string | null;
  visited_by?: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  effective_status?: RetailerStatus;
}

export interface RetailerInteraction {
  id: string;
  retailer_id: string;
  user_id: string;
  type: InteractionType;
  note: string | null;
  status_before: RetailerStatus | null;
  status_after: RetailerStatus | null;
  created_at: string;
  profile?: Pick<Profile, "full_name"> | null;
}

export interface RetailerVisit {
  id: string;
  retailer_id: string;
  created_by: string;
  scheduled_at: string;
  note: string | null;
  status: RetailerVisitStatus;
  completed_at: string | null;
  created_at: string;
}

export const getEffectiveStatus = (r: Pick<Retailer, "balance" | "status_override">): RetailerStatus =>
  r.status_override ?? (Number(r.balance) > 0 ? "active" : "inactive");
