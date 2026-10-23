"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { currency } from "@/lib/format";

export function RetailerBalance({ retailerId, balance }: { retailerId: string; balance: number }) {
  const [value, setValue] = useState(String(balance));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/retailers/${retailerId}/balance`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ balance: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update the retailer balance.");
      setNotice("Balance updated and retailer marked active.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the retailer balance.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="card card-pad">
    <div className="row-between" style={{marginBottom:14}}>
      <div><h2 style={{margin:"0 0 4px",fontSize:17}}>Update balance</h2><span className="muted small">Current balance: {currency(balance)}</span></div>
    </div>
    <form onSubmit={submit} className="grid" style={{gap:12}}>
      <div className="field"><label htmlFor="retailer-balance">New balance (€)</label><input id="retailer-balance" className="input" type="number" inputMode="decimal" step="0.0001" required value={value} onChange={(event) => setValue(event.target.value)}/></div>
      <p className="muted small" style={{margin:0}}>Saving a balance marks this retailer active.</p>
      {error && <div role="alert" className="error-box">{error}</div>}
      {notice && <div role="status" className="success-box">{notice}</div>}
      <button className="btn" type="submit" disabled={loading || !value}>{loading ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>}Save balance</button>
    </form>
  </section>;
}
