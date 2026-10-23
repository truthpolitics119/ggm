"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, KeyRound, LoaderCircle, UserPlus, UserRound, UserX } from "lucide-react";
import { ToastMessage } from "@/components/toast-message";

type ManagedUser = { id: string; full_name: string; email: string; role: "admin" | "user"; is_active: boolean; created_at: string };

export function UsersManager() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUser, setResetUser] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/users");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load users.");
      setUsers(result.users);
      setNames(Object.fromEntries(result.users.map((u: ManagedUser) => [u.id, u.full_name])));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load users."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function update(id: string, body: object, success: string) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "User update failed.");
      setMessage(success); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "User update failed."); }
    finally { setSaving(false); }
  }
  async function create(form: FormData) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create user.");
      setMessage("User created successfully."); (document.getElementById("create-user-form") as HTMLFormElement)?.reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create user."); }
    finally { setSaving(false); }
  }
  async function deactivate(id: string) {
    if (!window.confirm("Deactivate this account? The user will be signed out on their next request.")) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to deactivate user.");
      setMessage("Account deactivated."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to deactivate user."); }
    finally { setSaving(false); }
  }
  return <div>
    <div className="page-heading"><div><h1>Users</h1><p>Create accounts and manage access to GGM Retailer Manager.</p></div></div>
    <ToastMessage message={message}/>
    {error && <div role="alert" className="error-box" style={{marginBottom:14}}>{error}</div>}
    <div className="grid dashboard-grid split-layout">
      <section className="card card-pad"><div className="row-between"><div><h2 style={{fontSize:17,margin:"0 0 4px"}}>Team members</h2><span className="muted small">{users.length} accounts</span></div><UserRound color="#d4af37"/></div>
        {busy ? <div className="grid" style={{marginTop:18}}>{[1,2,3].map((i)=><div className="skeleton" key={i}/>)}</div> : users.length ? <div className="table-wrap" style={{marginTop:12}}><table className="data-table"><thead><tr><th>Name / email</th><th>Role</th><th>Account</th><th>Actions</th></tr></thead><tbody>{users.map((user)=><tr key={user.id}>
          <td><div className="row"><input className="input" aria-label={`Name for ${user.full_name}`} value={names[user.id] ?? user.full_name} disabled={saving || !user.is_active} onChange={(e)=>setNames({...names,[user.id]:e.target.value})}/><button className="icon-btn" title="Save name" aria-label={`Save name for ${user.full_name}`} disabled={saving || !user.is_active || names[user.id] === user.full_name} onClick={()=>void update(user.id,{full_name:names[user.id]},"Name updated.")}><Check size={16}/></button></div><span className="muted small">{user.email}</span></td><td><select className="select" aria-label={`Role for ${user.full_name}`} value={user.role} disabled={saving || !user.is_active} onChange={(e)=>void update(user.id,{role:e.target.value},"Role updated.")}><option value="user">User</option><option value="admin">Admin</option></select></td>
          <td><span className={`status-badge ${user.is_active ? "active" : "inactive"}`}>{user.is_active ? "Active" : "Inactive"}</span></td><td><div className="row"><button className="icon-btn" title="Reset password" aria-label={`Reset password for ${user.full_name}`} disabled={saving || !user.is_active} onClick={()=>{setResetUser(user.id);setResetPassword("");}}><KeyRound size={16}/></button>{user.is_active && <button className="icon-btn" title="Deactivate user" aria-label={`Deactivate ${user.full_name}`} disabled={saving} onClick={()=>void deactivate(user.id)}><UserX size={16}/></button>}</div></td>
        </tr>)}</tbody></table></div> : <div className="empty-state">No users found.</div>}
      </section>
      <section className="card card-pad"><h2 style={{fontSize:17,margin:"0 0 4px"}}>Create user</h2><p className="muted small" style={{marginTop:0}}>A sign-in account will be created and activated immediately.</p>
        <form id="create-user-form" action={create} className="grid" style={{gap:13,marginTop:17}}>
          <div className="field"><label htmlFor="new-name">Full name</label><input id="new-name" className="input" name="full_name" required minLength={2} maxLength={120}/></div>
          <div className="field"><label htmlFor="new-email">Email</label><input id="new-email" className="input" name="email" type="email" required/></div>
          <div className="field"><label htmlFor="new-password">Temporary password</label><input id="new-password" className="input" name="password" type="password" minLength={12} required autoComplete="new-password"/><span className="muted small">At least 12 characters.</span></div>
          <div className="field"><label htmlFor="new-role">Role</label><select id="new-role" className="select" name="role"><option value="user">User</option><option value="admin">Admin</option></select></div>
          <button className="btn" disabled={saving}><UserPlus size={16}/>{saving ? "Saving…" : "Create account"}</button>
        </form>
      </section>
    </div>
    {resetUser && <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="modal-backdrop"><section className="card card-pad modal-card"><h2 id="reset-title" style={{marginTop:0}}>Reset user password</h2><form className="grid" onSubmit={(e)=>{e.preventDefault();void update(resetUser,{password:resetPassword},"Password reset.");setResetUser("");}}><label className="field">New password<input className="input" type="password" minLength={12} required value={resetPassword} onChange={(e)=>setResetPassword(e.target.value)}/></label><span className="muted small">Use at least 12 characters.</span><div className="row"><button className="btn" disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin"/> : <KeyRound size={16}/>}Reset password</button><button type="button" className="btn secondary" onClick={()=>setResetUser("")}>Cancel</button></div></form></section></div>}
  </div>;
}
