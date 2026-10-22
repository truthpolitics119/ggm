import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getActiveUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase
    .from("profiles").select("id,full_name,role,is_active").eq("id", user.id).single();
  if (error || !profile?.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account");
  }
  return { supabase, user, profile: profile as Profile };
}

export async function requireAdmin() {
  const context = await getActiveUser();
  if (context.profile.role !== "admin") redirect("/dashboard");
  return context;
}
