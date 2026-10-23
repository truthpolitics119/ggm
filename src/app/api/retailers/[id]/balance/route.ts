import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  balance: z.string().trim().regex(/^-?\d+(?:\.\d{1,4})?$/, "Enter a balance with up to 4 decimal places.")
    .refine((value) => value.split(".")[0].replace(/^-/, "").replace(/^0+/, "").length <= 14, "Balance is outside the supported range.")
    .refine((value) => Number.isFinite(Number(value)), "Enter a valid balance."),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide a valid balance." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Provide a valid balance." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) return NextResponse.json({ error: "An active account is required." }, { status: 403 });
  const { error } = await supabase.rpc("update_retailer_balance", {
    p_retailer_id: id,
    p_balance: parsed.data.balance,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
