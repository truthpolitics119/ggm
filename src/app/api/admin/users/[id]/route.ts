import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["admin", "user"]).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(12).max(128).optional(),
}).refine((v) => Object.keys(v).length > 0);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: caller } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (caller?.role !== "admin" || !caller.is_active) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (id === user.id) return NextResponse.json({ error: "You cannot change your own account here." }, { status: 400 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
  const admin = createAdminClient();
  const { password, ...profileFields } = parsed.data;
  if (Object.keys(profileFields).length) {
    const { error } = await admin.from("profiles").update(profileFields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (password) {
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: caller } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (caller?.role !== "admin" || !caller.is_active) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (id === user.id) return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  const { error } = await createAdminClient().from("profiles").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
