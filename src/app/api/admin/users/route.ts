import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.is_active) return { response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  return { admin: createAdminClient() };
}

export async function GET() {
  const access = await authorize();
  if ("response" in access) return access.response;
  const { data, error } = await access.admin.from("profiles").select("id,full_name,role,is_active,created_at").order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data: batch, error: authError } = await access.admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
    batch.users.forEach((authUser) => emails.set(authUser.id, authUser.email ?? ""));
    if (batch.users.length < 1000) break;
  }
  return NextResponse.json({ users: data.map((profile) => ({ ...profile, email: emails.get(profile.id) ?? "" })) });
}

const createSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  role: z.enum(["admin", "user"]),
});

export async function POST(request: Request) {
  const access = await authorize();
  if ("response" in access) return access.response;
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid user details." }, { status: 400 });
  const { data, error } = await access.admin.auth.admin.createUser({
    email: parsed.data.email, password: parsed.data.password, email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "User creation failed." }, { status: 400 });
  const { error: profileError } = await access.admin.from("profiles").update({
    full_name: parsed.data.full_name, role: parsed.data.role,
  }).eq("id", data.user.id);
  if (profileError) {
    await access.admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
