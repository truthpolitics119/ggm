"use client";

import { useState } from "react";
import { FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { ToastMessage } from "@/components/toast-message";

type Result = { total: number; inserted: number; updated: number };

export function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setResult(null); setDetails([]);
    if (!file) { setError("Choose a CSV file to continue."); return; }
    setLoading(true);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/admin/import", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) { setDetails(data.details ?? []); throw new Error(data.error ?? "Import failed."); }
      setResult(data); setFile(null); (document.getElementById("csv-file") as HTMLInputElement | null)?.form?.reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); }
    finally { setLoading(false); }
  }
  return <div>
    <div className="page-heading"><div><h1>Import retailers</h1><p>Update retailer details and balances from a CSV file.</p></div></div>
    {result && <ToastMessage message={`Import complete: ${result.inserted} inserted, ${result.updated} updated.`}/>}
    <div className="grid dashboard-grid split-layout">
      <section className="card card-pad"><div className="row" style={{marginBottom:16}}><span className="kpi-icon"><FileSpreadsheet size={19}/></span><div><h2 style={{fontSize:17,margin:"0 0 3px"}}>Upload CSV</h2><span className="muted small">Upserted by customer ID</span></div></div>
        <form onSubmit={submit} className="grid" style={{gap:15}}>
          <label className="field" htmlFor="csv-file"><span>CSV file</span><input id="csv-file" className="input" type="file" accept=".csv,text/csv" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} required/><span className="muted small">Maximum 10 MB. Required columns: CUSTOMER ID and BALANCE. Include CUSTOMER NAME when adding new retailers; omitted columns on existing retailers are preserved.</span></label>
          {file && <div className="row small"><FileSpreadsheet size={15}/>{file.name} · {(file.size/1024).toFixed(1)} KB</div>}
          {error && <div role="alert" className="error-box">{error}{details.length > 0 && <ul style={{marginBottom:0,paddingLeft:20}}>{details.map((d)=><li key={d}>{d}</li>)}</ul>}</div>}
          {result && <div role="status" className="success-box"><strong>Import complete</strong><br/>{result.total} processed · {result.inserted} new · {result.updated} updated. Manual status overrides and interaction history were kept.</div>}
          <button className="btn" disabled={loading || !file}>{loading ? <LoaderCircle size={16} className="animate-spin"/> : <Upload size={16}/>}Import retailer data</button>
        </form>
      </section>
      <section className="card card-pad"><h2 style={{fontSize:17,margin:"0 0 12px"}}>Import behavior</h2><ul className="muted small" style={{paddingLeft:20,lineHeight:1.9,margin:0}}>
        <li>Customer ID is the unique matching key.</li><li>Existing status overrides and status history are not changed.</li><li>Balance values update from the CSV.</li><li>Mobile numbers are stored as text without numeric conversion.</li><li>All rows are validated before any data is written.</li><li>Duplicate IDs and invalid rows reject the import.</li>
      </ul></section>
    </div>
  </div>;
}
