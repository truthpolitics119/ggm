"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type ProfileOption = { id: string; full_name: string };

export function AssignmentManager({ retailerId, assignedTo, profiles, canManage }: {
  retailerId: string;
  assignedTo: string | null;
  profiles: ProfileOption[];
  canManage: boolean;
}) {
  const [value, setValue] = useState(assignedTo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const assignedName = profiles.find((profile) => profile.id === assignedTo)?.full_name ?? "Unassigned";

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/retailers/${retailerId}/assignment`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assigned_to: value || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update retailer assignment.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update retailer assignment.");
      setValue(assignedTo ?? "");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return <div>{assignedName}</div>;
  return <div className="assignment-manager">
    <div className="row">
      <select className="select" aria-label="Assign retailer to team member" value={value} disabled={busy} onChange={(event) => setValue(event.target.value)}>
        <option value="">Unassigned</option>
        {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}
      </select>
      {value !== (assignedTo ?? "") && <button className="btn secondary assignment-save" disabled={busy} onClick={save}>{busy ? <LoaderCircle size={15} className="animate-spin"/> : "Save"}</button>}
    </div>
    {error && <div role="alert" className="small error-text">{error}</div>}
  </div>;
}
