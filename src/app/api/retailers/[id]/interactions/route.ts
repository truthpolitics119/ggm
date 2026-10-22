import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  type: z.enum(["visit", "call", "whatsapp", "email", "transaction", "other"]),
  note: z.string().trim().max(2000).optional().default(""),
  mark_visited: z.boolean().optional().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid interaction." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) return NextResponse.json({ error: "An active account is required." }, { status: 403 });
  const { error } = await supabase.rpc("log_retailer_interaction", {
    p_retailer_id: id, p_type: parsed.data.type, p_note: parsed.data.note || null,
    p_mark_visited: parsed.data.mark_visited,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
