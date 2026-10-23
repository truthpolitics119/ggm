import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  scheduled_at: z.string().datetime(),
  note: z.string().trim().max(2000).optional().default(""),
});
const updateSchema = z.object({
  visit_id: z.string().uuid(),
  status: z.enum(["completed", "cancelled"]),
});

async function getActiveUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: profile, error } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (error) return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!profile?.is_active) return { response: NextResponse.json({ error: "An active account is required." }, { status: 403 }) };
  return { supabase, user };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid visit plan." }, { status: 400 });
  if (new Date(parsed.data.scheduled_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Choose a future date and time for the visit." }, { status: 400 });
  }
  const auth = await getActiveUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const { error } = await auth.supabase.from("retailer_visits").insert({
    retailer_id: id,
    created_by: auth.user.id,
    scheduled_at: parsed.data.scheduled_at,
    note: parsed.data.note || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid visit update." }, { status: 400 });
  const auth = await getActiveUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const { error } = await auth.supabase.rpc("update_retailer_visit_status", {
    p_visit_id: parsed.data.visit_id,
    p_retailer_id: id,
    p_status: parsed.data.status,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
