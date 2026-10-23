import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ assigned_to: z.string().uuid().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid team member." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("profiles").select("is_active,role").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile?.is_active) return NextResponse.json({ error: "An active account is required." }, { status: 403 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Administrator access is required to assign retailers." }, { status: 403 });
  if (parsed.data.assigned_to) {
    const { data: assignee, error: assigneeError } = await supabase.from("profiles").select("id").eq("id", parsed.data.assigned_to).eq("is_active", true).maybeSingle();
    if (assigneeError) return NextResponse.json({ error: assigneeError.message }, { status: 500 });
    if (!assignee) return NextResponse.json({ error: "Choose an active team member." }, { status: 400 });
  }
  const { id } = await params;
  const { error } = await supabase.from("retailers").update({ assigned_to: parsed.data.assigned_to }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
