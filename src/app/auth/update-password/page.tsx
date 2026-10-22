"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [error,setError]=useState(""); const [done,setDone]=useState(false); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");setBusy(true);
    const form=new FormData(e.currentTarget);const password=String(form.get("password")??"");const confirm=String(form.get("confirm")??"");
    if(password.length<12||password!==confirm){setError(password.length<12?"Use at least 12 characters.":"Passwords do not match.");setBusy(false);return;}
    const {error:changeError}=await createClient().auth.updateUser({password});
    if(changeError){setError(changeError.message);setBusy(false);return;}
    setDone(true);setBusy(false);router.refresh();
  }
  return <main className="login-panel"><form className="login-form" onSubmit={submit}><h1>Set a new password</h1>{done?<div className="success-box">Password updated successfully. You can now sign in with your new password.</div>:<>
    <p>Choose a secure password with at least 12 characters.</p>{error&&<div className="error-box" role="alert">{error}</div>}
    <label className="field">New password<input name="password" type="password" minLength={12} required className="input" autoComplete="new-password"/></label>
    <label className="field">Confirm password<input name="confirm" type="password" minLength={12} required className="input" autoComplete="new-password"/></label>
    <button className="btn" disabled={busy}>{busy?"Updating…":"Update password"}</button></>}</form></main>;
}
