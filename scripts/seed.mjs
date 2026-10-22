import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");

function rowsFromCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const rows = rowsFromCsv(await readFile(process.argv[2] ?? "DATA.csv", "utf8"));
const headers = rows.shift().map((v) => v.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
const column = (...names) => headers.findIndex((h) => names.includes(h));
const cols = {
  customer_id: column("customerid"), name: column("customername", "name"), username: column("username"),
  street: column("streetname", "street"), house_number: column("housenumber"), postal_code: column("postalcode"),
  city: column("city"), mobile: column("mobile"), balance: column("balance"), latitude: column("latitude"), longitude: column("longitude"),
};
const records = rows.filter((r) => r.some((v) => v.trim())).map((r) => ({
  customer_id: Number(r[cols.customer_id]), name: r[cols.name].trim(), username: r[cols.username] || null,
  street: r[cols.street] || null, house_number: r[cols.house_number] || null, postal_code: r[cols.postal_code] || null,
  city: r[cols.city] || null, mobile: r[cols.mobile] || null,
  balance: Number(r[cols.balance]), latitude: r[cols.latitude] ? Number(r[cols.latitude]) : null,
  longitude: r[cols.longitude] ? Number(r[cols.longitude]) : null, updated_at: new Date().toISOString(),
}));
const client = createClient(url, key, { auth: { persistSession: false } });
for (let i = 0; i < records.length; i += 100) {
  const { error } = await client.from("retailers").upsert(records.slice(i, i + 100), { onConflict: "customer_id" });
  if (error) throw new Error(`Seed failed at row ${i + 1}: ${error.message}`);
}
console.log(`Seeded ${records.length} retailers; mobile values were retained as text.`);
