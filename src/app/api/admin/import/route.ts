import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { csvToRows, normalizeHeader } from "@/lib/format";

const aliases: Record<string, string> = {
  customerid: "customer_id", customername: "name", name: "name", username: "username",
  streetname: "street", street: "street", housenumber: "house_number", postalcode: "postal_code",
  city: "city", mobile: "mobile", balance: "balance", latitude: "latitude", longitude: "longitude",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: caller } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (caller?.role !== "admin" || !caller.is_active) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Select a CSV file." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "CSV must be smaller than 10 MB." }, { status: 413 });
  const rows = csvToRows(await file.text());
  if (rows.length < 2) return NextResponse.json({ error: "CSV has no retailer rows." }, { status: 400 });
  const header = rows[0].map((h) => aliases[normalizeHeader(h)]);
  if (rows.length > 10_001) return NextResponse.json({ error: "CSV cannot contain more than 10,000 retailer rows." }, { status: 413 });
  const required = ["customer_id", "balance"];
  for (const field of required) if (!header.includes(field)) return NextResponse.json({ error: `Missing required column: ${field}.` }, { status: 400 });

  const raw: { customerId: number; value: Record<string, string>; line: number }[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const [index, row] of rows.slice(1).entries()) {
    const value: Record<string, string> = {};
    header.forEach((key, column) => { if (key) value[key] = row[column] ?? ""; });
    const customerId = Number(value.customer_id);
    const balance = Number(value.balance);
    if (!/^\d+$/.test(value.customer_id?.trim() ?? "") || !Number.isSafeInteger(customerId) ||
      !value.balance?.trim() || !Number.isFinite(balance) || (header.includes("name") && !value.name?.trim())) {
      errors.push(`Row ${index + 2}: invalid customer ID, name, or balance.`);
      continue;
    }
    if (seen.has(String(customerId))) { errors.push(`Row ${index + 2}: duplicate customer ID ${customerId}.`); continue; }
    seen.add(String(customerId));
    raw.push({ customerId, value, line: index + 2 });
  }
  if (errors.length) return NextResponse.json({ error: "Import was not applied because some rows are invalid.", details: errors.slice(0, 20) }, { status: 400 });

  const admin = createAdminClient();
  const existing = new Map<number, Record<string, unknown>>();
  for (let start = 0; start < raw.length; start += 500) {
    const ids = raw.slice(start, start + 500).map((row) => row.customerId);
    const { data, error: lookupError } = await admin.from("retailers")
      .select("customer_id,name,username,street,house_number,postal_code,city,mobile,latitude,longitude")
      .in("customer_id", ids);
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
    (data ?? []).forEach((item) => existing.set(item.customer_id, item));
  }
  const parsed: Record<string, unknown>[] = [];
  for (const item of raw) {
    const previous = existing.get(item.customerId);
    const valueFor = (field: string) => header.includes(field) ? (item.value[field] || null) : previous?.[field] ?? null;
    const name = header.includes("name") ? item.value.name.trim() : previous?.name;
    if (!name) {
      errors.push(`Row ${item.line}: CUSTOMER NAME is required for a new retailer.`);
      continue;
    }
    const latitude = valueFor("latitude") === null ? null : Number(valueFor("latitude"));
    const longitude = valueFor("longitude") === null ? null : Number(valueFor("longitude"));
    if ((latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) ||
      ((latitude === null) !== (longitude === null))) {
      errors.push(`Row ${item.line}: invalid or incomplete coordinates.`);
      continue;
    }
    parsed.push({
      customer_id: item.customerId, name, username: valueFor("username"),
      street: valueFor("street"), house_number: valueFor("house_number"), postal_code: valueFor("postal_code"),
      city: valueFor("city"), mobile: valueFor("mobile"), balance: Number(item.value.balance),
      latitude, longitude,
    });
  }
  if (errors.length) return NextResponse.json({ error: "Import was not applied because some rows are invalid.", details: errors.slice(0, 20) }, { status: 400 });

  const { data: summary, error } = await admin.rpc("import_retailers", { p_rows: parsed });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, total: parsed.length, inserted: summary?.[0]?.inserted ?? 0, updated: summary?.[0]?.updated ?? 0 });
}
